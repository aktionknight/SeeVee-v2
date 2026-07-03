from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.core.database import get_db
from app.services.ai_service import LeadIntelligencePipeline

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

class PipelineRequest(BaseModel):
    lead_id: int
    user_profile: Dict[str, Any]
    company_data: Dict[str, Any]
    founder_data: Dict[str, Any]
    product_data: Dict[str, Any]
    query: Optional[str] = None

class ContentRequest(BaseModel):
    lead_id: int

@router.post("/generate")
async def generate_intelligence(request: PipelineRequest, db: AsyncSession = Depends(get_db)):
    pipeline = LeadIntelligencePipeline(db)
    try:
        results = await pipeline.run_pipeline(
            lead_id=request.lead_id,
            user_profile=request.user_profile,
            company_data=request.company_data,
            founder_data=request.founder_data,
            product_data=request.product_data,
            query=request.query
        )
        return {"status": "success", "data": results}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

@router.post("/content/email")
async def generate_email(request: ContentRequest, db: AsyncSession = Depends(get_db)):
    return {"message": "Email generation is done via /generate pipeline"}

@router.post("/content/linkedin")
async def generate_linkedin(request: ContentRequest, db: AsyncSession = Depends(get_db)):
    return {"message": "LinkedIn generation is done via /generate pipeline"}

@router.get("/leads/{lead_id}/insights")
async def get_insights(lead_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.intelligence import LeadInsight
    result = await db.execute(select(LeadInsight).filter(LeadInsight.lead_id == lead_id))
    insight = result.scalars().first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insights not found")
    return {"hooks": insight.hooks, "signals": insight.signals, "score": insight.score}

@router.get("/leads/{lead_id}/content")
async def get_generated_content(lead_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.intelligence import GeneratedContent
    result = await db.execute(select(GeneratedContent).filter(GeneratedContent.lead_id == lead_id))
    contents = result.scalars().all()
    if not contents:
        raise HTTPException(status_code=404, detail="Generated content not found")
    
    response_data = {}
    for c in contents:
        response_data[c.content_type] = {
            "content": c.content,
            "metadata": c.metadata_json
        }
    return response_data

