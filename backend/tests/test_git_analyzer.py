"""
Unit tests for the Git Analyzer.
"""

import sys
import os
from unittest.mock import patch, MagicMock
from collections import Counter

# Add backend dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.analysis.git_analyzer import GitAnalyzer, FileGitStats

# Dummy ArchitectureModule class for testing
class ArchitectureModule:
    def __init__(self, name, files):
        self.name = name
        self.files = files
        self.churn_count = 0
        self.primary_owner = None


def test_churn_parsing():
    """Test that git log output is correctly parsed into churn stats."""
    analyzer = GitAnalyzer()
    
    mock_git_log_output = "src/main.py\nsrc/utils.py\nsrc/main.py\n\nsrc/tests.py\nsrc/main.py\n"
    
    with patch("subprocess.run") as mock_run:
        mock_result = MagicMock()
        mock_result.stdout = mock_git_log_output
        mock_run.return_value = mock_result
        
        stats_map = {
            "src/main.py": FileGitStats("src/main.py"),
            "src/utils.py": FileGitStats("src/utils.py"),
            "src/tests.py": FileGitStats("src/tests.py"),
            "src/unknown.py": FileGitStats("src/unknown.py"),
        }
        
        analyzer._calculate_churn("/fake/repo", stats_map)
        
        assert stats_map["src/main.py"].churn_count == 3
        assert stats_map["src/utils.py"].churn_count == 1
        assert stats_map["src/tests.py"].churn_count == 1
        assert stats_map["src/unknown.py"].churn_count == 0
        
    print("  PASS: test_churn_parsing")


def test_blame_parsing():
    """Test that git blame porcelain output is correctly parsed into author stats."""
    analyzer = GitAnalyzer()
    
    mock_blame_output = """
hash1 1 1 1
author Alice Smith
author-mail <alice@example.com>
author-time 1600000000
summary feat: initial
\tdef main():

hash2 2 2 1
author Bob Jones
author-mail <bob@example.com>
author-time 1600000010
summary fix: bug
\t    pass

hash3 3 3 1
author Alice Smith
author-mail <alice@example.com>
author-time 1600000020
summary fix: another bug
\t    return True
"""
    
    with patch("subprocess.run") as mock_run:
        mock_result = MagicMock()
        mock_result.stdout = mock_blame_output
        mock_run.return_value = mock_result
        
        counts = analyzer._blame_file("/fake/repo", "src/main.py")
        
        assert counts["Alice Smith"] == 2
        assert counts["Bob Jones"] == 1
        assert len(counts) == 2

    print("  PASS: test_blame_parsing")


def test_module_aggregation():
    """Test aggregation of file stats into module stats."""
    analyzer = GitAnalyzer()
    
    # Setup FileGitStats
    stats1 = FileGitStats("a.py")
    stats1.churn_count = 10
    stats1.author_lines = Counter({"Alice": 50, "Bob": 20})
    
    stats2 = FileGitStats("b.py")
    stats2.churn_count = 5
    stats2.author_lines = Counter({"Bob": 40, "Charlie": 10})
    
    stats_map = {"a.py": stats1, "b.py": stats2}
    
    # Setup ArchitectureModule
    mod = ArchitectureModule("Core", ["a.py", "b.py"])
    
    analyzer.aggregate_module_stats([mod], stats_map)
    
    assert mod.churn_count == 15
    # Alice: 50, Bob: 60, Charlie: 10 => Bob should be primary owner
    assert mod.primary_owner == "Bob"

    print("  PASS: test_module_aggregation")


if __name__ == "__main__":
    print("Running git analyzer tests...\n")
    tests = [
        test_churn_parsing,
        test_blame_parsing,
        test_module_aggregation,
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
