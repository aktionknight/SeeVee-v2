from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.models.email import Email
from app.schemas.email import EmailCreate, EmailUpdate, EmailResponse

router = APIRouter(prefix="/emails", tags=["Emails"])

@router.post("/", response_model=EmailResponse)
async def create_email(email: EmailCreate, db: AsyncSession = Depends(get_db)):
    db_email = Email(**email.model_dump())
    db.add(db_email)
    await db.commit()
    await db.refresh(db_email)
    return db_email

@router.get("/", response_model=List[EmailResponse])
async def read_emails(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Email).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{email_id}", response_model=EmailResponse)
async def read_email(email_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Email).filter(Email.id == email_id))
    db_email = result.scalars().first()
    if db_email is None:
        raise HTTPException(status_code=404, detail="Email not found")
    return db_email

@router.put("/{email_id}", response_model=EmailResponse)
async def update_email(email_id: int, email: EmailUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Email).filter(Email.id == email_id))
    db_email = result.scalars().first()
    if db_email is None:
        raise HTTPException(status_code=404, detail="Email not found")
    
    for key, value in email.model_dump(exclude_unset=True).items():
        setattr(db_email, key, value)
    
    await db.commit()
    await db.refresh(db_email)
    return db_email

@router.delete("/{email_id}")
async def delete_email(email_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Email).filter(Email.id == email_id))
    db_email = result.scalars().first()
    if db_email is None:
        raise HTTPException(status_code=404, detail="Email not found")
    
    await db.delete(db_email)
    await db.commit()
    return {"ok": True}

@router.post("/generate", response_model=EmailResponse)
async def generate_email_draft(campaign_id: int, job_id: int, recipient_email: str, db: AsyncSession = Depends(get_db)):
    # TODO: This will be implemented by the AI/RAG agent
    # It will call the AI service to generate an email based on the job and resume,
    # then save the generated email to the database and return it.
    raise HTTPException(status_code=501, detail="AI Generation not yet implemented")
