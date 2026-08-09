"""
Python-specific AST extractor.

Uses tree-sitter to walk a Python AST and extract:
  - import statements (import X / from X import Y)
  - function definitions
  - class definitions
  - top-level assignments (module-level constants)
"""

from __future__ import annotations
from tree_sitter import Node
from typing import Any


def extract_python(root: Node, source_bytes: bytes) -> dict[str, Any]:
    """
    Walk the Python AST root and return a structured dict.

    Returns:
        {
            "imports": [{"module": "os", "names": ["path"], "alias": None, ...}],
            "functions": [{"name": "foo", "line": 10, "params": [...], "decorators": [...]}],
            "classes": [{"name": "Bar", "line": 20, "methods": [...], "bases": [...]}],
            "exports": [],  # Python doesn't have explicit exports; __all__ is handled later
        }
    """
    imports: list[dict] = []
    functions: list[dict] = []
    classes: list[dict] = []

    for child in root.children:
        if child.type == "import_statement":
            imports.append(_parse_import(child, source_bytes))
        elif child.type == "import_from_statement":
            imports.append(_parse_from_import(child, source_bytes))
        elif child.type == "function_definition":
            functions.append(_parse_function(child, source_bytes))
        elif child.type == "class_definition":
            classes.append(_parse_class(child, source_bytes))
        elif child.type == "decorated_definition":
            # A decorated function or class
            for sub in child.children:
                if sub.type == "function_definition":
                    func = _parse_function(sub, source_bytes)
                    func["decorators"] = _parse_decorators(child, source_bytes)
                    functions.append(func)
                elif sub.type == "class_definition":
                    cls = _parse_class(sub, source_bytes)
                    cls["decorators"] = _parse_decorators(child, source_bytes)
                    classes.append(cls)

    return {
        "imports": imports,
        "functions": functions,
        "classes": classes,
        "exports": [],
    }


def _text(node: Node | None, source_bytes: bytes) -> str:
    """Extract the text of a node."""
    if node is None:
        return ""
    return source_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="replace")


def _parse_import(node: Node, source_bytes: bytes) -> dict:
    """Parse `import X` or `import X as Y`."""
    names: list[str] = []
    alias: str | None = None

    for child in node.children:
        if child.type == "dotted_name":
            names.append(_text(child, source_bytes))
        elif child.type == "aliased_import":
            dotted = child.child_by_field_name("name")
            alias_node = child.child_by_field_name("alias")
            if dotted:
                names.append(_text(dotted, source_bytes))
            if alias_node:
                alias = _text(alias_node, source_bytes)

    return {
        "type": "import",
        "module": names[0] if names else "",
        "names": names,
        "alias": alias,
        "line": node.start_point[0] + 1,
    }


def _parse_from_import(node: Node, source_bytes: bytes) -> dict:
    """Parse `from X import Y, Z`."""
    module = ""
    names: list[str] = []

    found_from = False
    found_import = False

    for child in node.children:
        if child.type == "from":
            found_from = True
        elif child.type == "import":
            found_import = True
        elif child.type == "dotted_name" and found_from and not found_import:
            module = _text(child, source_bytes)
        elif child.type == "dotted_name" and found_import:
            names.append(_text(child, source_bytes))
        elif child.type == "relative_import":
            module = _text(child, source_bytes)
        elif child.type == "aliased_import":
            dotted = child.child_by_field_name("name")
            if dotted:
                names.append(_text(dotted, source_bytes))
        elif child.type == "wildcard_import":
            names.append("*")

    return {
        "type": "from_import",
        "module": module,
        "names": names,
        "alias": None,
        "line": node.start_point[0] + 1,
    }


def _parse_function(node: Node, source_bytes: bytes) -> dict:
    """Extract function metadata."""
    name_node = node.child_by_field_name("name")
    params_node = node.child_by_field_name("parameters")

    params: list[str] = []
    if params_node:
        for p in params_node.children:
            if p.type == "identifier":
                params.append(_text(p, source_bytes))
            elif p.type in ("typed_parameter", "default_parameter", "typed_default_parameter"):
                name_child = p.child_by_field_name("name")
                if name_child:
                    params.append(_text(name_child, source_bytes))
                else:
                    for sub in p.children:
                        if sub.type == "identifier":
                            params.append(_text(sub, source_bytes))
                            break

    return_type = None
    ret_node = node.child_by_field_name("return_type")
    if ret_node:
        return_type = _text(ret_node, source_bytes)

    # Count lines in the function body
    body_node = node.child_by_field_name("body")
    line_count = 0
    if body_node:
        line_count = body_node.end_point[0] - body_node.start_point[0] + 1

    return {
        "name": _text(name_node, source_bytes),
        "line": node.start_point[0] + 1,
        "end_line": node.end_point[0] + 1,
        "params": params,
        "return_type": return_type,
        "decorators": [],
        "line_count": line_count,
    }


def _parse_class(node: Node, source_bytes: bytes) -> dict:
    """Extract class metadata including methods and base classes."""
    name_node = node.child_by_field_name("name")

    # Superclasses
    bases: list[str] = []
    superclasses_node = node.child_by_field_name("superclasses")
    if superclasses_node:
        for child in superclasses_node.children:
            if child.type in ("identifier", "attribute"):
                bases.append(_text(child, source_bytes))

    # Methods
    methods: list[dict] = []
    body_node = node.child_by_field_name("body")
    if body_node:
        for child in body_node.children:
            if child.type == "function_definition":
                methods.append(_parse_function(child, source_bytes))
            elif child.type == "decorated_definition":
                for sub in child.children:
                    if sub.type == "function_definition":
                        func = _parse_function(sub, source_bytes)
                        func["decorators"] = _parse_decorators(child, source_bytes)
                        methods.append(func)

    return {
        "name": _text(name_node, source_bytes),
        "line": node.start_point[0] + 1,
        "end_line": node.end_point[0] + 1,
        "bases": bases,
        "methods": methods,
        "decorators": [],
    }


def _parse_decorators(decorated_node: Node, source_bytes: bytes) -> list[str]:
    """Extract decorator names from a decorated_definition node."""
    decorators: list[str] = []
    for child in decorated_node.children:
        if child.type == "decorator":
            # The decorator text minus the '@'
            dec_text = _text(child, source_bytes).lstrip("@").strip()
            decorators.append(dec_text)
    return decorators
