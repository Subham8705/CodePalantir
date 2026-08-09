import os
import re

SRC_DIR = r"c:\Subham\GRIET\Projects\major project\CodePalantir\project\src"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the import statement from mockData
    match = re.search(r"import\s+\{\s*([^}]+)\s*\}\s+from\s+['\"]@/data/mockData['\"];?", content)
    if not match:
        return

    imported_vars = [v.strip() for v in match.group(1).split(',')]
    
    # Remove the mockData import
    content = content[:match.start()] + content[match.end():]
    
    # We also need to import useApi
    import_useapi = "import { useApi } from '@/context/ApiContext';\n"
    
    # Put it after the last import
    last_import = list(re.finditer(r"^import .*;?$", content, re.MULTILINE))
    if last_import:
        insert_pos = last_import[-1].end() + 1
        content = content[:insert_pos] + import_useapi + content[insert_pos:]
    else:
        content = import_useapi + content

    # Now find the component definition to inject the hook
    # e.g., export function OverviewPage() { or const OverviewPage = () => {
    # It's usually `export function ComponentName() {`
    comp_match = re.search(r"(export\s+(default\s+)?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)", content)
    if comp_match:
        hook_call = f"\n  const {{ {', '.join(imported_vars)} }} = useApi();\n"
        insert_pos = comp_match.end()
        content = content[:insert_pos] + hook_call + content[insert_pos:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Refactored {filepath}")

for root, dirs, files in os.walk(SRC_DIR):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            if "mockApi" in file or "mockData" in file or "mockCode" in file:
                continue
            process_file(os.path.join(root, file))
