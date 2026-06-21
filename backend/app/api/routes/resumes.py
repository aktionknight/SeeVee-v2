from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.models.resume import Resume
from app.schemas.resume import ResumeCreate, ResumeUpdate, ResumeResponse

router = APIRouter(prefix="/resumes", tags=["Resumes"])

@router.post("/", response_model=ResumeResponse)
async def create_resume(resume: ResumeCreate, db: AsyncSession = Depends(get_db)):
    db_resume = Resume(**resume.model_dump())
    db.add(db_resume)
    await db.commit()
    await db.refresh(db_resume)
    return db_resume

@router.get("/", response_model=List[ResumeResponse])
async def read_resumes(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{resume_id}", response_model=ResumeResponse)
async def read_resume(resume_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).filter(Resume.id == resume_id))
    db_resume = result.scalars().first()
    if db_resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    return db_resume

@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(resume_id: int, resume: ResumeUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).filter(Resume.id == resume_id))
    db_resume = result.scalars().first()
    if db_resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    for key, value in resume.model_dump(exclude_unset=True).items():
        setattr(db_resume, key, value)
    
    await db.commit()
    await db.refresh(db_resume)
    return db_resume

@router.delete("/{resume_id}")
async def delete_resume(resume_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).filter(Resume.id == resume_id))
    db_resume = result.scalars().first()
    if db_resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    await db.delete(db_resume)
    await db.commit()
    return {"ok": True}
