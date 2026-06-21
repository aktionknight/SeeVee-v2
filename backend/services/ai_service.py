import os
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

# Gemini integration
import google.generativeai as genai
from google.generativeai import GenerativeModel

# Postgres + pgvector for async operations
import asyncpg
from pgvector.asyncpg import register_vector

# Load Google API Key from environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

MODEL_NAME = "gemini-2.5-flash"
EMBEDDING_MODEL = "models/embedding-001"

@dataclass
class JobDescriptionAnalysis:
    job_title: str
    company_name: str
    key_skills: List[str]
    core_requirements: List[str]
    company_info: str
    tone: str

class AIService:
    def __init__(self, db_pool: Optional[asyncpg.Pool] = None):
        """
        Initialize the AI Service. 
        Takes an optional asyncpg database pool for pgvector operations.
        If db_pool is None, operations requiring DB will use mock responses or raise errors.
        """
        self.db_pool = db_pool
        self.llm = GenerativeModel(MODEL_NAME)
        
    async def analyze_jd(self, jd_text: str) -> JobDescriptionAnalysis:
        """
        Analyzes a Job Description using Gemini 2.5 Flash to extract structured information.
        """
        prompt = f"""
        Analyze the following Job Description and extract the key information in JSON format.
        Include the following fields:
        - job_title: The title of the job
        - company_name: The name of the company (if mentioned, otherwise null)
        - key_skills: Array of top 5-10 technical and soft skills required
        - core_requirements: Array of 3-5 main responsibilities or qualifications
        - company_info: Any context about the company culture or goals mentioned
        - tone: The tone of the JD (e.g., formal, startup-casual, aggressive)

        Job Description:
        {jd_text}
        """
        
        response = self.llm.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        try:
            data = json.loads(response.text)
            return JobDescriptionAnalysis(
                job_title=data.get("job_title", "Unknown Role"),
                company_name=data.get("company_name", "Unknown Company"),
                key_skills=data.get("key_skills", []),
                core_requirements=data.get("core_requirements", []),
                company_info=data.get("company_info", ""),
                tone=data.get("tone", "professional")
            )
        except Exception as e:
            # Return a fallback or raise exception
            raise ValueError(f"Failed to parse JD analysis from Gemini: {str(e)}")

    async def _get_embedding(self, text: str) -> List[float]:
        """
        Generates an embedding for a piece of text using Gemini's embedding model.
        """
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']

    async def _get_query_embedding(self, text: str) -> List[float]:
        """
        Generates an embedding for a search query.
        """
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_query"
        )
        return result['embedding']

    async def store_resume_chunks(self, tenant_id: str, resume_data: Dict[str, Any]):
        """
        Chunks the resume (Experience, Projects, Skills) and stores embeddings in pgvector.
        Assumes a table `resume_chunks` exists:
        CREATE TABLE resume_chunks (
            id SERIAL PRIMARY KEY,
            tenant_id UUID,
            chunk_type VARCHAR(50),
            content TEXT,
            embedding vector(768)
        );
        """
        if not self.db_pool:
            print("WARNING: db_pool not initialized, skipping store_resume_chunks DB insertion.")
            return
            
        chunks = []
        
        # Parse Experience
        for exp in resume_data.get("experience", []):
            content = f"Role: {exp.get('role')} at {exp.get('company')}\n"
            content += f"Duration: {exp.get('duration')}\n"
            content += f"Details: {exp.get('description')}"
            chunks.append(("experience", content))
            
        # Parse Projects
        for proj in resume_data.get("projects", []):
            content = f"Project: {proj.get('name')}\n"
            content += f"Tech Stack: {', '.join(proj.get('tech_stack', []))}\n"
            content += f"Details: {proj.get('description')}"
            chunks.append(("project", content))
            
        # Parse Skills
        if "skills" in resume_data:
            content = f"Skills: {', '.join(resume_data['skills'])}"
            chunks.append(("skills", content))
            
        # Parse Certifications/Achievements
        for cert in resume_data.get("certifications", []):
            content = f"Certification/Achievement: {cert.get('name')}\n"
            content += f"Details: {cert.get('description', '')}"
            chunks.append(("certification", content))
            
        async with self.db_pool.acquire() as conn:
            # Register pgvector type on the connection
            await register_vector(conn)
            
            for chunk_type, content in chunks:
                embedding = await self._get_embedding(content)
                await conn.execute(
                    "INSERT INTO resume_chunks (tenant_id, chunk_type, content, embedding) VALUES ($1, $2, $3, $4)",
                    tenant_id, chunk_type, content, embedding
                )

    async def retrieve_relevant_resume_chunks(self, tenant_id: str, jd_analysis: JobDescriptionAnalysis, limit: int = 5) -> List[Dict[str, str]]:
        """
        Retrieves the most relevant resume chunks for a given Job Description.
        """
        if not self.db_pool:
            # Provide mock data for development testing
            return [
                {"chunk_type": "experience", "content": "Mock: Software Engineer at Tech Corp. Developed Python backends."},
                {"chunk_type": "skills", "content": "Mock Skills: Python, FastAPI, React, PostgreSQL."}
            ]
            
        # Create a search query from JD analysis
        query_text = f"Looking for experience in: {', '.join(jd_analysis.key_skills)}. "
        if jd_analysis.core_requirements:
            query_text += f"Responsibilities include: {', '.join(jd_analysis.core_requirements)}"
        
        query_embedding = await self._get_query_embedding(query_text)
        
        async with self.db_pool.acquire() as conn:
            await register_vector(conn)
            # Use cosine distance (<=>) for similarity
            rows = await conn.fetch("""
                SELECT chunk_type, content, 1 - (embedding <=> $1::vector) as similarity
                FROM resume_chunks
                WHERE tenant_id = $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
            """, query_embedding, tenant_id, limit)
            
            return [{"chunk_type": r["chunk_type"], "content": r["content"]} for r in rows]

    async def generate_tailored_resume(self, tenant_id: str, jd_text: str) -> str:
        """
        RAG flow: Analyze JD -> Retrieve Chunks -> Generate Tailored Resume.
        """
        # 1. Analyze JD
        jd_analysis = await self.analyze_jd(jd_text)
        
        # 2. Retrieve relevant resume chunks
        relevant_chunks = await self.retrieve_relevant_resume_chunks(tenant_id, jd_analysis, limit=6)
        
        # Format the retrieved chunks
        context_text = "\n\n".join([f"[{c['chunk_type'].upper()}]\n{c['content']}" for c in relevant_chunks])
        
        # 3. Generate tailored resume
        prompt = f"""
        You are an expert technical recruiter and resume writer. 
        Your task is to tailor the candidate's resume content to perfectly align with the target job description.

        TARGET JOB DESCRIPTION:
        Title: {jd_analysis.job_title}
        Company: {jd_analysis.company_name}

        CANDIDATE RELEVANT EXPERIENCE & SKILLS (Retrieved from Database):
        {context_text}

        INSTRUCTIONS:
        1. Emphasize the candidate's skills and experiences that match the JD's key requirements.
        2. Rewrite bullet points to be highly impactful (use Action Verbs, quantify results if available).
        3. Do not invent new experiences or skills; only use the provided context.
        4. Output a clean, structured Markdown resume containing:
           - Professional Summary
           - Core Competencies / Skills
           - Professional Experience
           - Projects (if applicable)
        """
        
        response = self.llm.generate_content(prompt)
        return response.text

    async def generate_email(self, tenant_id: str, jd_text: str, tailored_resume: str) -> str:
        """
        Generates a personalized cold email for the job application.
        """
        jd_analysis = await self.analyze_jd(jd_text)
        
        prompt = f"""
        You are an expert in B2B cold outreach and job application emails.
        Write a concise, compelling cold email to the hiring manager or recruiter for this position.

        COMPANY: {jd_analysis.company_name}
        ROLE: {jd_analysis.job_title}
        COMPANY INFO / TONE: {jd_analysis.company_info} | {jd_analysis.tone}

        CANDIDATE TAILORED RESUME SUMMARY:
        {tailored_resume}

        INSTRUCTIONS:
        1. Keep the email under 150 words. Be respectful of their time.
        2. Hook: Mention something specific about the company (if available) or the role.
        3. Value Proposition: Highlight 1-2 key achievements or skills from the resume that directly solve the core requirements.
        4. Call to Action: A low-friction ask (e.g., a quick chat or reviewing the attached resume).
        5. Tone: Professional but conversational. Match the tone of the JD if it's casual.
        6. Format: Output only the Subject Line and Email Body. 

        Example format:
        Subject: [Your Subject Here]

        Hi [Name],
        [Body]
        """
        
        response = self.llm.generate_content(prompt)
        return response.text
