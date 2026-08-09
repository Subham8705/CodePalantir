"""
Onboarding Generator Module.

Uses graph topography to generate reading paths through a repository.
"""

from typing import List, Dict, Any, Tuple
import networkx as nx

from services.analysis.architecture_detector import ArchitectureModule


class OnboardingStep:
    """Represents a step in the onboarding reading path."""
    def __init__(self, module_id: str, module_name: str, core_file: str, reason: str):
        self.module_id = module_id
        self.module_name = module_name
        self.core_file = core_file
        self.reason = reason
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "module_id": self.module_id,
            "module_name": self.module_name,
            "core_file": self.core_file,
            "reason": self.reason
        }


class OnboardingGenerator:
    """Generates reading paths using topological sort."""

    def generate_path(self, modules: List[ArchitectureModule], strategy: str = "bottom_up") -> List[OnboardingStep]:
        """
        Generates an onboarding path.
        Strategy can be 'bottom_up' (foundational first) or 'top_down' (entrypoints first).
        """
        if not modules:
            return []

        # 1. Build a Directed Graph of Modules
        module_graph = nx.DiGraph()
        
        # Add nodes
        for mod in modules:
            module_graph.add_node(mod.id, data=mod)
            
        # Add edges (dependencies)
        for mod in modules:
            for dep_id in mod.dependencies:
                # Mod depends on Dep -> Edge from Dep to Mod implies "Read Dep before Mod" (for bottom_up)
                # But in standard dependency graph, Edge is Mod -> Dep.
                # Let's add Edge: Mod -> Dep
                module_graph.add_edge(mod.id, dep_id)

        # 2. Condense the graph to a DAG
        # Real codebases have circular dependencies (ModA -> ModB -> ModA)
        # Topological sort requires a Directed Acyclic Graph (DAG)
        dag = nx.condensation(module_graph)
        
        # nx.condensation returns a new graph where each node is an int (representing a strongly connected component)
        # The 'members' attribute contains the original node IDs.
        
        # 3. Topological Sort
        try:
            # Sort the condensed DAG. 
            # A topological sort of Mod -> Dep will put independent nodes last.
            # E.g. A -> B means A depends on B. Topological sort returns [A, B].
            # If we want bottom_up (B first), we reverse it.
            sorted_scc = list(nx.topological_sort(dag))
            if strategy == "bottom_up":
                sorted_scc.reverse()
        except nx.NetworkXUnfeasible:
            # Should not happen on a condensed graph, but just in case
            sorted_scc = list(dag.nodes())

        # 4. Extract Modules
        ordered_modules = []
        for scc_node in sorted_scc:
            # Members is a set of original module IDs
            members = dag.nodes[scc_node]['members']
            # If a cycle exists, an SCC will have multiple members. 
            # We just sort them alphabetically by name for deterministic output.
            scc_mods = [module_graph.nodes[m_id]['data'] for m_id in members]
            scc_mods.sort(key=lambda m: m.name)
            ordered_modules.extend(scc_mods)
            
        # 5. Build a quick lookup: module_id -> module
        module_lookup = {mod.id: mod for mod in ordered_modules}
        
        # 6. Build Steps
        steps = []
        for idx, mod in enumerate(ordered_modules):
            reason = self._generate_reason(idx, mod, ordered_modules, module_lookup, strategy)
                    
            steps.append(OnboardingStep(
                module_id=mod.id,
                module_name=mod.name,
                core_file=mod.core_file or "",
                reason=reason
            ))

        return steps

    def _generate_reason(
        self, idx: int, mod: ArchitectureModule, 
        ordered: List[ArchitectureModule],
        lookup: Dict[str, 'ArchitectureModule'],
        strategy: str
    ) -> str:
        """Generate a context-aware reason for why this module appears at this position."""
        dep_names = []
        for dep_id in mod.dependencies:
            dep_mod = lookup.get(dep_id)
            if dep_mod:
                dep_names.append(dep_mod.name)
        
        # Identify who depends on this module (dependents)
        dependent_names = []
        for other in ordered:
            if mod.id in other.dependencies:
                dep_other = lookup.get(other.id)
                if dep_other:
                    dependent_names.append(dep_other.name)
        
        file_count = len(mod.files)
        core = mod.core_file.split("/")[-1] if mod.core_file else None
        
        parts = []
        
        # Position-based intro
        if idx == 0:
            if strategy == "bottom_up":
                parts.append("Start here — this is a foundational module with no internal dependencies.")
            else:
                parts.append("Start here — this is a top-level entry point that orchestrates the system.")
        elif idx <= 2:
            parts.append("Read this early — it's a low-level building block used by many other modules.")
        
        # Core file hint
        if core:
            parts.append(f"Focus on `{core}` as the main entry point ({file_count} file{'s' if file_count != 1 else ''} total).")
        else:
            parts.append(f"Contains {file_count} file{'s' if file_count != 1 else ''}.")

        # Dependency reasoning
        if dep_names:
            if len(dep_names) <= 3:
                names_str = ", ".join(dep_names)
                parts.append(f"Builds on top of: {names_str}. Read those first to understand how this module works.")
            else:
                names_str = ", ".join(dep_names[:3])
                parts.append(f"Depends on {len(dep_names)} modules including {names_str}.")
        else:
            if idx > 0:
                parts.append("This is a standalone module with no internal dependencies — safe to read independently.")
        
        # Why it matters (dependents)
        if dependent_names:
            if len(dependent_names) <= 3:
                dep_str = ", ".join(dependent_names)
                parts.append(f"Understanding this unlocks: {dep_str}.")
            else:
                dep_str = ", ".join(dependent_names[:2])
                parts.append(f"Critical module — {len(dependent_names)} other modules depend on it, including {dep_str}.")
        
        return " ".join(parts)
