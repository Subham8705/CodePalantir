from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

class RepositorySchema(BaseModel):
    id: str  # Frontend expects string ID
    name: str
    owner: str
    url: str
    description: str
    branch: str
    branches: List[str]
    lastAnalyzed: str
    stats: Dict[str, int]
    languages: List[Dict[str, Any]]
    frameworks: List[str]
    recentActivity: List[Dict[str, str]] = []
    
    class Config:
        from_attributes = True

class ModuleSchema(BaseModel):
    id: str
    name: str
    description: str
    files: int
    dependencies: List[str]
    churn: int
    primaryOwner: Optional[str]
    
    class Config:
        from_attributes = True

class OnboardingStepSchema(BaseModel):
    id: int
    title: str
    description: str
    module_id: str
    estimated_time: str
    core_file: str
    tasks: List[Dict[str, Any]] = []
    
    class Config:
        from_attributes = True

class ContributorSchema(BaseModel):
    id: str
    name: str
    avatar: str
    commits: int
    additions: int
    deletions: int
    topModules: List[str]

class ArchitectureNodeSchema(BaseModel):
    id: str
    label: str
    layer: str
    fileCount: int
    dependencyCount: int
    description: str
    moduleId: str

class ArchitectureEdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    animated: bool

class FileNodeSchema(BaseModel):
    id: str
    name: str
    path: str
    type: str  # 'file' or 'directory'
    children: Optional[List['FileNodeSchema']] = None
    language: Optional[str] = None
    size: Optional[int] = None
    commits: Optional[int] = None
    owner: Optional[str] = None

FileNodeSchema.model_rebuild()
