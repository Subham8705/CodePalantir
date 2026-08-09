"""Re-run the full pipeline to populate DB with correct graph data."""
from services.parser.parsing_service import ParsingService
from services.analysis.graph_builder import GraphBuilder
from services.analysis.architecture_detector import ArchitectureDetector
from services.analysis.git_analyzer import GitAnalyzer
from services.analysis.onboarding_generator import OnboardingGenerator
from services.persistence_service import PersistenceService
from database.database import SessionLocal

repo_url = 'https://github.com/Subham8705/CodePalantir.git'
repo_path = 'cloned_repos/CodePalantir.git'
repo_name = 'CodePalantir.git'

print('1. Parsing...')
analysis = ParsingService().parse_repository(repo_path)
print(f'   {len(analysis.files)} files parsed')

print('2. Building dependency graph...')
graph = GraphBuilder().build_dependency_graph(repo_path, analysis)
print(f'   {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges')

print('3. Detecting architecture...')
modules = ArchitectureDetector().detect_modules(graph)
print(f'   {len(modules)} modules detected')

# Show some modules with dependencies
for m in modules[:5]:
    dep_names = [next((x.name for x in modules if x.id == d), '?') for d in m.dependencies]
    print(f'   [{m.name}] files={len(m.files)}, deps={dep_names}')

print('4. Git analysis...')
git_analyzer = GitAnalyzer(max_workers=32)
files_to_blame = [f.relative_path for f in analysis.files]
git_stats = git_analyzer.analyze_repository(repo_path, files_to_blame)
git_analyzer.aggregate_module_stats(modules, git_stats)

print('5. Onboarding...')
steps = OnboardingGenerator().generate_path(modules, strategy='bottom_up')
for s in steps[:3]:
    print(f'   [{s.module_name}]: {s.reason[:80]}...')

print('6. Saving to database...')
db = SessionLocal()
try:
    persistence = PersistenceService(db)
    persistence.save_analysis(
        repo_name=repo_name, repo_url=repo_url,
        analysis=analysis, modules=modules,
        git_stats=git_stats, onboarding_steps=steps
    )
    print('Done!')
finally:
    db.close()
