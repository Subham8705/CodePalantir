import os
import shutil
import tempfile
from pathlib import Path
from git import Repo, GitCommandError
from pydantic import BaseModel
from typing import Dict, Any

class GitService:
    def __init__(self, base_clone_dir: str = None):
        if base_clone_dir is None:
            # For development, use a local folder so we can inspect it.
            # In production, use tempfile.gettempdir() or a dedicated volume.
            self.base_clone_dir = Path("cloned_repos")
        else:
            self.base_clone_dir = Path(base_clone_dir)
            
        os.makedirs(self.base_clone_dir, exist_ok=True)

    def extract_repo_name(self, url: str) -> str:
        """Extracts the repository name from the URL."""
        parts = url.rstrip("/").split("/")
        return parts[-1] if parts else "unknown_repo"

    def clone_repository(self, url: str) -> Dict[str, Any]:
        """
        Clones a repository to a local directory and returns basic metadata.
        """
        repo_name = self.extract_repo_name(url)
        # We append a random string or just use the repo name for simplicity
        target_dir = self.base_clone_dir / repo_name

        # If it already exists, for this phase we'll just delete it and re-clone 
        # (or we could just pull/return it)
        try:
            if target_dir.exists() and (target_dir / ".git").exists():
                print(f"Pulling {url} in {target_dir}...")
                repo = Repo(target_dir)
                origin = repo.remotes.origin
                origin.pull()
            else:
                shutil.rmtree(target_dir, ignore_errors=True)
                print(f"Cloning {url} to {target_dir}...")
                repo = Repo.clone_from(url, target_dir)
            
            # Gather simple stats
            file_count = sum([len(files) for r, d, files in os.walk(target_dir) if '.git' not in r])
            
            return {
                "status": "success",
                "repo_name": repo_name,
                "path": str(target_dir.absolute()),
                "file_count": file_count
            }
        except GitCommandError as e:
            return {
                "status": "error",
                "message": str(e)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Unexpected error: {str(e)}"
            }
