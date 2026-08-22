import os
import chromadb
from chromadb.utils import embedding_functions

CHROMA_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_data")

class SemanticSearchService:
    def __init__(self):
        # Persistent client stores data locally to CHROMA_DATA_DIR
        self.client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)
        
        # Use sentence-transformers default embedding function (all-MiniLM-L6-v2)
        # It's fast, small, and runs perfectly locally.
        self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()

    def _get_collection_name(self, repo_url: str) -> str:
        # ChromaDB collection names must be valid identifiers (no slashes, etc.)
        # E.g. https://github.com/Subham8705/CodePalantir -> subham8705_codepalantir
        parts = [p for p in repo_url.replace("https://", "").replace("http://", "").split("/") if p]
        name = "_".join(parts[-2:]).lower().replace(".", "_").replace("-", "_")
        return name[:63] # chroma has max length 63

    def index_repository(self, repo_url: str, repo_name: str, analysis_files):
        """
        Indexes a parsed repository.
        Drops the old collection if it exists to avoid ghost code,
        then chunks all files and embeds them.
        """
        collection_name = self._get_collection_name(repo_url)
        
        # Drop existing collection to ensure a clean state
        try:
            self.client.delete_collection(name=collection_name)
        except Exception:
            pass # Doesn't exist yet
            
        # Create fresh collection
        collection = self.client.create_collection(
            name=collection_name, 
            embedding_function=self.embedding_fn
        )
        
        # Read files and chunk
        # E.g. cloned_repos/CodePalantir
        repo_dir = repo_name.split('/')[-1] if '/' in repo_name else repo_name
        base_path = os.path.join("cloned_repos", repo_dir)
        
        docs = []
        metadatas = []
        ids = []
        
        chunk_id_counter = 0
        
        for f in analysis_files:
            file_path = os.path.join(base_path, f.relative_path)
            if not os.path.exists(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as file_obj:
                    lines = file_obj.readlines()
            except Exception:
                continue
                
            # Chunking logic: 50 lines per chunk, 10 line overlap
            chunk_size = 50
            overlap = 10
            
            start = 0
            while start < len(lines):
                end = min(start + chunk_size, len(lines))
                chunk_lines = lines[start:end]
                chunk_text = "".join(chunk_lines)
                
                if chunk_text.strip(): # Ignore empty chunks
                    docs.append(f"File: {f.relative_path}\nCode:\n{chunk_text}")
                    
                    # Extract top level directory
                    parts = f.relative_path.replace('\\', '/').split('/')
                    dir_name = parts[0] if len(parts) > 1 else "Root"
                    
                    metadatas.append({
                        "repo": repo_name,
                        "file_path": f.relative_path,
                        "folder": dir_name,
                        "lines": f"{start + 1}-{end}"
                    })
                    ids.append(f"chunk_{chunk_id_counter}")
                    chunk_id_counter += 1
                
                if end == len(lines):
                    break
                start += (chunk_size - overlap)
        
        # Add to collection in batches (Chroma handles max batch sizes, but 5461 is safe for sqlite)
        if docs:
            batch_size = 1000
            for i in range(0, len(docs), batch_size):
                collection.add(
                    documents=docs[i:i+batch_size],
                    metadatas=metadatas[i:i+batch_size],
                    ids=ids[i:i+batch_size]
                )
                
    def search(self, query: str, repo_url: str, top_k: int = 5):
        """
        Searches the repository's vector collection for the query.
        Returns a formatted context string.
        """
        collection_name = self._get_collection_name(repo_url)
        try:
            collection = self.client.get_collection(
                name=collection_name, 
                embedding_function=self.embedding_fn
            )
        except ValueError:
            return "" # Collection not found (not analyzed yet)
            
        results = collection.query(
            query_texts=[query],
            n_results=top_k
        )
        
        context_str = ""
        if results and results['documents'] and results['documents'][0]:
            context_str += "\n=== SEMANTIC SEARCH RESULTS ===\n"
            context_str += "The following code chunks are highly relevant to the user's question:\n\n"
            
            for idx, doc in enumerate(results['documents'][0]):
                meta = results['metadatas'][0][idx]
                context_str += f"--- {meta.get('file_path')} (Lines {meta.get('lines')}) ---\n"
                context_str += f"{doc}\n\n"
                
        return context_str
