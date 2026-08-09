"""
Architecture Discovery Module.

Groups files into logical modules using community detection heuristics.
"""

import os
from collections import Counter
from typing import List, Dict, Any, Set
import networkx as nx
import uuid


class ArchitectureModule:
    """Represents a discovered architectural module."""
    def __init__(self, name: str, files: List[str]):
        self.id = str(uuid.uuid4())
        self.name = name
        self.files = files
        self.dependencies: List[str] = []  # IDs of modules this module depends on
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "files": self.files,
            "dependencies": self.dependencies,
        }


class ArchitectureDetector:
    """Detects architecture modules from a file dependency graph."""

    def detect_modules(self, file_graph: nx.DiGraph) -> List[ArchitectureModule]:
        """
        Detects modules using the Louvain community detection algorithm.
        """
        if file_graph.number_of_nodes() == 0:
            return []

        # Louvain works best on undirected graphs for modularity maximization
        undirected_graph = file_graph.to_undirected()
        
        try:
            # networkx 2.6+ has louvain_communities
            communities = nx.community.louvain_communities(undirected_graph, weight='weight')
        except AttributeError:
            # Fallback if louvain is not available in the installed networkx version
            communities = list(nx.community.greedy_modularity_communities(undirected_graph, weight='weight'))

        modules: List[ArchitectureModule] = []
        
        for idx, community in enumerate(communities):
            files = list(community)
            if not files:
                continue
                
            name = self._generate_module_name(files, file_graph)
            
            # Prevent duplicate names
            base_name = name
            counter = 1
            while any(m.name == name for m in modules):
                name = f"{base_name} {counter}"
                counter += 1
                
            modules.append(ArchitectureModule(name=name, files=files))

        # Calculate inter-module dependencies
        self._calculate_module_dependencies(modules, file_graph)
        
        # Sort modules by size (largest first)
        modules.sort(key=lambda m: len(m.files), reverse=True)
        return modules

    def _generate_module_name(self, files: List[str], graph: nx.DiGraph) -> str:
        """
        Heuristic to name a module.
        1. Find the most common directory among the files.
        2. If scattered, use the file with the highest in-degree (most depended upon).
        """
        if len(files) == 1:
            # Single file module
            filename = os.path.basename(files[0])
            name, _ = os.path.splitext(filename)
            return name.title()

        # Extract all directories
        dirs = []
        for f in files:
            dirname = os.path.dirname(f).replace("\\", "/")
            if dirname:
                dirs.append(dirname)
                
        if dirs:
            # Count directory occurrences
            dir_counts = Counter(dirs)
            most_common_dir, count = dir_counts.most_common(1)[0]
            
            # If the most common dir represents more than 40% of the files, use it
            if count / len(files) >= 0.4:
                # E.g., "src/auth" -> "Auth"
                parts = [p for p in most_common_dir.split("/") if p not in (".", "src", "app", "lib", "components")]
                if parts:
                    return parts[-1].title().replace("-", " ").replace("_", " ")

        # Fallback: Find the "core" file of this module (highest in-degree within the module)
        # Calculate internal in-degrees
        internal_in_degrees = {}
        for f in files:
            # How many edges come from OTHER files in this SAME module?
            in_edges = [u for u, v in graph.in_edges(f) if u in files and u != v]
            internal_in_degrees[f] = len(in_edges)
            
        core_file = max(internal_in_degrees.items(), key=lambda x: x[1])[0]
        filename = os.path.basename(core_file)
        
        # Special case for index files or __init__.py
        if filename in ("index.ts", "index.js", "__init__.py"):
            dirname = os.path.basename(os.path.dirname(core_file))
            if dirname and dirname not in (".", "src", "app"):
                return f"{dirname.title()} Core"
                
        name, _ = os.path.splitext(filename)
        return f"{name.title()} Module"

    def _calculate_module_dependencies(self, modules: List[ArchitectureModule], graph: nx.DiGraph):
        """
        Calculates which modules depend on which other modules.
        Module A depends on Module B if any file in A imports any file in B.
        """
        file_to_module = {}
        for mod in modules:
            for f in mod.files:
                file_to_module[f] = mod.id
                
        for mod in modules:
            deps: Set[str] = set()
            for f in mod.files:
                # Get all outgoing edges (imports) from this file
                for _, target in graph.out_edges(f):
                    target_mod_id = file_to_module.get(target)
                    if target_mod_id and target_mod_id != mod.id:
                        deps.add(target_mod_id)
            mod.dependencies = list(deps)
