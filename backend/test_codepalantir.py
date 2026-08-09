"""Test script: Save CodePalantir analysis to PostgreSQL database."""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.database import engine, Base, SessionLocal
from services.parser.parsing_service import ParsingService
from services.analysis.graph_builder import GraphBuilder
from services.analysis.architecture_detector import ArchitectureDetector
from services.analysis.git_analyzer import GitAnalyzer
from services.analysis.onboarding_generator import OnboardingGenerator
from services.persistence_service import PersistenceService

def main():
    repo_name = "Subham8705/CodePalantir"
    repo_url = "https://github.com/Subham8705/CodePalantir.git"
    repo_path = "cloned_repos/CodePalantir"
    
    # 0. Clone if not exists
    if not os.path.exists(repo_path):
        print(f"Cloning {repo_url} into {repo_path}...")
        import subprocess
        subprocess.run(["git", "clone", repo_url, repo_path], check=True)
        
    print("=== 0. Creating Database Tables ===")
    Base.metadata.create_all(bind=engine)
        
    print(f"\n=== 1. Parsing {repo_path} ===")
    parsing_service = ParsingService()
    analysis = parsing_service.parse_repository(repo_path)
    
    print("\n=== 2. Building Dependency Graph ===")
    graph_builder = GraphBuilder()
    graph = graph_builder.build_dependency_graph(repo_path, analysis)
    
    print("\n=== 3. Detecting Architecture Modules ===")
    detector = ArchitectureDetector()
    modules = detector.detect_modules(graph)
    
    print("\n=== 4. Analyzing Git History & Ownership ===")
    git_analyzer = GitAnalyzer(max_workers=32)
    files_to_blame = [f.relative_path for f in analysis.files]
    git_stats = git_analyzer.analyze_repository(repo_path, files_to_blame)
    git_analyzer.aggregate_module_stats(modules, git_stats)
    
    print("\n=== 5. Generating Onboarding Path ===")
    generator = OnboardingGenerator()
    steps = generator.generate_path(modules, strategy="bottom_up")
    
    print("\n=== 6. Saving to Database ===")
    t0 = time.time()
    db = SessionLocal()
    try:
        persistence = PersistenceService(db)
        repo_model = persistence.save_analysis(
            repo_name=repo_name,
            repo_url=repo_url,
            analysis=analysis,
            modules=modules,
            git_stats=git_stats,
            onboarding_steps=steps
        )
        print(f"Successfully saved CodePalantir to database in {time.time() - t0:.2f}s!")
        print(f"Repository ID: {repo_model.id}")
        print(f"Total Files Saved: {len(repo_model.files)}")
        print(f"Total Modules Saved: {len(repo_model.modules)}")
        print(f"Total Onboarding Steps Saved: {len(repo_model.onboarding_steps)}")
    except Exception as e:
        print(f"Error saving to database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
