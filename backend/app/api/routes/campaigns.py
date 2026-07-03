from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.campaign import Campaign
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

@router.post("/", response_model=CampaignResponse)
async def create_campaign(
    campaign: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_campaign = Campaign(
        name=campaign.name,
        status=campaign.status,
        user_id=current_user.id,
    )
    db.add(db_campaign)
    await db.commit()
    await db.refresh(db_campaign)
    return db_campaign

@router.get("/", response_model=List[CampaignResponse])
async def read_campaigns(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).filter(Campaign.user_id == current_user.id).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.get("/{campaign_id}", response_model=CampaignResponse)
async def read_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id)
    )
    db_campaign = result.scalars().first()
    if db_campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return db_campaign

@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    campaign: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id)
    )
    db_campaign = result.scalars().first()
    if db_campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    for key, value in campaign.model_dump(exclude_unset=True).items():
        setattr(db_campaign, key, value)
    
    await db.commit()
    await db.refresh(db_campaign)
    return db_campaign

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id)
    )
    db_campaign = result.scalars().first()
    if db_campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    await db.delete(db_campaign)
    await db.commit()
    return {"ok": True}
