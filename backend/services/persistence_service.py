"""
Persistence Service.

Handles saving the complex in-memory analysis objects to the PostgreSQL database.
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from database import models
from services.parser.parsing_service import RepositoryAnalysis, ParsedFile
from services.analysis.architecture_detector import ArchitectureModule
from services.analysis.git_analyzer import FileGitStats
from services.analysis.onboarding_generator import OnboardingStep


class PersistenceService:
    def __init__(self, db: Session):
        self.db = db

    def save_analysis(
        self, 
        repo_name: str, 
        repo_url: str, 
        analysis: RepositoryAnalysis, 
        modules: List[ArchitectureModule], 
        git_stats: Dict[str, FileGitStats],
        onboarding_steps: List[OnboardingStep]
    ) -> models.RepositoryModel:
        """
        Saves all repository analysis data to the database in a single transaction.
        If a repository with the same URL exists, it completely replaces the old analysis.
        """
        # 1. Delete existing repo analysis if it exists
        existing_repo = self.db.query(models.RepositoryModel).filter(models.RepositoryModel.url == repo_url).first()
        if existing_repo:
            # Delete children explicitly to avoid Foreign Key constraint violations 
            # if SQLAlchemy orders the cascade deletes incorrectly
            self.db.query(models.OnboardingStepModel).filter(models.OnboardingStepModel.repository_id == existing_repo.id).delete()
            self.db.query(models.ArchitectureModuleModel).filter(models.ArchitectureModuleModel.repository_id == existing_repo.id).delete()
            self.db.query(models.ParsedFileModel).filter(models.ParsedFileModel.repository_id == existing_repo.id).delete()
            
            self.db.delete(existing_repo)
            self.db.flush() # Flush the delete to avoid unique constraint violations
            
        # 2. Create Repository
        repo_model = models.RepositoryModel(
            name=repo_name,
            url=repo_url,
            last_analyzed=datetime.utcnow()
        )
        self.db.add(repo_model)
        self.db.flush() # Flush to get the repo_model.id
        
        # 3. Create Parsed Files
        for f in analysis.files:
            stats = git_stats.get(f.relative_path)
            
            # Convert functions and classes to dicts for JSON storage
            funcs = [fn if isinstance(fn, dict) else fn.__dict__ for fn in f.functions]
            classes = [c if isinstance(c, dict) else c.__dict__ for c in f.classes]
            
            file_model = models.ParsedFileModel(
                repository_id=repo_model.id,
                relative_path=f.relative_path,
                imports=f.imports,
                functions=funcs,
                classes=classes,
                churn_count=stats.churn_count if stats else 0,
                primary_owner=stats.primary_owner if stats else None,
                author_lines=dict(stats.author_lines) if stats else {}
            )
            self.db.add(file_model)
            
        # 4. Create Architecture Modules
        for mod in modules:
            mod_model = models.ArchitectureModuleModel(
                id=mod.id,
                repository_id=repo_model.id,
                name=mod.name,
                core_file=mod.core_file,
                files=mod.files,
                dependencies=mod.dependencies,
                churn_count=getattr(mod, 'churn_count', 0),
                primary_owner=getattr(mod, 'primary_owner', None),
                author_lines=getattr(mod, 'author_lines', {})
            )
            self.db.add(mod_model)
            
        # 5. Create Onboarding Steps
        for idx, step in enumerate(onboarding_steps):
            step_model = models.OnboardingStepModel(
                repository_id=repo_model.id,
                step_order=idx + 1,
                module_id=step.module_id,
                module_name=step.module_name,
                core_file=step.core_file,
                reason=step.reason
            )
            self.db.add(step_model)
            
        # Commit the transaction
        self.db.commit()
        self.db.refresh(repo_model)
        return repo_model

    def get_repository(self, repo_id: int) -> models.RepositoryModel:
        """Retrieves a repository by ID."""
        return self.db.query(models.RepositoryModel).filter(models.RepositoryModel.id == repo_id).first()

    def list_repositories(self) -> List[models.RepositoryModel]:
        """Lists all analyzed repositories."""
        return self.db.query(models.RepositoryModel).all()
