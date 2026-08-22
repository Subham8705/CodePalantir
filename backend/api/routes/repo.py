from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from services.git_service import GitService

router = APIRouter()
git_service = GitService()

class RepoUrlRequest(BaseModel):
    url: str

def _run_full_pipeline(repo_url: str, repo_path: str, repo_name: str, background_tasks: BackgroundTasks = None):
    from services.parser.parsing_service import ParsingService
    from services.analysis.graph_builder import GraphBuilder
    from services.analysis.architecture_detector import ArchitectureDetector
    from services.analysis.git_analyzer import GitAnalyzer
    from services.analysis.onboarding_generator import OnboardingGenerator
    from services.persistence_service import PersistenceService
    from database.database import SessionLocal
    from services.semantic_search import SemanticSearchService
    
    parsing_service = ParsingService()
    analysis = parsing_service.parse_repository(repo_path)
    
    graph_builder = GraphBuilder()
    graph = graph_builder.build_dependency_graph(repo_path, analysis)
    
    detector = ArchitectureDetector()
    modules = detector.detect_modules(graph)
    
    git_analyzer = GitAnalyzer(max_workers=32)
    files_to_blame = [f.relative_path for f in analysis.files]
    git_stats = git_analyzer.analyze_repository(repo_path, files_to_blame)
    git_analyzer.aggregate_module_stats(modules, git_stats)
    
    generator = OnboardingGenerator()
    steps = generator.generate_path(modules, strategy="bottom_up")
    
    db = SessionLocal()
    try:
        persistence = PersistenceService(db)
        persistence.save_analysis(
            repo_name=repo_name,
            repo_url=repo_url,
            analysis=analysis,
            modules=modules,
            git_stats=git_stats,
            onboarding_steps=steps
        )
    finally:
        db.close()
        
    def _index_bg():
        try:
            search_service = SemanticSearchService()
            search_service.index_repository(repo_url=repo_url, repo_name=repo_name, analysis_files=analysis.files)
        except Exception as e:
            print(f"Failed to index repository for semantic search: {e}")

    if background_tasks:
        background_tasks.add_task(_index_bg)
    else:
        _index_bg()

@router.post("/clone")
def clone_repository(request: RepoUrlRequest, background_tasks: BackgroundTasks):
    """
    Clones a repository based on the provided URL and runs the full analysis.
    """
    if not request.url:
        raise HTTPException(status_code=400, detail="Repository URL is required")
        
    result = git_service.clone_repository(request.url)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
        
    try:
        _run_full_pipeline(request.url, result.get("path"), result.get("repo_name"), background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")
        
    return result


@router.post("/sync")
def sync_repository(request: RepoUrlRequest, background_tasks: BackgroundTasks):
    """
    Syncs the local repository (git pull) and re-runs the parser to update data.
    """
    if not request.url:
        raise HTTPException(status_code=400, detail="Repository URL is required")
        
    git_result = git_service.clone_repository(request.url)
    if git_result.get("status") == "error":
        raise HTTPException(status_code=500, detail=git_result.get("message"))
        
    try:
        _run_full_pipeline(request.url, git_result.get("path"), git_result.get("repo_name"), background_tasks)
        return {"status": "success", "message": "Repository synced and analyzed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed after sync: {str(e)}")
