from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel
import asyncio
import os
import uuid

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.job_description import JobDescription
from app.models.career_profile import CareerProfile
from app.models.project import Project
from app.models.skill import Skill
from app.models.experience import Experience
from app.models.achievement import Achievement
from app.models.generated_resume import GeneratedResume
from app.schemas.generated_resume import GeneratedResumeResponse

from app.services.career_rag_service import retrieve_career_evidence, rank_projects
from app.services.resume_generation_service import generate_tailored_resume

router = APIRouter(prefix="/applications", tags=["Resume Generation"])

class GenerateRequest(BaseModel):
    job_description_id: int
    pinned_project_ids: Optional[List[int]] = []
    excluded_project_ids: Optional[List[int]] = []
    extra_notes: Optional[str] = None

@router.post("/generate", response_model=GeneratedResumeResponse)
async def generate_resume(req: GenerateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Get JD
    res_jd = await db.execute(select(JobDescription).filter(JobDescription.id == req.job_description_id, JobDescription.user_id == current_user.id))
    jd = res_jd.scalars().first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    
    # 2. Get Profile info
    res_prof = await db.execute(select(CareerProfile).filter(CareerProfile.user_id == current_user.id))
    profile = res_prof.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Career profile not found")

    # Fetch projects
    res_proj = await db.execute(select(Project).filter(Project.user_id == current_user.id, Project.is_visible == True))
    all_projects = [{k: v for k, v in p.__dict__.items() if k != '_sa_instance_state'} for p in res_proj.scalars().all()]
    
    # Fetch experiences
    res_exp = await db.execute(select(Experience).filter(Experience.user_id == current_user.id))
    all_experiences = [{k: v for k, v in e.__dict__.items() if k != '_sa_instance_state'} for e in res_exp.scalars().all()]

    # Fetch achievements
    res_ach = await db.execute(select(Achievement).filter(Achievement.user_id == current_user.id))
    all_achievements = [{k: v for k, v in a.__dict__.items() if k != '_sa_instance_state'} for a in res_ach.scalars().all()]

    # 3. Retrieve Evidence
    # Use role title + keywords as query
    query = f"{jd.role_title} " + " ".join(jd.keywords)
    evidence = await asyncio.to_thread(retrieve_career_evidence, current_user.id, query, top_k=20)

    # 4. Rank Projects
    ranked = rank_projects(jd.analysis_json, all_projects, evidence)
    
    # Apply pins and exclusions
    final_projects = []
    excluded = set(req.excluded_project_ids or [])
    pinned = set(req.pinned_project_ids or [])
    
    # Add pinned first
    for p in all_projects:
        if p['id'] in pinned and p['id'] not in excluded:
            final_projects.append(p)
            
    # Add top ranked until we have 3 or run out
    for p in ranked:
        if len(final_projects) >= 3:
            break
        if p['id'] not in pinned and p['id'] not in excluded:
            final_projects.append(p)
            
    # 5. Generate
    prof_dict = {"summary": profile.summary}
    # For MVP, we'll just send all experiences and achievements and let the LLM pick
    try:
        resume_json = await asyncio.to_thread(
            generate_tailored_resume,
            prof_dict,
            jd.analysis_json,
            final_projects,
            all_experiences,
            all_achievements,
            req.extra_notes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    # 6. Save
    selected_project_ids = [p['id'] for p in final_projects]
    gen_resume = GeneratedResume(
        user_id=current_user.id,
        job_description_id=jd.id,
        resume_json=resume_json,
        selected_project_ids=selected_project_ids,
        selected_skill_ids=[],
        match_score=0.0, # calculate match score later
        generation_model="gemini-2.5-flash",
        version=1
    )
    db.add(gen_resume)
    await db.commit()
    await db.refresh(gen_resume)
    
    return gen_resume

@router.get("/resumes", response_model=List[GeneratedResumeResponse])
async def list_generated_resumes(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(GeneratedResume).filter(GeneratedResume.user_id == current_user.id))
    return result.scalars().all()

@router.get("/resumes/{resume_id}", response_model=GeneratedResumeResponse)
async def get_generated_resume(resume_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(GeneratedResume).filter(GeneratedResume.id == resume_id, GeneratedResume.user_id == current_user.id))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=404, detail="Generated resume not found")
    return resume

from fastapi.responses import Response, FileResponse
import re
from app.services.latex_generation_service import json_to_latex, compile_latex_to_pdf

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "resumes")

def get_safe_filename(title: str, default: str) -> str:
    if not title:
        return default
    safe_title = re.sub(r'[^a-zA-Z0-9]', '_', title)
    safe_title = re.sub(r'_+', '_', safe_title).strip('_')
    return safe_title if safe_title else default

@router.get("/resumes/{resume_id}/latex")
async def get_resume_latex(resume_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(GeneratedResume).filter(GeneratedResume.id == resume_id, GeneratedResume.user_id == current_user.id))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=404, detail="Generated resume not found")
    
    res_jd = await db.execute(select(JobDescription).filter(JobDescription.id == resume.job_description_id))
    jd = res_jd.scalars().first()
    safe_name = get_safe_filename(jd.role_title if jd else None, f"resume_{resume_id}")
    
    latex_str = json_to_latex(resume.resume_json, candidate_name=current_user.name, email=current_user.email)
    return Response(content=latex_str, media_type="text/x-tex", headers={"Content-Disposition": f"attachment; filename={safe_name}.tex"})

@router.get("/resumes/{resume_id}/pdf")
async def get_resume_pdf(resume_id: int, inline: bool = False, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(GeneratedResume).filter(GeneratedResume.id == resume_id, GeneratedResume.user_id == current_user.id))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=404, detail="Generated resume not found")
        
    res_jd = await db.execute(select(JobDescription).filter(JobDescription.id == resume.job_description_id))
    jd = res_jd.scalars().first()
    safe_name = get_safe_filename(jd.role_title if jd else None, f"resume_{resume_id}")
    
    user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    
    pdf_path = os.path.join(user_dir, f"resume_{resume_id}.pdf")
    
    if not os.path.exists(pdf_path):
        latex_str = json_to_latex(resume.resume_json, candidate_name=current_user.name, email=current_user.email)
        try:
            compile_latex_to_pdf(latex_str, output_dir=user_dir, filename=f"resume_{resume_id}.pdf")
        except RuntimeError as e:
            raise HTTPException(status_code=400, detail=str(e))
            
    if inline:
        return FileResponse(path=pdf_path, media_type="application/pdf")
    else:
        return FileResponse(path=pdf_path, media_type="application/pdf", filename=f"{safe_name}.pdf")
