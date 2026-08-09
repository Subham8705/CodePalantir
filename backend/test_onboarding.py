"""Test script: Run onboarding path generation on a real repo."""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.parser.parsing_service import ParsingService
from services.analysis.graph_builder import GraphBuilder
from services.analysis.architecture_detector import ArchitectureDetector
from services.analysis.onboarding_generator import OnboardingGenerator

def main():
    repo_path = "cloned_repos/fastapi"
    
    if not os.path.exists(repo_path):
        print(f"Error: {repo_path} does not exist. Run test_parse.py first to clone it.")
        sys.exit(1)
        
    print(f"=== 1. Parsing {repo_path} ===")
    parsing_service = ParsingService()
    analysis = parsing_service.parse_repository(repo_path)
    
    print("=== 2. Building Dependency Graph ===")
    graph_builder = GraphBuilder()
    graph = graph_builder.build_dependency_graph(repo_path, analysis)
    
    print("=== 3. Detecting Architecture Modules ===")
    detector = ArchitectureDetector()
    modules = detector.detect_modules(graph)
    
    print("=== 4. Generating Onboarding Path (Bottom-Up) ===")
    t0 = time.time()
    generator = OnboardingGenerator()
    steps = generator.generate_path(modules, strategy="bottom_up")
    print(f"Generated path with {len(steps)} steps in {time.time() - t0:.3f}s\n")
    
    print("=== Suggested Reading Path (First 15 Steps) ===")
    for i, step in enumerate(steps[:15]):
        print(f"Step {i+1}: {step.module_name}")
        print(f"  Reason: {step.reason}")
        print(f"  Start with file: {step.core_file}")
        print()

if __name__ == "__main__":
    main()
