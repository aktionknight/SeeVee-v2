from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import httpx

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.encryption import encrypt_value, decrypt_value, mask_api_key
from app.models.user import User
from app.models.integration import Integration
from app.schemas.integration import IntegrationCreate, IntegrationResponse, IntegrationStatusResponse

router = APIRouter(prefix="/integrations", tags=["Integrations"])

@router.post("/apify", response_model=IntegrationResponse)
async def create_or_update_apify_integration(
    integration: IntegrationCreate, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if integration.platform != "apify":
        raise HTTPException(status_code=400, detail="Only 'apify' platform supported on this endpoint")

    # Encrypt the token
    encrypted_token = encrypt_value(integration.api_key)

    result = await db.execute(
        select(Integration).filter(
            Integration.user_id == current_user.id,
            Integration.platform == "apify"
        )
    )
    db_integration = result.scalars().first()

    if db_integration:
        # Update existing
        db_integration.encrypted_credentials = encrypted_token
        db_integration.is_active = True
    else:
        # Create new
        db_integration = Integration(
            user_id=current_user.id,
            platform="apify",
            encrypted_credentials=encrypted_token,
            is_active=True
        )
        db.add(db_integration)

    await db.commit()
    await db.refresh(db_integration)

    # Convert to response schema manually to include masked_key
    return IntegrationResponse(
        id=db_integration.id,
        user_id=db_integration.user_id,
        platform=db_integration.platform,
        masked_key=mask_api_key(integration.api_key),
        is_active=db_integration.is_active,
        created_at=db_integration.created_at,
        updated_at=db_integration.updated_at
    )

@router.get("/status", response_model=List[IntegrationStatusResponse])
async def get_integration_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Integration).filter(Integration.user_id == current_user.id)
    )
    integrations = result.scalars().all()
    
    statuses = []
    
    # Check Apify
    apify = next((i for i in integrations if i.platform == "apify"), None)
    if apify:
        try:
            # We don't return the raw key, just masked
            decrypted = decrypt_value(apify.encrypted_credentials)
            statuses.append(IntegrationStatusResponse(
                platform="apify",
                is_active=apify.is_active,
                masked_key=mask_api_key(decrypted)
            ))
        except Exception:
            statuses.append(IntegrationStatusResponse(
                platform="apify",
                is_active=False,
                masked_key="error"
            ))
            
    # Check Gmail
    statuses.append(IntegrationStatusResponse(
        platform="gmail",
        is_active=current_user.gmail_connected,
        masked_key="oauth"
    ))
    
    return statuses

@router.delete("/apify")
async def delete_apify_integration(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Integration).filter(
            Integration.user_id == current_user.id,
            Integration.platform == "apify"
        )
    )
    db_integration = result.scalars().first()
    
    if not db_integration:
        raise HTTPException(status_code=404, detail="Apify integration not found")

    await db.delete(db_integration)
    await db.commit()
    return {"ok": True}

@router.get("/apify/verify")
async def verify_apify_integration(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Integration).filter(
            Integration.user_id == current_user.id,
            Integration.platform == "apify"
        )
    )
    db_integration = result.scalars().first()
    
    if not db_integration:
        raise HTTPException(status_code=404, detail="Apify integration not found")
        
    try:
        token = decrypt_value(db_integration.encrypted_credentials)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt token")
        
    # Verify via Apify API
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.apify.com/v2/users/me?token={token}")
        
    if response.status_code == 200:
        return {"ok": True, "message": "Successfully connected to Apify"}
    else:
        raise HTTPException(status_code=400, detail="Failed to verify token with Apify")
