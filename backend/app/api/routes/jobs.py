from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobUpdate, JobResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/", response_model=JobResponse)
async def create_job(job: JobCreate, db: AsyncSession = Depends(get_db)):
    db_job = Job(**job.model_dump())
    db.add(db_job)
    await db.commit()
    await db.refresh(db_job)
    return db_job

@router.get("/", response_model=List[JobResponse])
async def read_jobs(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{job_id}", response_model=JobResponse)
async def read_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).filter(Job.id == job_id))
    db_job = result.scalars().first()
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return db_job

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(job_id: int, job: JobUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).filter(Job.id == job_id))
    db_job = result.scalars().first()
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    for key, value in job.model_dump(exclude_unset=True).items():
        setattr(db_job, key, value)
    
    await db.commit()
    await db.refresh(db_job)
    return db_job

@router.delete("/{job_id}")
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).filter(Job.id == job_id))
    db_job = result.scalars().first()
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    await db.delete(db_job)
    await db.commit()
    return {"ok": True}
