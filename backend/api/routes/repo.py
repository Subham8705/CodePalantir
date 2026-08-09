from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.git_service import GitService

router = APIRouter()
git_service = GitService()

class RepoUrlRequest(BaseModel):
    url: str

@router.post("/clone")
def clone_repository(request: RepoUrlRequest):
    """
    Clones a repository based on the provided URL.
    """
    if not request.url:
        raise HTTPException(status_code=400, detail="Repository URL is required")
        
    result = git_service.clone_repository(request.url)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
        
    return result
