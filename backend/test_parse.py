"""Test script: Clone a repo and parse it with tree-sitter."""
import requests
import json
import sys

BASE = "http://127.0.0.1:8000"

# Step 1: Clone a test repo
print("=== Cloning test repo ===")
r = requests.post(f"{BASE}/api/repo/clone", json={"url": "https://github.com/tiangolo/fastapi"})
if r.status_code != 200:
    print(f"Clone failed: {r.status_code} {r.text}")
    sys.exit(1)

clone_data = r.json()
repo_path = clone_data.get("path", "")
print(f"Cloned to: {repo_path}")
print(f"File count: {clone_data.get('file_count', 0)}")

# Step 2: Parse the repo
print("\n=== Parsing repo ===")
r2 = requests.post(f"{BASE}/api/parse/repository", json={"repo_path": repo_path})
if r2.status_code != 200:
    print(f"Parse failed: {r2.status_code} {r2.text}")
    sys.exit(1)

data = r2.json()
print(f"Files parsed: {data['total_files_parsed']}")
print(f"Duration: {data['duration_seconds']}s")
print(f"Stats:")
stats = data["stats"]
for k, v in stats.items():
    print(f"  {k}: {v}")

# Show sample files
print("\n=== Sample file results ===")
files = data.get("files", [])
for f in files[:5]:
    print(f"  {f['relative_path']} ({f['language']})")
    print(f"    imports={len(f['imports'])}, functions={len(f['functions'])}, classes={len(f['classes'])}")
    if f["imports"]:
        print(f"    first import: {f['imports'][0]}")

print("\n=== DONE ===")
