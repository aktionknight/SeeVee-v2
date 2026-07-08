from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .integrations import router as integrations_router
from .jobs import router as jobs_router
from .resumes import router as resumes_router
from .campaigns import router as campaigns_router
from .emails import router as emails_router
from .leads import router as leads_router
from .intelligence import router as intelligence_router
from .rag import router as rag_router
from .documents import router as documents_router
from .career_profile import router as career_profile_router
from .job_analysis import router as job_analysis_router
from .resume_generator import router as resume_generator_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(integrations_router)
api_router.include_router(jobs_router)
api_router.include_router(resumes_router)
api_router.include_router(campaigns_router)
api_router.include_router(emails_router)
api_router.include_router(leads_router)
api_router.include_router(intelligence_router)
api_router.include_router(rag_router)
api_router.include_router(documents_router)
api_router.include_router(career_profile_router)
api_router.include_router(job_analysis_router)
api_router.include_router(resume_generator_router)
