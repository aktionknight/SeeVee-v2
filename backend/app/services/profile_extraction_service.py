"""
Profile Extraction Service
Uses Gemini 2.5 Flash to extract structured career profile data from raw resume text.
"""

import json
import logging
from typing import Optional

from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_EXTRACTION_PROMPT = """\
You are an expert resume parser. Extract structured career information from the
following resume text. Return ONLY a valid JSON object — no markdown fences,
no commentary.

Resume text:
\"\"\"
{resume_text}
\"\"\"

CRITICAL RULES:
- Extract ONLY information explicitly present in the text. NEVER invent, infer,
  or hallucinate data that is not stated.
- If a field is not present in the resume, use null or an empty list as appropriate.
- For dates, use the format found in the resume (e.g. "Jan 2023", "2023", "2023-01").
- For skills, categorise them (e.g. "Languages", "Frameworks", "Databases", "Tools",
  "Cloud", "Soft Skills") based on what the resume states.

Return a JSON object with this exact structure:
{{
  "full_name": "<string or null>",
  "headline": "<string or null — professional title / tagline>",
  "summary": "<string or null — professional summary paragraph>",
  "contact_email": "<string or null>",
  "phone": "<string or null>",
  "location": "<string or null>",
  "linkedin_url": "<string or null>",
  "github_url": "<string or null>",
  "portfolio_url": "<string or null>",
  "skills": [
    {{
      "name": "<skill name>",
      "category": "<category>",
      "proficiency_level": "<from resume or null>"
    }}
  ],
  "projects": [
    {{
      "title": "<project name>",
      "description": "<description>",
      "technologies": ["<tech1>", "<tech2>"],
      "bullets": ["<achievement / detail bullet>"],
      "metrics": ["<quantified result if present>"],
      "start_date": "<date or null>",
      "end_date": "<date or null>",
      "github_url": "<url or null>",
      "live_url": "<url or null>",
      "source_text": "<original text snippet this was extracted from>"
    }}
  ],
  "experiences": [
    {{
      "company": "<company name>",
      "title": "<job title>",
      "location": "<location or null>",
      "start_date": "<date or null>",
      "end_date": "<date or null>",
      "is_current": <true/false>,
      "description": "<role summary>",
      "bullets": ["<responsibility / achievement>"],
      "source_text": "<original text snippet>"
    }}
  ],
  "education": [
    {{
      "institution": "<school name>",
      "degree": "<degree type>",
      "field_of_study": "<major / field>",
      "start_date": "<date or null>",
      "end_date": "<date or null>",
      "gpa": "<GPA or null>",
      "description": "<additional details or null>"
    }}
  ],
  "achievements": [
    {{
      "title": "<achievement title>",
      "description": "<details>",
      "date": "<date or null>",
      "issuer": "<issuing org or null>",
      "achievement_type": "<certification|award|publication|other>"
    }}
  ]
}}

Output ONLY the JSON object.
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
        logger.warning("Failed to parse profile extraction JSON: %s", exc)
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

def extract_career_profile(raw_text: str) -> dict:
    """
    Extract structured career profile data from raw resume text using Gemini.

    Args:
        raw_text: Plain-text content of a resume.

    Returns:
        Structured dict with keys: full_name, headline, summary, contact_email,
        phone, location, linkedin_url, github_url, portfolio_url, skills,
        projects, experiences, education, achievements.
    """
    if not raw_text or not raw_text.strip():
        raise ValueError("Cannot extract profile from empty text")

    prompt = _EXTRACTION_PROMPT.format(resume_text=raw_text[:30000])  # cap input size
    raw = _call_gemini(prompt)
    result = _parse_llm_response(raw)

    if "error" in result:
        logger.error("Profile extraction failed: %s", result.get("error"))
        raise ValueError(result.get("error", "Profile extraction failed"))

    return result
