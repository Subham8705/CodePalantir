"""
Unit tests for the Onboarding Generator.
"""

import sys
import os

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.analysis.architecture_detector import ArchitectureModule
from services.analysis.onboarding_generator import OnboardingGenerator


def test_topological_sort_bottom_up():
    """Test generating a bottom-up reading path."""
    generator = OnboardingGenerator()
    
    mod_ui = ArchitectureModule("UI", ["ui.py"], "ui.py")
    mod_api = ArchitectureModule("API", ["api.py"], "api.py")
    mod_db = ArchitectureModule("Database", ["db.py"], "db.py")
    
    # UI depends on API, API depends on DB
    mod_ui.dependencies = [mod_api.id]
    mod_api.dependencies = [mod_db.id]
    mod_db.dependencies = []
    
    modules = [mod_ui, mod_api, mod_db]
    
    steps = generator.generate_path(modules, strategy="bottom_up")
    
    assert len(steps) == 3
    # Bottom up should be DB -> API -> UI
    assert steps[0].module_name == "Database"
    assert steps[1].module_name == "API"
    assert steps[2].module_name == "UI"

    print("  PASS: test_topological_sort_bottom_up")


def test_circular_dependency_handling():
    """Test that circular dependencies are condensed and don't crash."""
    generator = OnboardingGenerator()
    
    mod_a = ArchitectureModule("A", ["a.py"], "a.py")
    mod_b = ArchitectureModule("B", ["b.py"], "b.py")
    mod_c = ArchitectureModule("C", ["c.py"], "c.py")
    
    # A -> B -> A (Cycle)
    mod_a.dependencies = [mod_b.id]
    mod_b.dependencies = [mod_a.id]
    
    # C depends on A
    mod_c.dependencies = [mod_a.id]
    
    modules = [mod_a, mod_b, mod_c]
    
    # Bottom up
    steps = generator.generate_path(modules, strategy="bottom_up")
    
    assert len(steps) == 3
    # A and B are foundational (due to cycle they are together). C depends on them.
    # So A & B should come before C.
    names = [s.module_name for s in steps]
    assert names.index("C") == 2
    assert set(names[:2]) == {"A", "B"}

    print("  PASS: test_circular_dependency_handling")


if __name__ == "__main__":
    print("Running onboarding generator tests...\n")
    tests = [
        test_topological_sort_bottom_up,
        test_circular_dependency_handling,
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
