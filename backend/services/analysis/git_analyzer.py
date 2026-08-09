"""
Git Analyzer Module.

Extracts churn and ownership statistics from a local git repository.
"""

import subprocess
import os
from collections import Counter, defaultdict
from typing import Dict, List, Any, Optional
import concurrent.futures


class FileGitStats:
    """Represents Git statistics for a single file."""
    def __init__(self, relative_path: str):
        self.relative_path = relative_path
        self.churn_count = 0  # Number of commits touching this file
        self.author_lines: Dict[str, int] = Counter()  # author -> lines of code
        self.primary_owner: Optional[str] = None
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "relative_path": self.relative_path,
            "churn_count": self.churn_count,
            "author_lines": dict(self.author_lines),
            "primary_owner": self.primary_owner
        }


class GitAnalyzer:
    """Extracts file history and ownership using Git commands."""
    
    def __init__(self, max_workers: int = 16):
        self.max_workers = max_workers
        
    def analyze_repository(self, repo_path: str, files: List[str]) -> Dict[str, FileGitStats]:
        """
        Analyzes the specified files in the given git repository.
        Returns a dictionary mapping relative paths to FileGitStats.
        """
        stats_map = {f.replace("\\", "/"): FileGitStats(f.replace("\\", "/")) for f in files}
        
        self._calculate_churn(repo_path, stats_map)
        self._calculate_blame(repo_path, stats_map)
        
        # Calculate primary owners
        for stats in stats_map.values():
            if stats.author_lines:
                stats.primary_owner = max(stats.author_lines.items(), key=lambda x: x[1])[0]
                
        return stats_map
        
    def _calculate_churn(self, repo_path: str, stats_map: Dict[str, FileGitStats]):
        """
        Calculates how many times each file was modified across all commits.
        """
        try:
            # git log --name-only --format="" prints just the filenames modified in each commit
            result = subprocess.run(
                ["git", "log", "--name-only", "--format="],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
                encoding="utf-8",
                errors="replace"
            )
            
            # Count occurrences of each file
            file_counts = Counter()
            for line in result.stdout.splitlines():
                line = line.strip()
                if line:
                    file_counts[line] += 1
                    
            # Populate the stats map
            for file_path, stats in stats_map.items():
                stats.churn_count = file_counts.get(file_path, 0)
                
        except subprocess.CalledProcessError as e:
            print(f"Warning: Failed to calculate churn for {repo_path}: {e}")

    def _calculate_blame(self, repo_path: str, stats_map: Dict[str, FileGitStats]):
        """
        Calculates line authorship for all files in parallel.
        """
        files_to_blame = list(stats_map.keys())
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Map future to filename
            future_to_file = {
                executor.submit(self._blame_file, repo_path, file_path): file_path 
                for file_path in files_to_blame
            }
            
            for future in concurrent.futures.as_completed(future_to_file):
                file_path = future_to_file[future]
                try:
                    author_lines = future.result()
                    stats_map[file_path].author_lines = author_lines
                except Exception as e:
                    print(f"Warning: Failed to blame {file_path}: {e}")

    def _blame_file(self, repo_path: str, file_path: str) -> Counter:
        """
        Runs git blame on a single file and counts lines per author.
        Returns a Counter mapping author names to line counts.
        """
        author_counts = Counter()
        
        try:
            result = subprocess.run(
                ["git", "blame", "--line-porcelain", file_path],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
                encoding="utf-8",
                errors="replace"
            )
            
            for line in result.stdout.splitlines():
                if line.startswith("author "):
                    author_name = line[len("author "):].strip()
                    if author_name != "Not Committed Yet":
                        author_counts[author_name] += 1
                        
        except subprocess.CalledProcessError:
            # File might be new, untracked, or renamed/deleted
            pass
            
        return author_counts

    def aggregate_module_stats(self, modules: List['ArchitectureModule'], git_stats: Dict[str, FileGitStats]):
        """
        Aggregates file-level git stats to the module level.
        Adds 'churn_count' and 'primary_owner' to each ArchitectureModule object.
        """
        for mod in modules:
            total_churn = 0
            mod_author_lines = Counter()
            
            for file_path in mod.files:
                stats = git_stats.get(file_path)
                if stats:
                    total_churn += stats.churn_count
                    mod_author_lines.update(stats.author_lines)
                    
            mod.churn_count = total_churn
            if mod_author_lines:
                mod.primary_owner = max(mod_author_lines.items(), key=lambda x: x[1])[0]
            else:
                mod.primary_owner = None
