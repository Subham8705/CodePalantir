"""Test script: Parse a real repo and build the dependency graph."""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.parser.parsing_service import ParsingService
from services.analysis.graph_builder import GraphBuilder

def main():
    repo_path = "cloned_repos/fastapi"
    
    if not os.path.exists(repo_path):
        print(f"Error: {repo_path} does not exist. Run test_parse.py first to clone it.")
        sys.exit(1)
        
    print(f"=== Parsing {repo_path} ===")
    t0 = time.time()
    parsing_service = ParsingService()
    analysis = parsing_service.parse_repository(repo_path)
    print(f"Parsed {len(analysis.files)} files in {time.time() - t0:.2f}s")
    
    print("\n=== Building Dependency Graph ===")
    t1 = time.time()
    graph_builder = GraphBuilder()
    graph = graph_builder.build_dependency_graph(repo_path, analysis)
    
    stats = graph_builder.get_graph_stats(graph)
    print(f"Built graph in {time.time() - t1:.2f}s")
    print(f"Nodes: {stats['nodes']}")
    print(f"Edges: {stats['edges']}")
    
    print("\nTop 10 most depended-upon files:")
    for dep in stats["top_dependencies"]:
        print(f"  {dep['file']}: imported by {dep['imported_by_count']} files")

if __name__ == "__main__":
    main()
