"""
Job Description Analysis Service
Uses Gemini 2.5 Flash to extract structured information from job descriptions.
"""

import json
import logging

from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_JD_ANALYSIS_PROMPT = """\
You are an expert recruiter and job market analyst. Analyze the following job
description and extract structured information.

Job Description:
\"\"\"
{jd_text}
\"\"\"

CRITICAL RULES:
- Extract ONLY information explicitly stated or clearly implied in the text.
- Never invent skills, requirements, or responsibilities not in the JD.
- If a field cannot be determined from the text, use null or an empty list.

Return a JSON object with this exact structure:
{{
  "role_title": "<extracted job title>",
  "seniority": "<junior|mid|senior|lead|principal|staff|director|vp|c-level|null>",
  "company_name": "<company name if mentioned, else null>",
  "required_skills": ["<skill 1>", "<skill 2>"],
  "preferred_skills": ["<nice-to-have skill 1>"],
  "responsibilities": ["<responsibility 1>", "<responsibility 2>"],
  "keywords": ["<important keyword 1>", "<keyword 2>"],
  "min_experience_years": <number or null>,
  "education_requirements": "<degree requirement or null>",
  "remote_policy": "<remote|hybrid|onsite|null>",
  "summary": "<2-3 sentence summary of the role>"
}}

Output ONLY the JSON object — no markdown fences, no surrounding text.
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_llm_response(raw_text: str) -> dict:
    """Parse the LLM's JSON response, stripping markdown fences if present."""
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse JD analysis JSON: %s", exc)
        return {
            "error": "Failed to parse LLM response",
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

def analyze_job_description(jd_text: str) -> dict:
    """
    Analyze a job description and extract structured role information.

    Args:
        jd_text: Raw text of the job description.

    Returns:
        Structured dict with keys: role_title, seniority, company_name,
        required_skills, preferred_skills, responsibilities, keywords,
        min_experience_years, education_requirements, remote_policy, summary.
    """
    if not jd_text or not jd_text.strip():
        raise ValueError("Cannot analyze empty job description")

    prompt = _JD_ANALYSIS_PROMPT.format(jd_text=jd_text[:20000])  # cap input size
    raw = _call_gemini(prompt)
    result = _parse_llm_response(raw)

    if "error" in result:
        logger.error("JD analysis failed: %s", result.get("error"))
        raise ValueError(result.get("error", "JD analysis failed"))

    return result
