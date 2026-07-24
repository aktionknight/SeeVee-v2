from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import os
import uuid

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.uploaded_document import UploadedDocument
from app.schemas.uploaded_document import UploadedDocumentResponse

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = os.path.join("uploads", "private")
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def process_document_background(document_id: int, file_path: str):
    import logging
    from sqlalchemy.future import select
    from app.core.database import AsyncSessionLocal
    from app.services.pdf_extraction_service import extract_text_with_ocr_fallback
    from app.services.profile_extraction_service import extract_career_profile
    from app.services.career_rag_service import index_career_evidence
    from app.models.career_profile import CareerProfile
    from app.models.skill import Skill
    from app.models.project import Project
    from app.models.experience import Experience
    from app.models.education import Education
    from app.models.achievement import Achievement
    from app.models.uploaded_document import UploadedDocument
    
    logger = logging.getLogger(__name__)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(UploadedDocument).filter(UploadedDocument.id == document_id))
        doc = result.scalars().first()
        if not doc:
            return
        
        try:
            with open(file_path, "rb") as f:
                content = f.read()
                
            # 1. Extract text (CPU-bound, no DB commit yet)
            extracted_text = extract_text_with_ocr_fallback(content)
            doc.extracted_text = extracted_text
            doc.text_extraction_status = "complete"
            
            # 2. Extract structured profile via LLM (network-bound, no DB commit yet)
            profile_data = extract_career_profile(extracted_text)
            
            # 3. Create or update CareerProfile
            prof_result = await db.execute(select(CareerProfile).filter(CareerProfile.user_id == doc.user_id))
            profile = prof_result.scalars().first()
            if not profile:
                profile = CareerProfile(user_id=doc.user_id)
                db.add(profile)
                
            for field in ['full_name', 'headline', 'summary', 'contact_email', 'phone', 'location', 'linkedin_url', 'github_url', 'portfolio_url']:
                if profile_data.get(field):
                    setattr(profile, field, profile_data[field])
            
            # Flush to get profile.id for foreign keys, but don't commit yet
            await db.flush()
            
            # 4. Insert all nested entities (still no commit — single atomic batch)
            for s in profile_data.get('skills', []):
                db.add(Skill(user_id=doc.user_id, profile_id=profile.id, name=s.get('name'), category=s.get('category'), proficiency_level=s.get('proficiency_level'), source_document_id=doc.id))
                
            for p in profile_data.get('projects', []):
                db.add(Project(user_id=doc.user_id, profile_id=profile.id, title=p.get('title'), description=p.get('description'), technologies=p.get('technologies', []), bullets=p.get('bullets', []), metrics=p.get('metrics', []), start_date=p.get('start_date'), end_date=p.get('end_date'), github_url=p.get('github_url'), live_url=p.get('live_url'), source_document_id=doc.id, source_text=p.get('source_text')))

            for e in profile_data.get('experiences', []):
                db.add(Experience(user_id=doc.user_id, profile_id=profile.id, company=e.get('company'), title=e.get('title'), location=e.get('location'), start_date=e.get('start_date'), end_date=e.get('end_date'), is_current=e.get('is_current', False), description=e.get('description'), bullets=e.get('bullets', []), source_document_id=doc.id, source_text=e.get('source_text')))

            for ed in profile_data.get('education', []):
                db.add(Education(user_id=doc.user_id, profile_id=profile.id, institution=ed.get('institution'), degree=ed.get('degree'), field_of_study=ed.get('field_of_study'), start_date=ed.get('start_date'), end_date=ed.get('end_date'), gpa=ed.get('gpa'), description=ed.get('description'), source_document_id=doc.id))

            for a in profile_data.get('achievements', []):
                db.add(Achievement(user_id=doc.user_id, profile_id=profile.id, title=a.get('title'), description=a.get('description'), date=a.get('date'), issuer=a.get('issuer'), achievement_type=a.get('achievement_type'), source_document_id=doc.id))

            # Flush entities to get their IDs for Chroma indexing
            await db.flush()

            # 5. Index into Chroma (uses flushed IDs, still no commit)
            try:
                all_skills = (await db.execute(select(Skill).filter(Skill.user_id == doc.user_id))).scalars().all()
                all_projects = (await db.execute(select(Project).filter(Project.user_id == doc.user_id))).scalars().all()
                all_experiences = (await db.execute(select(Experience).filter(Experience.user_id == doc.user_id))).scalars().all()
                all_achievements = (await db.execute(select(Achievement).filter(Achievement.user_id == doc.user_id))).scalars().all()
                
                db_profile_data = {
                    "skills": [{"id": s.id, "name": s.name, "category": s.category, "proficiency_level": s.proficiency_level} for s in all_skills],
                    "projects": [{"id": p.id, "title": p.title, "description": p.description, "technologies": p.technologies, "bullets": p.bullets} for p in all_projects],
                    "experiences": [{"id": e.id, "title": e.title, "company": e.company, "description": e.description, "bullets": e.bullets} for e in all_experiences],
                    "achievements": [{"id": a.id, "title": a.title, "description": a.description, "issuer": a.issuer, "achievement_type": a.achievement_type} for a in all_achievements]
                }
                index_career_evidence(doc.user_id, db_profile_data, db)
            except Exception as e:
                logger.error(f"RAG indexing failed (non-fatal): {e}")
                
            # 6. Single atomic commit — everything becomes visible at once
            doc.processing_status = "complete"
            await db.commit()
            logger.info(f"Document {document_id} processing complete")
            
        except Exception as e:
            logger.error(f"Document processing failed: {e}")
            doc.processing_status = "error"
            doc.error_message = str(e)
            await db.commit()

@router.post("/resume", response_model=UploadedDocumentResponse)
async def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    doc_uuid = str(uuid.uuid4())
    user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, f"{doc_uuid}.pdf")
    
    with open(file_path, "wb") as f:
        f.write(content)
        
    doc = UploadedDocument(
        user_id=current_user.id,
        file_name=file.filename,
        storage_path=file_path,
        mime_type="application/pdf",
        file_size=len(content),
        processing_status="processing",
        text_extraction_status="pending"
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    background_tasks.add_task(process_document_background, doc.id, file_path)
    return doc

@router.get("/{document_id}/status", response_model=UploadedDocumentResponse)
async def get_document_status(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(UploadedDocument).filter(UploadedDocument.id == document_id, UploadedDocument.user_id == current_user.id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
