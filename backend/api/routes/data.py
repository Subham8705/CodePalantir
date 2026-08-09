import os
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
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
            
    langs = []
    colors = {".py": "#3776AB", ".ts": "#3178C6", ".tsx": "#3178C6", ".js": "#F7DF1E"}
    names = {".py": "Python", ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".md": "Markdown", ".json": "JSON"}
    
    for ext, count in sorted(extensions.items(), key=lambda x: x[1], reverse=True)[:5]:
        langs.append({
            "name": names.get(ext, ext),
            "percentage": round((count / total_files) * 100),
            "color": colors.get(ext, "#888888")
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


@router.get("/modules", response_model=List[schemas.ModuleSchema])
def get_modules(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    result = []
    
    for mod in repo.modules:
        result.append(schemas.ModuleSchema(
            id=mod.id,
            name=mod.name,
            description=f"Core file: {mod.core_file}" if mod.core_file else "Architecture Module",
            files=len(mod.files) if mod.files else 0,
            dependencies=mod.dependencies if mod.dependencies else [],
            churn=mod.churn_count or 0,
            primaryOwner=mod.primary_owner
        ))
    return result


@router.get("/onboarding", response_model=List[schemas.OnboardingStepSchema])
def get_onboarding_path(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    result = []
    
    # Sort by step order
    steps = sorted(repo.onboarding_steps, key=lambda x: x.step_order)
    
    for step in steps:
        # Calculate estimated time (naive: 5 mins per step + some randomness)
        mins = 5 + (step.step_order % 5)
        
        # Generate some tasks (at least one for the core file)
        tasks = []
        if step.core_file:
            tasks.append({
                "id": f"{step.id}-1",
                "title": f"Review {step.core_file.split('/')[-1]}",
                "description": "This is the core entry point for this module.",
                "completed": False
            })
            
        result.append(schemas.OnboardingStepSchema(
            id=step.id,
            title=f"Understand {step.module_name}",
            description=step.reason,
            module_id=step.module_id,
            estimated_time=f"{mins} mins",
            core_file=step.core_file or "",
            tasks=tasks
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
        # Mocking top modules for now
        result.append(schemas.ContributorSchema(
            id=str(idx),
            name=name,
            avatar=f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=random",
            commits=stats["commits"],
            additions=stats["lines"],
            deletions=stats["lines"] // 3, # Mock deletions
            topModules=[]
        ))
    return result


@router.get("/architecture/nodes", response_model=List[schemas.ArchitectureNodeSchema])
def get_architecture_nodes(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    nodes = []
    
    # Simple grid layout algorithm for React Flow
    cols = math.ceil(math.sqrt(len(repo.modules)))
    
    for idx, mod in enumerate(repo.modules):
        row = idx // cols
        col = idx % cols
        
        nodes.append(schemas.ArchitectureNodeSchema(
            id=mod.id,
            data={"label": mod.name},
            position={"x": col * 250, "y": row * 150},
            type="moduleNode"
        ))
    return nodes


@router.get("/architecture/edges", response_model=List[schemas.ArchitectureEdgeSchema])
def get_architecture_edges(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    edges = []
    
    for mod in repo.modules:
        if mod.dependencies:
            for dep_id in mod.dependencies:
                edges.append(schemas.ArchitectureEdgeSchema(
                    id=f"e-{mod.id}-{dep_id}",
                    source=mod.id,
                    target=dep_id,
                    animated=True
                ))
    return edges


@router.get("/files/tree", response_model=schemas.FileNodeSchema)
def get_file_tree(db: Session = Depends(get_db)):
    repo = get_latest_repo(db)
    
    # Build tree from flat list of paths
    root = {"name": "root", "path": "", "type": "directory", "children": {}}
    
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
            "owner": f.primary_owner
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

