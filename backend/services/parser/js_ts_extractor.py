"""
JavaScript / TypeScript / TSX AST extractor.

Uses tree-sitter to walk a JS/TS AST and extract:
  - import statements (ES6 import / require())
  - export statements (named, default)
  - function declarations and arrow functions
  - class declarations
"""

from __future__ import annotations
from tree_sitter import Node
from typing import Any


def extract_js_ts(root: Node, source_bytes: bytes) -> dict[str, Any]:
    """
    Walk the JS/TS AST root and return a structured dict.

    Returns:
        {
            "imports": [...],
            "functions": [...],
            "classes": [...],
            "exports": [...],
        }
    """
    imports: list[dict] = []
    functions: list[dict] = []
    classes: list[dict] = []
    exports: list[dict] = []

    _walk_top_level(root, source_bytes, imports, functions, classes, exports)

    return {
        "imports": imports,
        "functions": functions,
        "classes": classes,
        "exports": exports,
    }


def _text(node: Node | None, source_bytes: bytes) -> str:
    if node is None:
        return ""
    return source_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="replace")


def _walk_top_level(
    node: Node,
    source_bytes: bytes,
    imports: list[dict],
    functions: list[dict],
    classes: list[dict],
    exports: list[dict],
):
    """Walk top-level statements (program/module children)."""
    for child in node.children:
        t = child.type

        # ── ES6 imports ──────────────────────────────────────────────
        if t == "import_statement":
            imports.append(_parse_import_statement(child, source_bytes))

        # ── Variable declarations (require or arrow functions) ───────
        elif t in ("lexical_declaration", "variable_declaration"):
            imp = _try_parse_require(child, source_bytes)
            if imp:
                imports.append(imp)
            else:
                for decl in child.children:
                    if decl.type == "variable_declarator":
                        fn = _try_parse_arrow_function(decl, source_bytes)
                        if fn:
                            functions.append(fn)

        # ── Function declarations ────────────────────────────────────
        elif t in ("function_declaration", "generator_function_declaration"):
            functions.append(_parse_function(child, source_bytes))

        # ── Class declarations ───────────────────────────────────────
        elif t == "class_declaration":
            classes.append(_parse_class(child, source_bytes))

        # ── Exports ──────────────────────────────────────────────────
        elif t == "export_statement":
            export_info = _parse_export(child, source_bytes)
            exports.append(export_info)

            # An export can wrap a function or class declaration
            for sub in child.children:
                if sub.type in ("function_declaration", "generator_function_declaration"):
                    functions.append(_parse_function(sub, source_bytes))
                elif sub.type == "class_declaration":
                    classes.append(_parse_class(sub, source_bytes))
                elif sub.type == "lexical_declaration":
                    # `export const foo = () => {}` — try extracting arrow functions
                    for decl in sub.children:
                        if decl.type == "variable_declarator":
                            fn = _try_parse_arrow_function(decl, source_bytes)
                            if fn:
                                functions.append(fn)

        # ── Type/interface declarations (TypeScript) ─────────────────
        elif t in ("type_alias_declaration", "interface_declaration"):
            # We don't extract types as functions/classes, but could track them
            pass


# ═══════════════════════════════════════════════════════════════════════════
#  Import parsing
# ═══════════════════════════════════════════════════════════════════════════

def _parse_import_statement(node: Node, source_bytes: bytes) -> dict:
    """Parse `import { X, Y } from 'module'` or `import X from 'module'`."""
    names: list[str] = []
    module = ""
    is_default = False
    is_namespace = False

    for child in node.children:
        if child.type == "import_clause":
            for sub in child.children:
                if sub.type == "identifier":
                    names.append(_text(sub, source_bytes))
                    is_default = True
                elif sub.type == "named_imports":
                    for spec in sub.children:
                        if spec.type == "import_specifier":
                            name_node = spec.child_by_field_name("name")
                            if name_node:
                                names.append(_text(name_node, source_bytes))
                elif sub.type == "namespace_import":
                    alias_node = sub.child_by_field_name("name") or sub.children[-1] if sub.children else None
                    if alias_node and alias_node.type == "identifier":
                        names.append(_text(alias_node, source_bytes))
                    is_namespace = True
        elif child.type == "string" or child.type == "template_string":
            module = _text(child, source_bytes).strip("\"'`")

    return {
        "type": "es6_import",
        "module": module,
        "names": names,
        "is_default": is_default,
        "is_namespace": is_namespace,
        "line": node.start_point[0] + 1,
    }


def _try_parse_require(node: Node, source_bytes: bytes) -> dict | None:
    """Try to parse `const X = require('module')` style imports."""
    for child in node.children:
        if child.type == "variable_declarator":
            name_node = child.child_by_field_name("name")
            value_node = child.child_by_field_name("value")

            if value_node and value_node.type == "call_expression":
                fn_node = value_node.child_by_field_name("function")
                if fn_node and _text(fn_node, source_bytes) == "require":
                    args_node = value_node.child_by_field_name("arguments")
                    if args_node:
                        for arg in args_node.children:
                            if arg.type == "string":
                                module = _text(arg, source_bytes).strip("\"'")
                                name = _text(name_node, source_bytes) if name_node else ""
                                return {
                                    "type": "require",
                                    "module": module,
                                    "names": [name] if name else [],
                                    "is_default": True,
                                    "is_namespace": False,
                                    "line": node.start_point[0] + 1,
                                }
    return None


# ═══════════════════════════════════════════════════════════════════════════
#  Function parsing
# ═══════════════════════════════════════════════════════════════════════════

def _parse_function(node: Node, source_bytes: bytes) -> dict:
    """Parse a function_declaration or generator_function_declaration."""
    name_node = node.child_by_field_name("name")
    params_node = node.child_by_field_name("parameters")

    params = _extract_params(params_node, source_bytes) if params_node else []

    return_type = None
    ret_node = node.child_by_field_name("return_type")
    if ret_node:
        return_type = _text(ret_node, source_bytes).lstrip(": ").strip()

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
        "is_async": any(c.type == "async" for c in node.children),
        "is_generator": node.type == "generator_function_declaration",
        "line_count": line_count,
    }


def _try_parse_arrow_function(decl_node: Node, source_bytes: bytes) -> dict | None:
    """
    Try to extract a named arrow function from a variable_declarator.
    E.g. `const foo = (a, b) => { ... }`
    """
    name_node = decl_node.child_by_field_name("name")
    value_node = decl_node.child_by_field_name("value")

    if not value_node or value_node.type != "arrow_function":
        return None

    params_node = value_node.child_by_field_name("parameters") or value_node.child_by_field_name("parameter")
    params = _extract_params(params_node, source_bytes) if params_node else []

    return_type = None
    ret_node = value_node.child_by_field_name("return_type")
    if ret_node:
        return_type = _text(ret_node, source_bytes).lstrip(": ").strip()

    body_node = value_node.child_by_field_name("body")
    line_count = 0
    if body_node:
        line_count = body_node.end_point[0] - body_node.start_point[0] + 1

    return {
        "name": _text(name_node, source_bytes),
        "line": decl_node.start_point[0] + 1,
        "end_line": decl_node.end_point[0] + 1,
        "params": params,
        "return_type": return_type,
        "is_async": any(c.type == "async" for c in value_node.children),
        "is_generator": False,
        "line_count": line_count,
    }


def _extract_params(params_node: Node | None, source_bytes: bytes) -> list[str]:
    """Extract parameter names from a formal_parameters node."""
    if params_node is None:
        return []

    params: list[str] = []
    for child in params_node.children:
        if child.type == "identifier":
            params.append(_text(child, source_bytes))
        elif child.type in ("required_parameter", "optional_parameter"):
            pat = child.child_by_field_name("pattern")
            if pat:
                params.append(_text(pat, source_bytes))
            else:
                # Fallback: first identifier child
                for sub in child.children:
                    if sub.type == "identifier":
                        params.append(_text(sub, source_bytes))
                        break
        elif child.type == "rest_pattern":
            for sub in child.children:
                if sub.type == "identifier":
                    params.append("..." + _text(sub, source_bytes))
                    break
        elif child.type == "assignment_pattern":
            left = child.child_by_field_name("left")
            if left and left.type == "identifier":
                params.append(_text(left, source_bytes))
        elif child.type == "object_pattern":
            params.append("{...}")
        elif child.type == "array_pattern":
            params.append("[...]")
    return params


# ═══════════════════════════════════════════════════════════════════════════
#  Class parsing
# ═══════════════════════════════════════════════════════════════════════════

def _parse_class(node: Node, source_bytes: bytes) -> dict:
    """Parse a class declaration."""
    name_node = node.child_by_field_name("name")

    # Superclass (extends)
    bases: list[str] = []
    heritage = node.child_by_field_name("heritage") or node.child_by_field_name("class_heritage")
    if heritage is None:
        # Fallback: look for extends_clause in children
        for child in node.children:
            if child.type == "class_heritage":
                heritage = child
                break

    if heritage:
        for child in heritage.children:
            if child.type in ("identifier", "member_expression"):
                bases.append(_text(child, source_bytes))
            elif child.type == "extends_clause":
                for sub in child.children:
                    if sub.type in ("identifier", "member_expression"):
                        bases.append(_text(sub, source_bytes))

    # Methods
    methods: list[dict] = []
    body_node = node.child_by_field_name("body")
    if body_node:
        for child in body_node.children:
            if child.type in ("method_definition", "public_field_definition"):
                if child.type == "method_definition":
                    methods.append(_parse_method(child, source_bytes))

    return {
        "name": _text(name_node, source_bytes),
        "line": node.start_point[0] + 1,
        "end_line": node.end_point[0] + 1,
        "bases": bases,
        "methods": methods,
    }


def _parse_method(node: Node, source_bytes: bytes) -> dict:
    """Parse a method_definition inside a class body."""
    name_node = node.child_by_field_name("name")
    params_node = node.child_by_field_name("parameters")
    params = _extract_params(params_node, source_bytes) if params_node else []

    return_type = None
    ret_node = node.child_by_field_name("return_type")
    if ret_node:
        return_type = _text(ret_node, source_bytes).lstrip(": ").strip()

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
        "is_async": any(c.type == "async" for c in node.children),
        "line_count": line_count,
    }


# ═══════════════════════════════════════════════════════════════════════════
#  Export parsing
# ═══════════════════════════════════════════════════════════════════════════

def _parse_export(node: Node, source_bytes: bytes) -> dict:
    """Parse an export_statement."""
    is_default = any(c.type == "default" for c in node.children)
    names: list[str] = []

    for child in node.children:
        if child.type == "export_clause":
            for spec in child.children:
                if spec.type == "export_specifier":
                    name_node = spec.child_by_field_name("name")
                    if name_node:
                        names.append(_text(name_node, source_bytes))
        elif child.type in ("function_declaration", "generator_function_declaration"):
            fn_name = child.child_by_field_name("name")
            if fn_name:
                names.append(_text(fn_name, source_bytes))
        elif child.type == "class_declaration":
            cls_name = child.child_by_field_name("name")
            if cls_name:
                names.append(_text(cls_name, source_bytes))
        elif child.type == "lexical_declaration":
            for decl in child.children:
                if decl.type == "variable_declarator":
                    vn = decl.child_by_field_name("name")
                    if vn:
                        names.append(_text(vn, source_bytes))
        elif child.type == "identifier" and is_default:
            names.append(_text(child, source_bytes))

    return {
        "type": "default_export" if is_default else "named_export",
        "names": names,
        "line": node.start_point[0] + 1,
    }
