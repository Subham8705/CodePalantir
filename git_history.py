import os
import subprocess
import time

def run_cmd(cmd):
    print(f"Running: {cmd}")
    subprocess.run(cmd, shell=True, check=True)

commits = [
    {
        "msg": "Initial commit: Project scaffold and configuration",
        "add": [".gitignore", "package.json", "package-lock.json", "refactor.py"]
    },
    {
        "msg": "feat(frontend): Initialize Vite React TypeScript frontend",
        "add": ["project/package.json", "project/index.html", "project/vite.config.ts", "project/tsconfig.*", "project/eslint.config.js"]
    },
    {
        "msg": "feat(frontend): Add TailwindCSS and base styling",
        "add": ["project/tailwind.config.js", "project/postcss.config.js", "project/src/index.css", "project/src/vite-env.d.ts", "project/src/main.tsx"]
    },
    {
        "msg": "feat(frontend): Implement core UI components (Layout, Sidebar, Cards)",
        "add": ["project/src/components/"]
    },
    {
        "msg": "feat(frontend): Scaffold application pages (Overview, Architecture, Explorer, Insights)",
        "add": ["project/src/pages/"]
    },
    {
        "msg": "refactor(frontend): Introduce ApiContext and replace mock data with live hooks",
        "add": ["project/src/context/", "project/src/App.tsx", "project/src/types/"]
    },
    {
        "msg": "feat(backend): Initialize FastAPI application and core routing",
        "add": ["backend/requirements.txt", "backend/main.py", "backend/api/__init__.py", "backend/api/routes/__init__.py"]
    },
    {
        "msg": "feat(backend): Implement Git cloning service and repository acquisition",
        "add": ["backend/services/__init__.py", "backend/services/git_service.py", "backend/api/routes/repo.py"]
    },
    {
        "msg": "feat(parser): Setup Tree-sitter manager and grammar configuration",
        "add": ["backend/services/parser/__init__.py", "backend/services/parser/treesitter_manager.py"]
    },
    {
        "msg": "feat(parser): Implement Python AST extractor for imports, functions, and classes",
        "add": ["backend/services/parser/python_extractor.py"]
    },
    {
        "msg": "feat(parser): Implement JS/TS AST extractor for imports, functions, and classes",
        "add": ["backend/services/parser/js_ts_extractor.py"]
    },
    {
        "msg": "feat(parser): Orchestrate multi-language parsing via ParsingService",
        "add": ["backend/services/parser/parsing_service.py", "backend/api/routes/parse.py"]
    },
    {
        "msg": "test(parser): Add comprehensive unit tests for AST extraction",
        "add": ["backend/tests/__init__.py", "backend/tests/test_parser.py"]
    },
    {
        "msg": "feat(analysis): Add robust ImportResolver for Python and JS module resolution",
        "add": ["backend/services/analysis/__init__.py", "backend/services/analysis/import_resolver.py"]
    },
    {
        "msg": "feat(analysis): Implement NetworkX GraphBuilder for dependency mapping",
        "add": ["backend/services/analysis/graph_builder.py"]
    },
    {
        "msg": "test(analysis): Add tests for dependency graph generation",
        "add": ["backend/tests/test_graph_builder.py"]
    },
    {
        "msg": "chore: Add test scripts and debug utilities",
        "add": ["backend/test_parse.py", "backend/test_graph.py", "backend/debug_test.py"]
    },
    {
        "msg": "chore: Catch up remaining uncommitted files",
        "add": ["."]
    }
]

for commit in commits:
    for path in commit["add"]:
        # Add files, suppress error if glob doesn't match anything
        run_cmd(f"git add {path} 2>NUL || git add {path}\\* 2>NUL || echo 'Continuing'")
    
    # Check if there's anything to commit
    result = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True)
    if result.stdout.strip():
        run_cmd(f'git commit -m "{commit["msg"]}"')
    else:
        print("Nothing to commit for this step, skipping...")

print("Done creating git history.")
