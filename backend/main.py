from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import repo
from api.routes import parse

app = FastAPI(
    title="CodeCompass API",
    description="Backend API for CodeCompass Repository Analysis",
    version="0.1.0"
)

# Configure CORS so the React frontend can communicate with it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repo.router, prefix="/api/repo", tags=["Repository"])
app.include_router(parse.router, prefix="/api/parse", tags=["Parsing"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the CodeCompass API"}
