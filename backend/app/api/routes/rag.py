import asyncio
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.services.rag_ingestion import ingest_career_data, retrieve_career_context
from app.services.langgraph_workflow import app_graph
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/rag", tags=["rag"])

class IngestDataRequest(BaseModel):
    data: Dict[str, Any]
    doc_id_prefix: str = "doc_"

class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5

@router.post("/ingest")
async def ingest_data(
    req: IngestDataRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Ingest career data into the Vector DB.
    Expected data schema contains lists of 'projects', 'roles', 'hackathons', etc.
    """
    try:
        result = ingest_career_data(req.data, req.doc_id_prefix)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retrieve")
async def retrieve_context(
    req: RetrieveRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve relevant career context based on a query.
    """
    try:
        results = retrieve_career_context(req.query, req.top_k)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TailorRequest(BaseModel):
    job_description: str
    master_resume: str

class TailorResponse(BaseModel):
    tailored_resume: str
    cold_email: str

@router.post("/tailor", response_model=TailorResponse)
async def tailor_resume_endpoint(
    req: TailorRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Trigger the LangGraph workflow given a Job Description and a Master Resume.
    """
    try:
        initial_state = {
            "job_description": req.job_description,
            "master_resume": req.master_resume,
        }
        result = await asyncio.to_thread(app_graph.invoke, initial_state)
        return TailorResponse(
            tailored_resume=result.get("tailored_resume", ""),
            cold_email=result.get("cold_email", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
