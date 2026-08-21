from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import repo, parse, data, ai
from database.database import Base, engine

# Ensure tables are created
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CodePalantir API",
    description="Backend services for CodePalantir repository analysis",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repo.router, prefix="/api/repo", tags=["Repository"])
app.include_router(parse.router, prefix="/api/parse", tags=["Parsing"])
app.include_router(data.router, prefix="/api", tags=["Data"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the CodeCompass API"}
