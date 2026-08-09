from database.database import SessionLocal
from database.models import RepositoryModel
from services.analysis.import_resolver import ImportResolver

db = SessionLocal()
repo = db.query(RepositoryModel).order_by(RepositoryModel.id.desc()).first()

print(f"Files: {len(repo.files)}")

file_to_module = {}
for mod in repo.modules:
    for file_path in mod.files:
        file_to_module[file_path] = mod

available_files = {f.relative_path.replace('\\', '/') for f in repo.files}
resolver = ImportResolver("dummy", available_files)

edges = []
for file in repo.files:
    source_rel_path = file.relative_path.replace('\\', '/')
    ext = source_rel_path.split('.')[-1]
    lang = 'python' if ext == 'py' else 'typescript' if ext in ('ts', 'tsx') else 'javascript'
    
    for imp in (file.imports or []):
        module_name = imp.get('module')
        if module_name:
            target = resolver.resolve(module_name, source_rel_path, lang)
            if target:
                edges.append((source_rel_path, target))

print(f"Edges: {len(edges)}")
for e in edges[:5]:
    print(f"  {e[0]} -> {e[1]}")
