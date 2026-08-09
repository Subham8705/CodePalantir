"""
Import resolution module.

Maps raw import strings from source code to actual file paths within a repository.
Supports Python and JS/TS resolution strategies.
"""

import os
from typing import Set

class ImportResolver:
    """
    Resolves import paths to actual file paths in a repository.
    """
    
    def __init__(self, repo_path: str, available_files: Set[str]):
        """
        :param repo_path: Absolute path to the repository root.
        :param available_files: A set of relative file paths that exist in the repo 
                                (e.g. {"src/main.py", "src/utils.py"}).
        """
        self.repo_path = repo_path
        self.available_files = available_files

    def resolve(self, import_str: str, source_file_rel: str, language: str) -> str | None:
        """
        Attempt to resolve an import string to a file in `available_files`.
        
        :param import_str: The raw import module name (e.g. "pathlib", ".utils", "../components/Button")
        :param source_file_rel: The relative path of the file containing the import.
        :param language: "python", "javascript", "typescript", etc.
        :return: The relative path of the imported file, or None if it cannot be resolved.
        """
        if not import_str:
            return None

        # Sanitize path separators for consistency
        source_file_rel = source_file_rel.replace("\\", "/")
        
        if language == "python":
            return self._resolve_python(import_str, source_file_rel)
        elif language in ("javascript", "typescript", "tsx"):
            return self._resolve_js_ts(import_str, source_file_rel)
            
        return None

    def _resolve_python(self, import_str: str, source_file_rel: str) -> str | None:
        """Resolve a Python import."""
        # E.g., `import os` -> standard library or third-party, unlikely to be in our repo unless shadowed
        # E.g., `from app.models import User` -> import_str = "app.models"
        # E.g., `from .utils import helper` -> import_str = ".utils"
        # E.g., `from .. import config` -> import_str = ".."

        source_dir = os.path.dirname(source_file_rel).replace("\\", "/")
        if source_dir == "":
            source_dir = "."

        # Handle explicit relative imports (starts with '.')
        if import_str.startswith("."):
            dots = 0
            for char in import_str:
                if char == ".":
                    dots += 1
                else:
                    break
            
            # Navigate up the directory tree
            parts = source_dir.split("/") if source_dir != "." else []
            for _ in range(dots - 1):
                if parts:
                    parts.pop()
                else:
                    # Going above repo root
                    return None
            
            base_dir = "/".join(parts) if parts else ""
            remainder = import_str[dots:]
            if remainder:
                module_path = f"{base_dir}/{remainder}".strip("/")
            else:
                module_path = base_dir

            return self._check_python_module(module_path)

        # Handle absolute imports
        # Python module paths map directly to directory/file structures
        module_path = import_str.replace(".", "/")
        
        # 1. Check from the repo root
        match = self._check_python_module(module_path)
        if match:
            return match
            
        # 2. Check from common src directories if not found from root
        for common_dir in ["src", "app", "lib"]:
            match = self._check_python_module(f"{common_dir}/{module_path}")
            if match:
                return match
                
        return None

    def _check_python_module(self, path: str) -> str | None:
        """Check if a Python module path exists as a file or __init__.py directory."""
        path = path.replace("\\", "/")
        
        # Is it a direct python file?
        file_path = f"{path}.py"
        if file_path in self.available_files:
            return file_path
            
        # Is it a directory with an __init__.py?
        init_path = f"{path}/__init__.py"
        if init_path in self.available_files:
            return init_path
            
        return None

    def _resolve_js_ts(self, import_str: str, source_file_rel: str) -> str | None:
        """Resolve a JS/TS import."""
        # e.g., `import React from 'react'` (third-party)
        # e.g., `import { helper } from './utils'` (relative)
        # e.g., `import { helper } from '@/utils'` (alias)

        source_dir = os.path.dirname(source_file_rel).replace("\\", "/")
        if source_dir == "":
            source_dir = "."
            
        # Handle relative imports
        if import_str.startswith("./") or import_str.startswith("../"):
            import_parts = import_str.split("/")
            source_parts = source_dir.split("/") if source_dir != "." else []
            
            for part in import_parts:
                if part == ".":
                    continue
                elif part == "..":
                    if source_parts:
                        source_parts.pop()
                    else:
                        return None
                else:
                    source_parts.append(part)
                    
            target_base = "/".join(source_parts)
            return self._check_js_ts_module(target_base)
            
        # Handle alias imports (very common: @/components/Button)
        if import_str.startswith("@/"):
            # Assume @ maps to src or the root
            target_base = import_str[2:]
            
            # Try src/
            match = self._check_js_ts_module(f"src/{target_base}")
            if match:
                return match
                
            # Try root
            match = self._check_js_ts_module(target_base)
            if match:
                return match
                
        # Handle tilde alias (~/)
        if import_str.startswith("~/"):
            target_base = import_str[2:]
            match = self._check_js_ts_module(f"src/{target_base}")
            if match:
                return match
            match = self._check_js_ts_module(target_base)
            if match:
                return match

        # Third party dependencies (or unhandled aliases)
        return None

    def _check_js_ts_module(self, path: str) -> str | None:
        """Check if a JS/TS module path exists with common extensions or as an index file."""
        path = path.replace("\\", "/")
        
        # 1. Exact match (e.g. import './utils.js')
        if path in self.available_files:
            return path
            
        # 2. Check extensions
        extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]
        for ext in extensions:
            if f"{path}{ext}" in self.available_files:
                return f"{path}{ext}"
                
        # 3. Check directory index files
        for ext in extensions:
            if f"{path}/index{ext}" in self.available_files:
                return f"{path}/index{ext}"
                
        return None
