"""
Unit tests for the graph builder and import resolver.
"""

import sys
import os

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.analysis.import_resolver import ImportResolver
from services.analysis.graph_builder import GraphBuilder
from services.parser.parsing_service import RepositoryAnalysis, ParsedFile


def test_python_import_resolver():
    available = {
        "main.py",
        "app/utils.py",
        "app/models/__init__.py",
        "app/models/user.py",
        "lib/config.py"
    }
    resolver = ImportResolver("/fake/repo", available)

    # 1. Absolute imports
    assert resolver.resolve("app.utils", "main.py", "python") == "app/utils.py"
    assert resolver.resolve("app.models", "main.py", "python") == "app/models/__init__.py"
    assert resolver.resolve("lib.config", "app/utils.py", "python") == "lib/config.py"
    assert resolver.resolve("unknown.module", "main.py", "python") is None

    # 2. Relative imports
    assert resolver.resolve(".utils", "app/main_app.py", "python") == "app/utils.py"
    assert resolver.resolve(".user", "app/models/__init__.py", "python") == "app/models/user.py"
    assert resolver.resolve("..utils", "app/models/user.py", "python") == "app/utils.py"

    print("  PASS: test_python_import_resolver")


def test_js_ts_import_resolver():
    available = {
        "src/index.ts",
        "src/utils.ts",
        "src/components/Button.tsx",
        "src/components/index.ts",
        "package.json"
    }
    resolver = ImportResolver("/fake/repo", available)

    # 1. Relative imports
    assert resolver.resolve("./utils", "src/index.ts", "javascript") == "src/utils.ts"
    assert resolver.resolve("./Button", "src/components/index.ts", "typescript") == "src/components/Button.tsx"
    assert resolver.resolve("../utils", "src/components/Button.tsx", "tsx") == "src/utils.ts"

    # 2. Directory index imports
    assert resolver.resolve("./components", "src/index.ts", "typescript") == "src/components/index.ts"

    # 3. Alias imports
    assert resolver.resolve("@/utils", "src/components/Button.tsx", "typescript") == "src/utils.ts"
    assert resolver.resolve("~/components", "src/index.ts", "typescript") == "src/components/index.ts"

    # 4. Third-party or unknown
    assert resolver.resolve("react", "src/index.ts", "javascript") is None
    
    print("  PASS: test_js_ts_import_resolver")


def test_graph_builder():
    """Test building a directed graph from mock files."""
    analysis = RepositoryAnalysis()
    
    file_a = ParsedFile(
        path="/fake/repo/src/a.py",
        relative_path="src/a.py",
        language="python",
        imports=[{"module": "src.b"}, {"module": "src.c"}],
    )
    file_b = ParsedFile(
        path="/fake/repo/src/b.py",
        relative_path="src/b.py",
        language="python",
        imports=[{"module": ".c"}],
    )
    file_c = ParsedFile(
        path="/fake/repo/src/c.py",
        relative_path="src/c.py",
        language="python",
        imports=[],
    )
    
    analysis.files.extend([file_a, file_b, file_c])
    
    builder = GraphBuilder()
    graph = builder.build_dependency_graph("/fake/repo", analysis)
    
    assert graph.number_of_nodes() == 3
    assert graph.number_of_edges() == 3
    
    # Check edges
    assert graph.has_edge("src/a.py", "src/b.py")
    assert graph.has_edge("src/a.py", "src/c.py")
    assert graph.has_edge("src/b.py", "src/c.py")
    
    stats = builder.get_graph_stats(graph)
    assert stats["nodes"] == 3
    assert stats["edges"] == 3
    assert len(stats["top_dependencies"]) > 0
    # C should have in-degree 2 (from A and B)
    assert stats["top_dependencies"][0]["file"] == "src/c.py"
    assert stats["top_dependencies"][0]["imported_by_count"] == 2

    print("  PASS: test_graph_builder")


if __name__ == "__main__":
    print("Running graph builder tests...\n")
    tests = [
        test_python_import_resolver,
        test_js_ts_import_resolver,
        test_graph_builder,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"  FAIL: {test.__name__}: {e}")
            failed += 1

    print(f"\nResults: {passed} passed, {failed} failed out of {len(tests)} tests")
    if failed > 0:
        sys.exit(1)
