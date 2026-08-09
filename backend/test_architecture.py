"""Test script: Run architecture detection on a real repo."""
import os
import sys
import time
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.parser.parsing_service import ParsingService
from services.analysis.graph_builder import GraphBuilder
from services.analysis.architecture_detector import ArchitectureDetector

def main():
    repo_path = "cloned_repos/fastapi"
    
    if not os.path.exists(repo_path):
        print(f"Error: {repo_path} does not exist. Run test_parse.py first to clone it.")
        sys.exit(1)
        
    print(f"=== 1. Parsing {repo_path} ===")
    t0 = time.time()
    parsing_service = ParsingService()
    analysis = parsing_service.parse_repository(repo_path)
    print(f"Parsed {len(analysis.files)} files in {time.time() - t0:.2f}s")
    
    print("\n=== 2. Building Dependency Graph ===")
    t1 = time.time()
    graph_builder = GraphBuilder()
    graph = graph_builder.build_dependency_graph(repo_path, analysis)
    print(f"Built graph with {graph.number_of_nodes()} nodes and {graph.number_of_edges()} edges in {time.time() - t1:.2f}s")
    
    print("\n=== 3. Detecting Architecture Modules ===")
    t2 = time.time()
    detector = ArchitectureDetector()
    modules = detector.detect_modules(graph)
    print(f"Detected {len(modules)} architectural modules in {time.time() - t2:.2f}s")
    
    print("\n=== Discovered Modules ===")
    for m in modules[:15]: # Show top 15 modules
        dep_count = len(m.dependencies)
        print(f"[{m.name}] - {len(m.files)} files, depends on {dep_count} other modules")
        if len(m.files) > 0:
            print(f"  Sample files: {m.files[:3]}")

if __name__ == "__main__":
    main()
