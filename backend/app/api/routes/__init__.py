from fastapi import APIRouter
from .users import router as users_router
from .integrations import router as integrations_router
from .jobs import router as jobs_router
from .resumes import router as resumes_router
from .campaigns import router as campaigns_router
from .emails import router as emails_router

api_router = APIRouter()
api_router.include_router(users_router)
api_router.include_router(integrations_router)
api_router.include_router(jobs_router)
api_router.include_router(resumes_router)
api_router.include_router(campaigns_router)
api_router.include_router(emails_router)
