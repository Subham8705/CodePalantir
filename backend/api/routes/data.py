import os
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
import math
import random

from database.database import get_db
from database import models
from database import schemas

router = APIRouter()

def get_latest_repo(db: Session) -> models.RepositoryModel:
    repo = db.query(models.RepositoryModel).order_by(models.RepositoryModel.id.desc()).first()
    if not repo:
        raise HTTPException(status_code=404, detail="No analyzed repository found")
    return repo


@router.get("/repo/overview", response_model=schemas.RepositorySchema)
def get_repo_overview(db: Session = Depends(get_db)):
    """Returns overview stats for the most recently analyzed repo."""
    repo = get_latest_repo(db)
    
    # Calculate stats
    total_files = len(repo.files)
    total_funcs = sum(len(f.functions) for f in repo.files if f.functions)
    total_modules = len(repo.modules)
    
    # Extract unique owners
    owners = set()
    for f in repo.files:
        if f.primary_owner:
            owners.add(f.primary_owner)
            
    # Naive language detection based on extensions
    extensions = {}
    for f in repo.files:
        ext = os.path.splitext(f.relative_path)[1].lower()
        if ext:
            extensions[ext] = extensions.get(ext, 0) + 1
            
    names = {".py": "Python", ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".md": "Markdown", ".json": "JSON"}
    colors_by_name = {"Python": "#3776AB", "TypeScript": "#3178C6", "JavaScript": "#F7DF1E"}
    
    lang_counts = {}
    for ext, count in extensions.items():
        name = names.get(ext, ext)
        lang_counts[name] = lang_counts.get(name, 0) + count
        
    langs = []
    for name, count in sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        langs.append({
            "name": name,
            "percentage": round((count / total_files) * 100),
            "color": colors_by_name.get(name, "#888888")
        })
    import subprocess
    recent_activity = []
    repo_path = f"cloned_repos/{repo.name.split('/')[-1] if '/' in repo.name else repo.name}"
    if os.path.exists(repo_path):
        try:
            # Get last 6 commits
            cmd = ['git', '-C', repo_path, 'log', '-n', '6', '--pretty=format:%an|%s|%ar']
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            for line in result.stdout.strip().split('\n'):
                if line:
                    parts = line.split('|', 2)
                    if len(parts) == 3:
                        recent_activity.append({
                            "type": "commit",
                            "message": parts[1],
                            "author": parts[0],
                            "module": "Core", # Mocking module for now
                            "time": parts[2]
                        })
        except Exception:
            pass

    return schemas.RepositorySchema(
        id=str(repo.id),
        name=repo.name.split('/')[-1] if '/' in repo.name else repo.name,
        owner=repo.name.split('/')[0] if '/' in repo.name else "unknown",
        url=repo.url,
        description="Analyzed by CodePalantir",
        branch="main",
        branches=["main"],
        lastAnalyzed=repo.last_analyzed.isoformat() + "Z",
        stats={
            "files": total_files,
            "functions": total_funcs,
            "modules": total_modules,
            "contributors": len(owners)
        },
        languages=langs,
        frameworks=["FastAPI", "React"] if ".py" in extensions and ".tsx" in extensions else [],
        recentActivity=recent_activity
    )


@router.get("/files/content")
def get_file_content(path: str, db: Session = Depends(get_db)):
    """Reads actual file content from the cloned repository on disk."""
    repo = get_latest_repo(db)
    repo_dir = repo.name.split('/')[-1] if '/' in repo.name else repo.name
    full_path = os.path.join("cloned_repos", repo_dir, path)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            return PlainTextResponse(f.read())
    except UnicodeDecodeError:
        return PlainTextResponse("// Binary or unreadable file format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_layer(name: str) -> str:
    name_lower = name.lower()
    if any(x in name_lower for x in ["api", "route", "controller", "handler"]):
        return "API"
    elif any(x in name_lower for x in ["component", "page", "ui", "view", "frontend", "src", "public"]):
        return "Frontend"
    elif any(x in name_lower for x in ["db", "database", "model", "schema", "orm"]):
        return "Database"
    elif any(x in name_lower for x in ["data", "store", "cache", "state", "context"]):
        return "Data"
    return "Service"


def _get_author_id_map(repo) -> Dict[str, str]:
    authors = {}
    for f in repo.files:
        if f.author_lines:
            for author, lines in f.author_lines.items():
                if author not in authors:
                    authors[author] = 0
                authors[author] += lines
    sorted_authors = sorted(authors.items(), key=lambda x: x[1], reverse=True)
    return {name: str(idx) for idx, (name, _) in enumerate(sorted_authors[:10])}

@router.get("/modules", response_model=List[schemas.ModuleSchema])
def get_modules(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    result = []
    author_id_map = _get_author_id_map(repo)
    
    # Calculate dependents (reverse dependencies)
    dependents_map = {mod.id: [] for mod in repo.modules}
    for mod in repo.modules:
        for dep in (mod.dependencies or []):
            if dep in dependents_map and mod.id not in dependents_map[dep]:
                dependents_map[dep].append(mod.id)
                
    for mod in repo.modules:
        # Calculate real ownership percentages
        ownership = {}
        author_lines_dict = getattr(mod, 'author_lines', {}) or {}
        total_lines = sum(author_lines_dict.values())
        
        if total_lines > 0:
            for author, lines in author_lines_dict.items():
                author_id = author_id_map.get(author)
                if author_id is not None:
                    ownership[author_id] = round((lines / total_lines) * 100)
                    
        # Determine primary contributors (top 2 by ownership)
        primary_contributors = []
        if ownership:
            sorted_owners = sorted(ownership.items(), key=lambda x: x[1], reverse=True)
            primary_contributors = [author_id for author_id, pct in sorted_owners[:2]]
        elif mod.primary_owner:
            owner_id = author_id_map.get(mod.primary_owner)
            if owner_id:
                primary_contributors = [owner_id]
                
        # Generate dynamic explanation
        core_name = mod.core_file.split('/')[-1] if mod.core_file else "multiple files"
        deps_count = len(mod.dependencies or [])
        deps_text = f" It relies on {deps_count} other module{'s' if deps_count != 1 else ''} to function." if deps_count > 0 else " It operates independently with no external module dependencies."
        layer = get_layer(mod.name)
        ai_explanation = f"This {layer} layer module encapsulates {mod.name.replace('_', ' ')} logic, centered around `{core_name}`.{deps_text}"
                    
        result.append(schemas.ModuleSchema(
            id=mod.id,
            name=mod.name,
            description=f"Core orchestrator: {mod.core_file}" if mod.core_file else f"{layer} Architecture Module",
            layer=layer,
            fileCount=len(mod.files) if mod.files else 0,
            dependencies=mod.dependencies if mod.dependencies else [],
            dependents=dependents_map.get(mod.id, []),
            primaryContributors=primary_contributors,
            files=[],
            ownership=ownership,
            color="#3178C6",
            aiExplanation=ai_explanation
        ))
    return result


@router.get("/onboarding", response_model=List[schemas.OnboardingStepSchema])
def get_onboarding_path(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    result = []
    
    # Sort by step order
    steps = sorted(repo.onboarding_steps, key=lambda x: x.step_order)
    
    # Build a lookup for module names
    module_lookup = {m.id: m for m in repo.modules}
    
    for i, step in enumerate(steps):
        module = module_lookup.get(step.module_id)
        file_count = len(module.files) if module and module.files else 0
        
        # Calculate estimated time based on file count
        mins = max(5, file_count * 3)
        
        # Generate file-specific tasks
        tasks = []
        if step.core_file:
            core_name = step.core_file.split('/')[-1]
            tasks.append({
                "id": f"{step.id}-1",
                "title": f"Read {core_name}",
                "description": f"This is the core entry point for the {step.module_name} module.",
                "completed": False
            })
        
        # Prerequisite names (previous steps this depends on)
        prerequisites = []
        if module and module.dependencies:
            for dep_id in module.dependencies[:3]:
                dep_mod = module_lookup.get(dep_id)
                if dep_mod:
                    prerequisites.append(dep_mod.name)
        
        # Generate why-next based on what comes after
        if i < len(steps) - 1:
            next_step = steps[i + 1]
            why_next = f"Next up is {next_step.module_name}, which builds on concepts from this module."
        else:
            why_next = "This is the final module in the onboarding path. After this, you'll have a solid understanding of the entire codebase."
            
        # Learning objective
        core_name = step.core_file.split('/')[-1] if step.core_file else step.module_name
        learning_obj = f"Understand how `{core_name}` works and its role in the {step.module_name} module."
        
        # Before you start
        before = []
        if prerequisites:
            before.append(f"Complete the {', '.join(prerequisites)} module(s) first")
        before.append("Read the core file")
        
        # AI explanation based on module position and connectivity
        dep_count = len(module.dependencies) if module and module.dependencies else 0
        if dep_count == 0:
            ai_explanation = f"This is an independent module with {file_count} files. It doesn't depend on other internal modules, making it a great starting point for understanding the codebase."
        elif dep_count <= 2:
            dep_names = [module_lookup.get(d, type('', (), {'name': 'Unknown'})).name for d in module.dependencies[:2]]
            ai_explanation = f"This module integrates with {', '.join(dep_names)}. Understanding those dependencies first will help you see how {step.module_name} fits into the larger architecture."
        else:
            ai_explanation = f"This is a high-connectivity module with {dep_count} dependencies and {file_count} files. It acts as a coordination point in the architecture."

        # Files to read
        files = list(module.files[:5]) if module and module.files else ([step.core_file] if step.core_file else [])
            
        result.append(schemas.OnboardingStepSchema(
            id=str(step.id),
            order=step.step_order,
            moduleId=step.module_id,
            title=f"Understand {step.module_name}",
            description=step.reason,
            estimatedTime=f"{mins} mins",
            estimatedMinutes=mins,
            prerequisites=prerequisites,
            whyNext=why_next,
            files=files,
            learningObjective=learning_obj,
            beforeYouStart=before,
            whyItMatters=step.reason,
            aiExplanation=ai_explanation,
            completed=False
        ))
    return result


@router.get("/contributors", response_model=List[schemas.ContributorSchema])
def get_contributors(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    
    # Aggregate author stats
    authors = {}
    for f in repo.files:
        if f.author_lines:
            for author, lines in f.author_lines.items():
                if author not in authors:
                    authors[author] = {"commits": 0, "lines": 0}
                authors[author]["lines"] += lines
                
    # Aggregate commits (using churn as a proxy)
    for f in repo.files:
        if f.primary_owner and f.primary_owner in authors:
            authors[f.primary_owner]["commits"] += f.churn_count
            
    result = []
    # Sort by lines
    sorted_authors = sorted(authors.items(), key=lambda x: x[1]["lines"], reverse=True)
    
    for idx, (name, stats) in enumerate(sorted_authors[:10]):
        result.append(schemas.ContributorSchema(
            id=str(idx),
            name=name,
            avatar=name[:2].upper() if name else "?",
            role="Contributor",
            commits=stats["commits"],
            filesTouched=1, # Mock
            contributionPct=10, # Mock
            primaryAreas=["Authentication", "API"], # Mock
            recentActivity=[] # Mock empty list
        ))
    return result


@router.get("/architecture/nodes", response_model=List[schemas.ArchitectureNodeSchema])
def get_architecture_nodes(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    nodes = []
    
    file_to_module = {}
    for mod in repo.modules:
        for fpath in mod.files:
            file_to_module[fpath] = mod
            
    for file in repo.files:
        fpath = file.relative_path.replace("\\", "/")
        mod = file_to_module.get(fpath)
        
        nodes.append(schemas.ArchitectureNodeSchema(
            id=fpath,
            label=fpath.split('/')[-1],
            layer=get_layer(mod.name) if mod else "Unknown",
            fileCount=1,
            dependencyCount=len(file.imports or []),
            description=f"File: {fpath}",
            moduleId=mod.id if mod else "unknown"
        ))
    return nodes


@router.get("/architecture/edges", response_model=List[schemas.ArchitectureEdgeSchema])
def get_architecture_edges(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    edges = []
    
    from services.analysis.import_resolver import ImportResolver
    available_files = {f.relative_path.replace("\\", "/") for f in repo.files}
    resolver = ImportResolver("dummy", available_files)
    
    for file in repo.files:
        source_rel_path = file.relative_path.replace("\\", "/")
        ext = source_rel_path.split('.')[-1]
        lang = 'python' if ext == 'py' else 'typescript' if ext in ('ts', 'tsx') else 'javascript'
        
        for imp in (file.imports or []):
            module_name = imp.get("module")
            if module_name:
                target_rel_path = resolver.resolve(module_name, source_rel_path, lang)
                if target_rel_path:
                    # Prevent duplicates just in case
                    edges.append(schemas.ArchitectureEdgeSchema(
                        id=f"e-{source_rel_path}-{target_rel_path}",
                        source=source_rel_path,
                        target=target_rel_path,
                        animated=True
                    ))
                    
    # Deduplicate edges
    unique_edges = {e.id: e for e in edges}.values()
    return list(unique_edges)


@router.get("/files/tree", response_model=schemas.FileNodeSchema)
def get_file_tree(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    
    # Build tree from flat list of paths
    root = {"name": "root", "path": "", "type": "directory", "children": {}}
    
    # Pre-calculate imported_by relationships
    # The naive resolver in ImportResolver already gives us good path matching, but we'll do a simple substring match for raw imports for the UI.
    imported_by_map = {f.relative_path: [] for f in repo.files}
    for f in repo.files:
        for imp in (f.imports or []):
            imp_str = imp.get("module", "") if isinstance(imp, dict) else str(imp)
            if not imp_str:
                continue
            # Very naive match: if import path is part of another file's path
            for other_f in repo.files:
                if f.relative_path != other_f.relative_path:
                    # Strip common prefix/suffix or just check if import string appears in path
                    imp_clean = imp_str.replace('./', '').replace('../', '').split('/')[-1]
                    if not imp_clean:
                        continue
                    
                    # Extract the filename without extension from the other file's path
                    other_f_name = other_f.relative_path.replace('\\', '/').split('/')[-1].split('.')[0]
                    
                    if imp_clean == other_f_name or imp_clean == other_f_name + ".js" or imp_clean == other_f_name + ".ts":
                        if f.relative_path not in imported_by_map[other_f.relative_path]:
                            imported_by_map[other_f.relative_path].append(f.relative_path)
                            
    for f in repo.files:
        parts = f.relative_path.replace("\\", "/").split("/")
        current = root
        
        # Traverse/build directories
        for i, part in enumerate(parts[:-1]):
            if part not in current["children"]:
                current["children"][part] = {
                    "name": part,
                    "path": "/".join(parts[:i+1]),
                    "type": "directory",
                    "children": {}
                }
            current = current["children"][part]
            
        # Add file
        filename = parts[-1]
        ext = os.path.splitext(filename)[1]
        
        current["children"][filename] = {
            "name": filename,
            "path": f.relative_path,
            "type": "file",
            "language": ext[1:] if ext else "text",
            "size": 1024, # Mock size
            "commits": f.churn_count,
            "owner": f.primary_owner,
            "lines": sum(f.author_lines.values()) if f.author_lines else 0,
            "lastModified": "Recent",
            "contributors": list(f.author_lines.keys()) if f.author_lines else [],
            "imports": [imp.get("module", "") if isinstance(imp, dict) else str(imp) for imp in (f.imports or [])],
            "importedBy": imported_by_map.get(f.relative_path, [])
        }
        
    # Recursive function to convert dict to list of children
    def convert_to_list(node, node_id):
        result = {
            "id": node_id,
            "name": node["name"],
            "path": node["path"],
            "type": node["type"]
        }
        
        if node["type"] == "directory":
            children = []
            for k, v in node.get("children", {}).items():
                child_id = f"{node_id}/{k}" if node_id != "root" else k
                children.append(convert_to_list(v, child_id))
            # Sort directories first, then alphabetically
            children.sort(key=lambda x: (x["type"] == "file", x["name"]))
            result["children"] = children
        else:
            result["language"] = node.get("language")
            result["size"] = node.get("size")
            result["commits"] = node.get("commits")
            result["owner"] = node.get("owner")
            result["lines"] = node.get("lines")
            result["lastModified"] = node.get("lastModified")
            result["contributors"] = node.get("contributors")
            result["imports"] = node.get("imports")
            result["importedBy"] = node.get("importedBy")
            
        return result

    tree = convert_to_list(root, "root")
    return schemas.FileNodeSchema(**tree)


@router.get("/notifications")
def get_notifications():
    """Mock notifications since we haven't built this feature yet."""
    return [
        {
            "id": "1",
            "title": "Analysis Complete",
            "message": "Repository tiangolo/fastapi was successfully analyzed.",
            "type": "success",
            "timestamp": "Just now",
            "read": False
        }
    ]

