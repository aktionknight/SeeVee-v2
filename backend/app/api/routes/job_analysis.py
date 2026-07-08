from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel
import asyncio

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.job_description import JobDescription
from app.schemas.job_description import JobDescriptionResponse, JobDescriptionCreate
from app.services.jd_analysis_service import analyze_job_description

router = APIRouter(prefix="/jobs", tags=["Job Analysis"])

class AnalyzeRequest(BaseModel):
    raw_text: str
    company_name: Optional[str] = None

@router.post("/analyze", response_model=JobDescriptionResponse)
async def analyze_job(req: AnalyzeRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        analysis = await asyncio.to_thread(analyze_job_description, req.raw_text)
        jd = JobDescription(
            user_id=current_user.id,
            raw_text=req.raw_text,
            company_name=req.company_name,
            role_title=analysis.get('role_title'),
            seniority=analysis.get('seniority'),
            required_skills=analysis.get('required_skills', []),
            preferred_skills=analysis.get('preferred_skills', []),
            responsibilities=analysis.get('responsibilities', []),
            keywords=analysis.get('keywords', []),
            analysis_json=analysis
        )
        db.add(jd)
        await db.commit()
        await db.refresh(jd)
        return jd
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analyses", response_model=List[JobDescriptionResponse])
async def list_analyses(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(JobDescription).filter(JobDescription.user_id == current_user.id))
    return result.scalars().all()

@router.get("/analyses/{jd_id}", response_model=JobDescriptionResponse)
async def get_analysis(jd_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(JobDescription).filter(JobDescription.id == jd_id, JobDescription.user_id == current_user.id))
    jd = result.scalars().first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    return jd
