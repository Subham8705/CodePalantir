import os
import json
import requests
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.database import get_db
from database import models

router = APIRouter()

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5-coder:1.5b"


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = DEFAULT_MODEL


def build_system_prompt(db: Session, user_query: str = "") -> str:
    """Build a rich system prompt injecting real repository context."""
    try:
        repo = db.query(models.RepositoryModel).order_by(models.RepositoryModel.id.desc()).first()
        if not repo:
            return "You are a helpful code assistant. No repository has been analyzed yet."

        repo_name = repo.name.split('/')[-1] if '/' in repo.name else repo.name
        total_files = len(repo.files)
        total_modules = len(repo.modules)

        # Language breakdown
        ext_counts: dict = {}
        for f in repo.files:
            ext = os.path.splitext(f.relative_path)[1].lower()
            if ext:
                ext_counts[ext] = ext_counts.get(ext, 0) + 1
        lang_names = {".py": "Python", ".ts": "TypeScript", ".tsx": "TypeScript/React",
                      ".js": "JavaScript", ".json": "JSON", ".md": "Markdown"}
        langs = ", ".join(
            f"{lang_names.get(e, e)} ({c} files)"
            for e, c in sorted(ext_counts.items(), key=lambda x: -x[1])[:5]
        )

        # Module summary WITH actual file lists
        module_summaries = []
        for mod in repo.modules[:15]:
            dep_count = len(mod.dependencies) if mod.dependencies else 0
            file_list = ", ".join((f.split('/')[-1] for f in (mod.files or [])[:8]))
            core = mod.core_file.split('/')[-1] if mod.core_file else "N/A"
            module_summaries.append(
                f"  - {mod.name} (core={core}, {dep_count} deps)\n"
                f"    Files: {file_list or 'N/A'}"
            )
        modules_text = "\n".join(module_summaries)

        # Complete flat file list (so AI knows every file that exists)
        all_files = sorted([f.relative_path.replace('\\', '/') for f in repo.files])
        file_list_text = "\n".join(f"  {fp}" for fp in all_files[:80])

        # Ownership
        owner_stats: dict = {}
        for f in repo.files:
            if f.primary_owner:
                owner_stats[f.primary_owner] = owner_stats.get(f.primary_owner, 0) + 1
        top_owners = sorted(owner_stats.items(), key=lambda x: -x[1])[:5]
        owners_text = ", ".join(f"{name} ({count} files)" for name, count in top_owners)

        # Dynamic Content Injection: if user mentions a file in query
        dynamic_context = ""
        if user_query:
            mentioned_files = []
            for f in repo.files:
                filename = f.relative_path.split('/')[-1]
                # Check if either the full path or just the filename is in the query
                if f.relative_path in user_query or filename in user_query:
                    mentioned_files.append(f)
            
            # Limit to 3 files to avoid context window explosion
            for f in mentioned_files[:3]:
                dynamic_context += f"\n=== CONTENT OF {f.relative_path} ===\n"
                
                # Read actual file from cloned_repos
                file_path = os.path.join("cloned_repos", repo.name, f.relative_path)
                try:
                    with open(file_path, "r", encoding="utf-8") as file_handle:
                        content = file_handle.read()
                        # Truncate if it's absurdly large
                        if len(content) > 10000:
                            content = content[:10000] + "\n... (truncated)"
                        dynamic_context += content
                except Exception as e:
                    dynamic_context += f"(Could not read file: {e})"
                    
                dynamic_context += "\n=========================================\n"

        prompt = f"""You are CodePalantir AI, an intelligent assistant embedded inside the CodePalantir repository analysis tool.

You have been given the EXACT structure of the analyzed repository. Use ONLY this data — do NOT guess or invent file contents, module names, or behaviors not listed here.

=== REPOSITORY CONTEXT ===
Repository: {repo_name}
Total Files: {total_files}
Total Modules: {total_modules}
Languages: {langs}
Top Contributors (by files owned): {owners_text}

=== MODULE ARCHITECTURE (with actual files) ===
{modules_text}

=== ALL FILES IN REPOSITORY ===
{file_list_text}

{dynamic_context}

=== IMPORTANT RULES ===
- ONLY refer to files and modules listed above. Never invent file names.
- If asked about a specific file's content that isn't in this context, say: "I can see this file exists but I don't have its content loaded. Based on its name and module context, here's what I can infer..."
- Be honest when you are inferring vs when you know for certain.
- Use markdown formatting (bold, code blocks, lists) for clarity.

=== YOUR CAPABILITIES ===
- Explain module responsibilities based on their actual files
- Identify which files/modules handle specific features
- Suggest who to talk to for different parts of the codebase
- Give onboarding guidance for new developers
- Explain code dependencies and data flow
- When mentioning file paths or module names, use backtick formatting
- Do NOT make up file names or module names that aren't in the context
"""
        return prompt

    except Exception as e:
        return f"You are a helpful code assistant. (Context loading error: {e})"


@router.get("/models")
def get_available_models():
    """List available Ollama models."""
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if resp.ok:
            data = resp.json()
            models_list = [
                {"name": m["name"], "size": m.get("size", 0), "family": m.get("details", {}).get("family", "unknown")}
                for m in data.get("models", [])
            ]
            return {"models": models_list, "default": DEFAULT_MODEL}
        return {"models": [], "default": DEFAULT_MODEL, "error": "Could not reach Ollama"}
    except Exception as e:
        return {"models": [], "default": DEFAULT_MODEL, "error": str(e)}


@router.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Stream a chat response from Ollama with full repository context."""
    # Check Ollama is running
    try:
        requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Please start it with: ollama serve"
        )

    # Get the last user message to check for file mentions
    last_user_msg = ""
    if request.messages and request.messages[-1].role == "user":
        last_user_msg = request.messages[-1].content

    system_prompt = build_system_prompt(db, user_query=last_user_msg)

    # Build the messages array for Ollama
    ollama_messages = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        ollama_messages.append({"role": msg.role, "content": msg.content})

    def stream_response():
        try:
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": request.model,
                    "messages": ollama_messages,
                    "stream": True,
                    "options": {
                        "temperature": 0.7,
                        "num_predict": 1024,
                    }
                },
                stream=True,
                timeout=120
            )

            if not resp.ok:
                error_msg = {"error": f"Ollama error: {resp.status_code} - {resp.text}"}
                yield f"data: {json.dumps(error_msg)}\n\n"
                return

            for line in resp.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        message_chunk = chunk.get("message", {}).get("content", "")
                        done = chunk.get("done", False)
                        yield f"data: {json.dumps({'content': message_chunk, 'done': done})}\n\n"
                        if done:
                            break
                    except json.JSONDecodeError:
                        continue

        except requests.exceptions.Timeout:
            yield f"data: {json.dumps({'error': 'Request timed out. The model may be overloaded.'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
