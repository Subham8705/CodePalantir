"""
Graph Builder Module.

Builds a NetworkX directed graph from a RepositoryAnalysis result.
"""

import networkx as nx
from typing import Dict, Any, List

from services.parser.parsing_service import RepositoryAnalysis, ParsedFile
from services.analysis.import_resolver import ImportResolver


class GraphBuilder:
    """Builds dependency graphs using NetworkX."""

    def build_dependency_graph(self, repo_path: str, analysis: RepositoryAnalysis) -> nx.DiGraph:
        """
        Builds a directed graph where nodes are relative file paths and edges 
        are imports from one file to another.
        """
        graph = nx.DiGraph()
        
        # 1. Gather all available files to power the resolver
        available_files = {f.relative_path.replace("\\", "/") for f in analysis.files}
        resolver = ImportResolver(repo_path, available_files)
        
        # 2. Add all files as nodes with their metadata
        for f in analysis.files:
            rel_path = f.relative_path.replace("\\", "/")
            graph.add_node(
                rel_path,
                language=f.language,
                line_count=f.line_count,
                functions=len(f.functions),
                classes=len(f.classes),
            )
            
        # 3. Add edges based on imports
        for f in analysis.files:
            source_rel_path = f.relative_path.replace("\\", "/")
            
            for imp in f.imports:
                module_name = imp.get("module")
                if not module_name:
                    continue
                    
                target_rel_path = resolver.resolve(module_name, source_rel_path, f.language)
                
                if target_rel_path:
                    # Increment weight if multiple imports point to the same file
                    if graph.has_edge(source_rel_path, target_rel_path):
                        graph[source_rel_path][target_rel_path]['weight'] += 1
                    else:
                        graph.add_edge(source_rel_path, target_rel_path, weight=1)
                        
        return graph

    def get_graph_stats(self, graph: nx.DiGraph) -> Dict[str, Any]:
        """Return basic statistics about the generated graph."""
        if len(graph) == 0:
            return {"nodes": 0, "edges": 0}
            
        # Calculate in-degree (how many files depend on this file)
        in_degrees = dict(graph.in_degree())
        # Sort files by in-degree (descending)
        top_dependencies = sorted(in_degrees.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "nodes": graph.number_of_nodes(),
            "edges": graph.number_of_edges(),
            "top_dependencies": [{"file": f, "imported_by_count": count} for f, count in top_dependencies if count > 0]
        }
