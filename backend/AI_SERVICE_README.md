# AI Service Integration Guide

The AI components for the SeeVee SaaS backend have been implemented in `backend/services/ai_service.py`. This service handles Job Description (JD) Analysis, Resume Vector Storage/Retrieval (RAG), Tailored Resume Generation, and Email Generation using Google Gemini 2.5 Flash and `pgvector`.

## Prerequisites

Ensure the following packages are added to your `requirements.txt`:
```txt
google-generativeai
asyncpg
pgvector
```

You must also set the `GOOGLE_API_KEY` environment variable for Gemini.

## Usage in FastAPI

The `AIService` accepts an optional `asyncpg.Pool` instance. If omitted, database-related functions will gracefully degrade to return mock data, so you can build out your routes even if the vector tables aren't ready.

### 1. Initialization

In your FastAPI `dependencies.py` or main setup:

```python
import asyncpg
from fastapi import Request
from services.ai_service import AIService

async def get_db_pool() -> asyncpg.Pool:
    # Setup your asyncpg pool globally
    return pool

async def get_ai_service(db_pool: asyncpg.Pool = Depends(get_db_pool)) -> AIService:
    return AIService(db_pool=db_pool)
```

### 2. Example Routes

#### Store Resume Chunks

```python
from fastapi import APIRouter, Depends
from typing import Any, Dict

router = APIRouter()

@router.post("/resumes/{tenant_id}/embed")
async def embed_resume(tenant_id: str, resume_data: Dict[str, Any], ai_service: AIService = Depends(get_ai_service)):
    # resume_data expects structured format (experience, projects, skills)
    await ai_service.store_resume_chunks(tenant_id, resume_data)
    return {"status": "success", "message": "Resume vectorized and stored."}
```

#### Generate Tailored Resume

```python
from pydantic import BaseModel

class JobReq(BaseModel):
    jd_text: str

@router.post("/resumes/{tenant_id}/tailor")
async def tailor_resume(tenant_id: str, payload: JobReq, ai_service: AIService = Depends(get_ai_service)):
    tailored_resume = await ai_service.generate_tailored_resume(tenant_id, payload.jd_text)
    return {"tailored_resume": tailored_resume}
```

#### Generate Email

```python
class EmailReq(BaseModel):
    jd_text: str
    tailored_resume: str

@router.post("/emails/{tenant_id}/generate")
async def generate_cold_email(tenant_id: str, payload: EmailReq, ai_service: AIService = Depends(get_ai_service)):
    email_content = await ai_service.generate_email(tenant_id, payload.jd_text, payload.tailored_resume)
    return {"email": email_content}
```

## Database Schema (pgvector)

When setting up your Supabase or PostgreSQL instance, ensure the `pgvector` extension is enabled and create the table:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE resume_chunks (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    chunk_type VARCHAR(50),
    content TEXT,
    embedding vector(768) -- Size 768 for Gemini text-embedding-001
);

-- Recommended index for fast cosine distance search
CREATE INDEX ON resume_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```
