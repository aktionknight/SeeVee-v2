from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.schemas.lead import LeadResponse, LeadUpdateEmail
from app.services.apify_service import run_apify_scrape_job

router = APIRouter(prefix="/leads", tags=["Leads"])

class ScrapeRequest(BaseModel):
    query: str
    max_results: int = 10

@router.get("/", response_model=List[LeadResponse])
async def get_leads(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Lead).filter(Lead.user_id == current_user.id).order_by(Lead.id.desc()))
    return result.scalars().all()

@router.delete("/{lead_id}")
async def delete_lead(lead_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Lead).filter(Lead.id == lead_id, Lead.user_id == current_user.id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    await db.delete(lead)
    await db.commit()
    return {"ok": True}

@router.put("/{lead_id}/email", response_model=LeadResponse)
async def update_lead_email(lead_id: int, data: LeadUpdateEmail, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Lead).filter(Lead.id == lead_id, Lead.user_id == current_user.id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    lead.email = data.email
    await db.commit()
    await db.refresh(lead)
    return lead

@router.post("/scrape")
async def trigger_scrape(data: ScrapeRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.job import Job
    db_job = Job(
        user_id=current_user.id,
        title=f"Scrape: {data.query}",
        company="Apify",
        status="running"
    )
    db.add(db_job)
    await db.commit()
    await db.refresh(db_job)

    background_tasks.add_task(run_apify_scrape_job, current_user.id, data.query, data.max_results, db_job.id)
    return {"ok": True, "message": "Scraping job started in the background.", "job_id": db_job.id}
