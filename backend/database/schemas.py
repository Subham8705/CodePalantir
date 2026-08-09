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
    layer: str
    fileCount: int
    dependencies: List[str]
    dependents: List[str]
    primaryContributors: List[str]
    files: List[Any] # Will just return empty list for now or minimal objects
    ownership: Dict[str, int]
    color: str
    aiExplanation: str
    history: List[Dict[str, Any]] = []
    
    class Config:
        from_attributes = True

class OnboardingStepSchema(BaseModel):
    id: str
    order: int
    moduleId: str
    title: str
    description: str
    estimatedTime: str
    estimatedMinutes: int
    prerequisites: List[str] = []
    whyNext: str = ""
    files: List[str] = []
    learningObjective: str = ""
    beforeYouStart: List[str] = []
    whyItMatters: str = ""
    aiExplanation: str = ""
    completed: bool = False
    
    class Config:
        from_attributes = True

class ContributorSchema(BaseModel):
    id: str
    name: str
    avatar: str
    role: str
    commits: int
    filesTouched: int
    contributionPct: int
    primaryAreas: List[str]
    recentActivity: List[Dict[str, Any]]

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
    lines: Optional[int] = None
    lastModified: Optional[str] = None
    contributors: Optional[List[str]] = None
    imports: Optional[List[str]] = None
    importedBy: Optional[List[str]] = None

FileNodeSchema.model_rebuild()
