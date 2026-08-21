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


def build_system_prompt(db: Session) -> str:
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

        # Module summary
        module_summaries = []
        for mod in repo.modules[:15]:
            dep_count = len(mod.dependencies) if mod.dependencies else 0
            file_count = len(mod.files) if mod.files else 0
            core = mod.core_file.split('/')[-1] if mod.core_file else "N/A"
            module_summaries.append(f"  - {mod.name}: {file_count} files, core={core}, {dep_count} dependencies")
        modules_text = "\n".join(module_summaries)

        # Ownership
        owner_stats: dict = {}
        for f in repo.files:
            if f.primary_owner:
                owner_stats[f.primary_owner] = owner_stats.get(f.primary_owner, 0) + 1
        top_owners = sorted(owner_stats.items(), key=lambda x: -x[1])[:5]
        owners_text = ", ".join(f"{name} ({count} files)" for name, count in top_owners)

        prompt = f"""You are CodePalantir AI, an intelligent assistant embedded inside the CodePalantir repository analysis tool.

You have deep knowledge of the analyzed repository. Use this context to give precise, accurate answers.

=== REPOSITORY CONTEXT ===
Repository: {repo_name}
Total Files: {total_files}
Total Modules: {total_modules}
Languages: {langs}
Top Contributors (by files owned): {owners_text}

=== MODULE ARCHITECTURE ===
{modules_text}

=== YOUR CAPABILITIES ===
- Explain module responsibilities and architecture decisions
- Identify which files/modules handle specific features
- Suggest who to talk to for different parts of the codebase
- Give onboarding guidance for new developers
- Explain code dependencies and data flow
- Identify potential areas of technical debt or risk

=== RULES ===
- Always base answers on the repository data above
- If you don't know something specific, say so honestly
- Keep answers concise but complete
- Use markdown formatting for code, lists and emphasis
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

    system_prompt = build_system_prompt(db)

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
