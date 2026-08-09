"""Test script: Run git analysis on a real repo."""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.parser.parsing_service import ParsingService
from services.analysis.graph_builder import GraphBuilder
from services.analysis.architecture_detector import ArchitectureDetector
from services.analysis.git_analyzer import GitAnalyzer

def main():
    repo_path = "cloned_repos/fastapi"
    
    if not os.path.exists(repo_path):
        print(f"Error: {repo_path} does not exist. Run test_parse.py first to clone it.")
        sys.exit(1)
        
    print(f"=== 1. Parsing {repo_path} ===")
    t0 = time.time()
    parsing_service = ParsingService()
    analysis = parsing_service.parse_repository(repo_path)
    
    print("\n=== 2. Building Dependency Graph ===")
    graph_builder = GraphBuilder()
    graph = graph_builder.build_dependency_graph(repo_path, analysis)
    
    print("\n=== 3. Detecting Architecture Modules ===")
    detector = ArchitectureDetector()
    modules = detector.detect_modules(graph)
    print(f"Detected {len(modules)} architectural modules")
    
    print("\n=== 4. Analyzing Git History & Ownership ===")
    t3 = time.time()
    git_analyzer = GitAnalyzer(max_workers=32)
    
    # We only want to blame the files that we actually parsed and care about
    files_to_blame = [f.relative_path for f in analysis.files]
    
    print(f"Extracting git stats for {len(files_to_blame)} files (this might take a few seconds)...")
    git_stats = git_analyzer.analyze_repository(repo_path, files_to_blame)
    
    git_analyzer.aggregate_module_stats(modules, git_stats)
    print(f"Git analysis completed in {time.time() - t3:.2f}s")
    
    print("\n=== Discovered Modules & Ownership ===")
    for m in modules[:15]: # Show top 15 modules
        print(f"[{m.name}]")
        print(f"  Files: {len(m.files)}")
        print(f"  Total Churn (commits): {m.churn_count}")
        print(f"  Primary Owner: {m.primary_owner}")
        print()

if __name__ == "__main__":
    main()
