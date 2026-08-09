"""
Unit tests for the tree-sitter parsing service.
Tests extraction of imports, functions, classes from Python and JS/TS code.
"""

import sys
import os

# Add the backend dir to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.parser.treesitter_manager import manager
from services.parser.python_extractor import extract_python
from services.parser.js_ts_extractor import extract_js_ts


def test_python_imports():
    """Test extraction of Python import statements."""
    code = b"""
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional
from ..utils import helper
"""
    parser = manager.get_parser("python")
    tree = parser.parse(code)
    result = extract_python(tree.root_node, code)

    assert len(result["imports"]) == 5

    # import os
    assert result["imports"][0]["type"] == "import"
    assert result["imports"][0]["module"] == "os"

    # from pathlib import Path
    assert result["imports"][2]["type"] == "from_import"
    assert result["imports"][2]["module"] == "pathlib"
    assert "Path" in result["imports"][2]["names"]

    # from typing import Dict, Any, Optional
    assert result["imports"][3]["module"] == "typing"
    assert len(result["imports"][3]["names"]) == 3

    print("  PASS: test_python_imports")


def test_python_functions():
    """Test extraction of Python function definitions."""
    code = b"""
def hello(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}"

async def fetch_data(url):
    pass

def simple():
    pass
"""
    parser = manager.get_parser("python")
    tree = parser.parse(code)
    result = extract_python(tree.root_node, code)

    assert len(result["functions"]) == 3

    # hello function
    hello = result["functions"][0]
    assert hello["name"] == "hello"
    assert "name" in hello["params"]
    assert "greeting" in hello["params"]

    # simple function
    simple = result["functions"][2]
    assert simple["name"] == "simple"

    print("  PASS: test_python_functions")


def test_python_classes():
    """Test extraction of Python class definitions."""
    code = b"""
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        pass

class Dog(Animal):
    def speak(self):
        return "Woof!"

    def fetch(self, item):
        return item
"""
    parser = manager.get_parser("python")
    tree = parser.parse(code)
    result = extract_python(tree.root_node, code)

    assert len(result["classes"]) == 2

    animal = result["classes"][0]
    assert animal["name"] == "Animal"
    assert len(animal["methods"]) == 2
    assert animal["methods"][0]["name"] == "__init__"

    dog = result["classes"][1]
    assert dog["name"] == "Dog"
    assert "Animal" in dog["bases"]
    assert len(dog["methods"]) == 2

    print("  PASS: test_python_classes")


def test_python_decorators():
    """Test extraction of decorated functions."""
    code = b"""
@app.route("/api/data")
def get_data():
    return {"data": []}

@staticmethod
@cache
def cached_fn():
    pass
"""
    parser = manager.get_parser("python")
    tree = parser.parse(code)
    result = extract_python(tree.root_node, code)

    assert len(result["functions"]) == 2

    get_data = result["functions"][0]
    assert get_data["name"] == "get_data"
    assert len(get_data["decorators"]) == 1
    assert "app.route" in get_data["decorators"][0]

    cached = result["functions"][1]
    assert cached["name"] == "cached_fn"
    assert len(cached["decorators"]) == 2

    print("  PASS: test_python_decorators")


def test_js_es6_imports():
    """Test extraction of ES6 import statements."""
    code = b"""
import React from 'react';
import { useState, useEffect } from 'react';
import * as path from 'path';
import './styles.css';
"""
    parser = manager.get_parser("javascript")
    tree = parser.parse(code)
    result = extract_js_ts(tree.root_node, code)

    assert len(result["imports"]) == 4

    # import React from 'react'
    assert result["imports"][0]["module"] == "react"
    assert "React" in result["imports"][0]["names"]
    assert result["imports"][0]["is_default"] is True

    # import { useState, useEffect } from 'react'
    assert result["imports"][1]["module"] == "react"
    assert "useState" in result["imports"][1]["names"]
    assert "useEffect" in result["imports"][1]["names"]

    # import * as path from 'path'
    assert result["imports"][2]["module"] == "path"
    assert result["imports"][2]["is_namespace"] is True

    print("  PASS: test_js_es6_imports")


def test_js_require():
    """Test extraction of require() imports."""
    code = b"""
const express = require('express');
const { Router } = require('express');
"""
    parser = manager.get_parser("javascript")
    tree = parser.parse(code)
    result = extract_js_ts(tree.root_node, code)

    assert len(result["imports"]) >= 1
    assert result["imports"][0]["type"] == "require"
    assert result["imports"][0]["module"] == "express"

    print("  PASS: test_js_require")


def test_js_functions():
    """Test extraction of JS function declarations and arrow functions."""
    code = b"""
function greet(name) {
    return 'Hello ' + name;
}

const add = (a, b) => a + b;

async function fetchData(url) {
    return await fetch(url);
}
"""
    parser = manager.get_parser("javascript")
    tree = parser.parse(code)
    result = extract_js_ts(tree.root_node, code)

    assert len(result["functions"]) == 3

    greet = result["functions"][0]
    assert greet["name"] == "greet"
    assert "name" in greet["params"]

    add = result["functions"][1]
    assert add["name"] == "add"

    fetch_fn = result["functions"][2]
    assert fetch_fn["name"] == "fetchData"
    assert fetch_fn["is_async"] is True

    print("  PASS: test_js_functions")


def test_js_classes():
    """Test extraction of JS class declarations."""
    code = b"""
class Component extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return null;
    }
}
"""
    parser = manager.get_parser("javascript")
    tree = parser.parse(code)
    result = extract_js_ts(tree.root_node, code)

    assert len(result["classes"]) == 1
    comp = result["classes"][0]
    assert comp["name"] == "Component"
    assert len(comp["methods"]) == 2
    assert comp["methods"][0]["name"] == "constructor"
    assert comp["methods"][1]["name"] == "render"

    print("  PASS: test_js_classes")


def test_js_exports():
    """Test extraction of export statements."""
    code = b"""
export function handler(req, res) {
    return res.send('ok');
}

export default class App {
    run() {}
}

export const VERSION = '1.0';
export { handler, App };
"""
    parser = manager.get_parser("javascript")
    tree = parser.parse(code)
    result = extract_js_ts(tree.root_node, code)

    assert len(result["exports"]) >= 3

    # Named export function
    named_export = result["exports"][0]
    assert named_export["type"] == "named_export"
    assert "handler" in named_export["names"]

    # Default export class
    default_export = result["exports"][1]
    assert default_export["type"] == "default_export"
    assert "App" in default_export["names"]

    print("  PASS: test_js_exports")


def test_typescript_types():
    """Test parsing TypeScript with type annotations."""
    code = b"""
import { Request, Response } from 'express';

interface User {
    id: string;
    name: string;
}

function getUser(id: string): User | null {
    return null;
}

export const createUser = (name: string, email: string): User => {
    return { id: '1', name };
};

class UserService {
    private users: User[] = [];

    add(user: User): void {
        this.users.push(user);
    }

    findById(id: string): User | undefined {
        return this.users.find(u => u.id === id);
    }
}
"""
    parser = manager.get_parser("typescript")
    tree = parser.parse(code)
    result = extract_js_ts(tree.root_node, code)

    # Imports
    assert len(result["imports"]) == 1
    assert "Request" in result["imports"][0]["names"]

    # Functions (getUser + createUser arrow)
    assert len(result["functions"]) >= 2
    get_user = next(f for f in result["functions"] if f["name"] == "getUser")
    assert "id" in get_user["params"]

    # Classes
    assert len(result["classes"]) == 1
    assert result["classes"][0]["name"] == "UserService"
    assert len(result["classes"][0]["methods"]) == 2

    print("  PASS: test_typescript_types")


def test_language_detection():
    """Test that TreeSitterManager correctly maps file extensions."""
    assert manager.language_for_file("app.py") == "python"
    assert manager.language_for_file("index.ts") == "typescript"
    assert manager.language_for_file("App.tsx") == "tsx"
    assert manager.language_for_file("script.js") == "javascript"
    assert manager.language_for_file("utils.mjs") == "javascript"
    assert manager.language_for_file("README.md") is None
    assert manager.language_for_file("styles.css") is None

    assert manager.can_parse("app.py") is True
    assert manager.can_parse("README.md") is False

    print("  PASS: test_language_detection")


if __name__ == "__main__":
    print("Running tree-sitter parsing tests...\n")

    tests = [
        test_python_imports,
        test_python_functions,
        test_python_classes,
        test_python_decorators,
        test_js_es6_imports,
        test_js_require,
        test_js_functions,
        test_js_classes,
        test_js_exports,
        test_typescript_types,
        test_language_detection,
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
