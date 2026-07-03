from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel
import asyncio

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.schemas.resume import ResumeCreate, ResumeUpdate, ResumeResponse
from app.services.resume_review_service import review_resume, review_resume_with_context

router = APIRouter(prefix="/resumes", tags=["Resumes"])

@router.post("/", response_model=ResumeResponse)
async def create_resume(
    resume: ResumeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_resume = Resume(
        name=resume.name,
        content=resume.content,
        file_url=resume.file_url,
        user_id=current_user.id,
    )
    db.add(db_resume)
    await db.commit()
    await db.refresh(db_resume)
    return db_resume

@router.get("/", response_model=List[ResumeResponse])
async def read_resumes(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).filter(Resume.user_id == current_user.id).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.get("/{resume_id}", response_model=ResumeResponse)
async def read_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    db_resume = result.scalars().first()
    if db_resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    return db_resume

@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: int,
    resume: ResumeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    db_resume = result.scalars().first()
    if db_resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    for key, value in resume.model_dump(exclude_unset=True).items():
        setattr(db_resume, key, value)
    
    await db.commit()
    await db.refresh(db_resume)
    return db_resume

@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    db_resume = result.scalars().first()
    if db_resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    await db.delete(db_resume)
    await db.commit()
    return {"ok": True}

# ---------------------------------------------------------------------------
# Resume review endpoints
# ---------------------------------------------------------------------------

class ResumeReviewRequest(BaseModel):
    job_description: Optional[str] = None
    use_career_context: bool = False
    top_k: int = 5


class ResumeTextReviewRequest(BaseModel):
    resume_text: str
    job_description: Optional[str] = None
    use_career_context: bool = False
    top_k: int = 5


@router.post("/review-text")
async def review_resume_text(
    body: ResumeTextReviewRequest,
    current_user: User = Depends(get_current_user),
):
    """Review raw resume text without requiring a database record.

    Provide resume_text directly. Optionally include job_description
    and set use_career_context=true for context-augmented review.
    """
    try:
        if body.use_career_context and body.job_description:
            review = await asyncio.to_thread(
                review_resume_with_context,
                resume_text=body.resume_text,
                job_description=body.job_description,
                top_k=body.top_k,
            )
        else:
            review = await asyncio.to_thread(
                review_resume,
                resume_text=body.resume_text,
                job_description=body.job_description,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Review failed: {str(e)}")

    return {"review": review}


@router.post("/{resume_id}/review")
async def review_resume_by_id(
    resume_id: int,
    body: ResumeReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Review a specific resume stored in the database.

    Optionally provide a job_description to evaluate fit for that role.
    Set use_career_context=true to augment the review with ChromaDB context.
    """
    result = await db.execute(select(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id))
    db_resume = result.scalars().first()
    if db_resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        if body.use_career_context and body.job_description:
            review = await asyncio.to_thread(
                review_resume_with_context,
                resume_text=db_resume.content,
                job_description=body.job_description,
                top_k=body.top_k,
            )
        else:
            review = await asyncio.to_thread(
                review_resume,
                resume_text=db_resume.content,
                job_description=body.job_description,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Review failed: {str(e)}")

    return {"resume_id": resume_id, "review": review}

