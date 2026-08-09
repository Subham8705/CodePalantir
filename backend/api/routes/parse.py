"""
API routes for source code parsing.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.parser.parsing_service import ParsingService

router = APIRouter()
parsing_service = ParsingService()


class ParseRequest(BaseModel):
    repo_path: str


class ParseFileRequest(BaseModel):
    file_path: str


@router.post("/repository")
def parse_repository(request: ParseRequest):
    """
    Parse all supported source files in a cloned repository.
    Returns aggregated stats and per-file extraction results.
    """
    try:
        analysis = parsing_service.parse_repository(request.repo_path)
        return analysis.to_dict()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


@router.post("/file")
def parse_single_file(request: ParseFileRequest):
    """
    Parse a single source file and return its extracted symbols.
    """
    result = parsing_service.parse_single_file(request.file_path)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="File not found or unsupported file type",
        )
    return result.to_dict()
