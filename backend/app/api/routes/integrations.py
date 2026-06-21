from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.models.integration import Integration
from app.schemas.integration import IntegrationCreate, IntegrationUpdate, IntegrationResponse

router = APIRouter(prefix="/integrations", tags=["Integrations"])

@router.post("/", response_model=IntegrationResponse)
async def create_integration(integration: IntegrationCreate, db: AsyncSession = Depends(get_db)):
    db_integration = Integration(**integration.model_dump())
    db.add(db_integration)
    await db.commit()
    await db.refresh(db_integration)
    return db_integration

@router.get("/", response_model=List[IntegrationResponse])
async def read_integrations(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Integration).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{integration_id}", response_model=IntegrationResponse)
async def read_integration(integration_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Integration).filter(Integration.id == integration_id))
    db_integration = result.scalars().first()
    if db_integration is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    return db_integration

@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(integration_id: int, integration: IntegrationUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Integration).filter(Integration.id == integration_id))
    db_integration = result.scalars().first()
    if db_integration is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    for key, value in integration.model_dump(exclude_unset=True).items():
        setattr(db_integration, key, value)
    
    await db.commit()
    await db.refresh(db_integration)
    return db_integration

@router.delete("/{integration_id}")
async def delete_integration(integration_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Integration).filter(Integration.id == integration_id))
    db_integration = result.scalars().first()
    if db_integration is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    await db.delete(db_integration)
    await db.commit()
    return {"ok": True}
