"""
Parsing Service for CodeCompass.

Orchestrates tree-sitter parsing across an entire cloned repository.
Walks the file tree, identifies parseable files, runs the appropriate
language extractor, and returns a consolidated analysis result.
"""

from __future__ import annotations
import os
import time
from pathlib import Path
from typing import Any

from services.parser.treesitter_manager import manager as ts_manager
from services.parser.python_extractor import extract_python
from services.parser.js_ts_extractor import extract_js_ts


# Files/directories to always skip
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".cache", ".tox", ".mypy_cache",
    ".pytest_cache", "egg-info", ".eggs", "coverage",
}

SKIP_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".DS_Store", "Thumbs.db",
}

# Maximum file size we'll attempt to parse (500 KB)
MAX_FILE_SIZE = 500_000


class ParsedFile:
    """Result of parsing a single source file."""
    __slots__ = (
        "path", "relative_path", "language", "line_count",
        "imports", "functions", "classes", "exports", "error",
    )

    def __init__(
        self,
        path: str,
        relative_path: str,
        language: str,
        line_count: int = 0,
        imports: list[dict] | None = None,
        functions: list[dict] | None = None,
        classes: list[dict] | None = None,
        exports: list[dict] | None = None,
        error: str | None = None,
    ):
        self.path = path
        self.relative_path = relative_path
        self.language = language
        self.line_count = line_count
        self.imports = imports or []
        self.functions = functions or []
        self.classes = classes or []
        self.exports = exports or []
        self.error = error

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "path": self.path,
            "relative_path": self.relative_path,
            "language": self.language,
            "line_count": self.line_count,
            "imports": self.imports,
            "functions": self.functions,
            "classes": self.classes,
            "exports": self.exports,
        }
        if self.error:
            d["error"] = self.error
        return d


class RepositoryAnalysis:
    """Full analysis result for a repository."""

    def __init__(self):
        self.files: list[ParsedFile] = []
        self.stats: dict[str, Any] = {}
        self.duration_seconds: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_files_parsed": len(self.files),
            "stats": self.stats,
            "duration_seconds": round(self.duration_seconds, 2),
            "files": [f.to_dict() for f in self.files],
        }


class ParsingService:
    """
    Service to parse all source files in a cloned repository using tree-sitter.
    """

    def parse_repository(self, repo_path: str) -> RepositoryAnalysis:
        """
        Walk the repository at `repo_path`, parse every supported file,
        and return a RepositoryAnalysis.
        """
        start = time.time()
        analysis = RepositoryAnalysis()
        repo_root = Path(repo_path)

        if not repo_root.exists():
            raise FileNotFoundError(f"Repository path does not exist: {repo_path}")

        language_stats: dict[str, int] = {}
        total_lines = 0
        total_functions = 0
        total_classes = 0
        total_imports = 0
        errors = 0

        for dirpath, dirnames, filenames in os.walk(repo_root):
            # Filter out skip directories in-place (modifying dirnames
            # prevents os.walk from descending into them)
            dirnames[:] = [
                d for d in dirnames
                if d not in SKIP_DIRS and not d.startswith(".")
            ]

            for filename in filenames:
                if filename in SKIP_FILES:
                    continue

                full_path = os.path.join(dirpath, filename)
                relative_path = os.path.relpath(full_path, repo_root).replace("\\", "/")

                # Check if we can parse this file type
                lang = ts_manager.language_for_file(filename)
                if lang is None:
                    continue

                # Check file size
                try:
                    size = os.path.getsize(full_path)
                    if size > MAX_FILE_SIZE:
                        continue
                    if size == 0:
                        continue
                except OSError:
                    continue

                # Parse
                parsed = self._parse_file(full_path, relative_path, lang)
                analysis.files.append(parsed)

                # Aggregate stats
                language_stats[lang] = language_stats.get(lang, 0) + 1
                total_lines += parsed.line_count
                total_functions += len(parsed.functions)
                total_classes += len(parsed.classes)
                total_imports += len(parsed.imports)
                if parsed.error:
                    errors += 1

        analysis.stats = {
            "languages": language_stats,
            "total_lines": total_lines,
            "total_functions": total_functions,
            "total_classes": total_classes,
            "total_imports": total_imports,
            "parse_errors": errors,
        }
        analysis.duration_seconds = time.time() - start

        return analysis

    def _parse_file(
        self, full_path: str, relative_path: str, lang: str
    ) -> ParsedFile:
        """Parse a single file and return a ParsedFile result."""
        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                source = f.read()

            source_bytes = source.encode("utf-8")
            line_count = source.count("\n") + 1

            parser = ts_manager.get_parser(lang)
            if parser is None:
                return ParsedFile(
                    path=full_path,
                    relative_path=relative_path,
                    language=lang,
                    line_count=line_count,
                    error=f"No parser available for language: {lang}",
                )

            tree = parser.parse(source_bytes)
            root = tree.root_node

            # Dispatch to the appropriate language extractor
            if lang == "python":
                extracted = extract_python(root, source_bytes)
            elif lang in ("javascript", "typescript", "tsx"):
                extracted = extract_js_ts(root, source_bytes)
            else:
                extracted = {"imports": [], "functions": [], "classes": [], "exports": []}

            return ParsedFile(
                path=full_path,
                relative_path=relative_path,
                language=lang,
                line_count=line_count,
                imports=extracted.get("imports", []),
                functions=extracted.get("functions", []),
                classes=extracted.get("classes", []),
                exports=extracted.get("exports", []),
            )

        except Exception as e:
            return ParsedFile(
                path=full_path,
                relative_path=relative_path,
                language=lang,
                error=str(e),
            )

    def parse_single_file(self, file_path: str) -> ParsedFile | None:
        """Parse a single file by path (used for on-demand analysis)."""
        p = Path(file_path)
        if not p.exists():
            return None

        lang = ts_manager.language_for_file(p.name)
        if lang is None:
            return None

        return self._parse_file(str(p), p.name, lang)
