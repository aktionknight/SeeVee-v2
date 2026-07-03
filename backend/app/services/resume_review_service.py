"""
Resume Review Service
Provides AI-powered resume analysis using Gemini 2.5 Flash via the google-genai SDK.
"""

import json
import logging
from typing import Optional

from google import genai
from google.genai import types

from app.core.config import settings
from app.services.rag_ingestion import retrieve_career_context

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

_BASE_REVIEW_PROMPT = """\
You are an expert career coach and ATS (Applicant Tracking System) specialist.
Analyze the following resume and provide a thorough, actionable review.

Resume:
\"\"\"
{resume_text}
\"\"\"
{jd_section}

Return your analysis as a **valid JSON object** with exactly these keys:

{{
  "overall_score": <float 0-100>,
  "strengths": ["<strength 1>", "..."],
  "weaknesses": ["<weakness 1>", "..."],
  "suggestions": ["<actionable suggestion 1>", "..."],
  "ats_compatibility": "<one of: Excellent | Good | Fair | Poor — with a brief explanation>",
  "keyword_analysis": {{
    "present_keywords": ["..."],
    "missing_keywords": ["..."],
    "keyword_density_note": "<brief note>"
  }}
}}

Rules:
- Be specific and constructive — no generic filler.
- Score reflects readiness for the target role (or general market if no JD given).
- ATS compatibility considers formatting, keyword usage, and structure.
- Output ONLY the JSON object, no markdown fences or surrounding text.
"""

_JD_SECTION = """
Job Description to evaluate fit against:
\"\"\"
{job_description}
\"\"\"
"""

_CONTEXT_SECTION = """
Additional career context retrieved from the candidate's portfolio:
\"\"\"
{context}
\"\"\"
Use this context to provide a more informed review and identify relevant experience
the candidate could better highlight.
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_prompt(
    resume_text: str,
    job_description: Optional[str] = None,
    career_context: Optional[str] = None,
) -> str:
    """Assemble the final prompt from template parts."""
    jd_section = ""
    if job_description:
        jd_section = _JD_SECTION.format(job_description=job_description)
    if career_context:
        jd_section += _CONTEXT_SECTION.format(context=career_context)

    return _BASE_REVIEW_PROMPT.format(
        resume_text=resume_text,
        jd_section=jd_section,
    )


def _parse_llm_response(raw_text: str) -> dict:
    """Parse the LLM's JSON response, handling markdown fences gracefully."""
    text = raw_text.strip()
    # Strip optional markdown code fences
    if text.startswith("```"):
        # Remove first line (```json or ```) and last line (```)
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse LLM JSON response: %s", exc)
        return {
            "overall_score": 0.0,
            "strengths": [],
            "weaknesses": [],
            "suggestions": [],
            "ats_compatibility": "Unable to parse",
            "keyword_analysis": {},
            "raw_response": raw_text,
        }


def _call_gemini(prompt: str) -> str:
    """Send a prompt to Gemini 2.5 Flash and return the text response."""
    client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def review_resume(
    resume_text: str,
    job_description: Optional[str] = None,
) -> dict:
    """
    Review a resume using Gemini 2.5 Flash.

    Args:
        resume_text: The full text of the resume.
        job_description: Optional job description to evaluate fit against.

    Returns:
        Structured dict with overall_score, strengths, weaknesses,
        suggestions, ats_compatibility, and keyword_analysis.
    """
    prompt = _build_prompt(resume_text, job_description)
    raw = _call_gemini(prompt)
    return _parse_llm_response(raw)


def review_resume_with_context(
    resume_text: str,
    job_description: str,
    top_k: int = 5,
) -> dict:
    """
    Review a resume with additional career context retrieved from ChromaDB.

    Retrieves relevant career experience using the job description as a query,
    then includes it in the prompt so the LLM can suggest how the candidate
    could better highlight their background.

    Args:
        resume_text: The full text of the resume.
        job_description: The target job description.
        top_k: Number of context chunks to retrieve.

    Returns:
        Same structured dict as review_resume, plus a `relevant_experience`
        field containing the retrieved context snippets.
    """
    # Retrieve relevant career context
    results = retrieve_career_context(query=job_description, top_k=top_k)

    # Deduplicate by document text
    seen = set()
    unique_results = []
    for r in results:
        doc = r["document"]
        if doc not in seen:
            seen.add(doc)
            unique_results.append(r)

    # Build context string
    context_parts = [r["document"] for r in unique_results]
    career_context = "\n---\n".join(context_parts) if context_parts else ""

    prompt = _build_prompt(resume_text, job_description, career_context)
    raw = _call_gemini(prompt)
    result = _parse_llm_response(raw)

    # Attach the retrieved context snippets for transparency
    result["relevant_experience"] = [
        {"document": r["document"], "metadata": r["metadata"]}
        for r in unique_results
    ]

    return result
