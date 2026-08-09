from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database.database import Base

class RepositoryModel(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    url = Column(String, unique=True, index=True)
    last_analyzed = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    files = relationship("ParsedFileModel", back_populates="repository", cascade="all, delete-orphan")
    modules = relationship("ArchitectureModuleModel", back_populates="repository", cascade="all, delete-orphan")
    onboarding_steps = relationship("OnboardingStepModel", back_populates="repository", cascade="all, delete-orphan")


class ParsedFileModel(Base):
    __tablename__ = "parsed_files"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    relative_path = Column(String, index=True, nullable=False)
    
    # AST Data
    imports = Column(JSON, default=list)      # List of strings
    functions = Column(JSON, default=list)    # List of dicts
    classes = Column(JSON, default=list)      # List of dicts
    
    # Git Data
    churn_count = Column(Integer, default=0)
    primary_owner = Column(String, nullable=True)
    author_lines = Column(JSON, default=dict) # Dict of author -> lines
    
    # Relationships
    repository = relationship("RepositoryModel", back_populates="files")


class ArchitectureModuleModel(Base):
    __tablename__ = "architecture_modules"

    id = Column(String, primary_key=True) # UUID string from the analyzer
    repository_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    name = Column(String, nullable=False)
    core_file = Column(String, nullable=True)
    files = Column(JSON, default=list) # List of relative paths
    dependencies = Column(JSON, default=list) # List of module IDs
    
    # Git Data aggregated
    churn_count = Column(Integer, default=0)
    primary_owner = Column(String, nullable=True)
    
    # Relationships
    repository = relationship("RepositoryModel", back_populates="modules")


class OnboardingStepModel(Base):
    __tablename__ = "onboarding_steps"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    step_order = Column(Integer, nullable=False)
    
    module_id = Column(String, ForeignKey("architecture_modules.id"), nullable=False)
    module_name = Column(String, nullable=False)
    core_file = Column(String, nullable=True)
    reason = Column(Text, nullable=False)
    
    # Relationships
    repository = relationship("RepositoryModel", back_populates="onboarding_steps")
