import json
import logging
from google import genai
from app.core.config import settings

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE = """
You are an expert resume writer. Generate a tailored resume based on the candidate's career profile and the target job description.

Target Job Description Analysis:
{jd_analysis}

Career Profile (Verified Data):
Summary: {summary}
Selected Projects: {projects}
Selected Experiences: {experiences}
Selected Achievements: {achievements}

Instructions:
1. Generate a tailored professional summary.
2. Select and reorder the candidate's skills, placing the ones most relevant to the JD first.
3. Incorporate the selected projects and experiences. Do NOT hallucinate metrics, technologies, or responsibilities. Use ONLY the verified data provided.
4. The total length of resume should not exceed one page when converted to PDF.
4. Output the final resume as a JSON object with the following schema:
{{
  "summary": "Tailored professional summary",
  "skills": ["Skill 1", "Skill 2"],
  "projects": [
    {{
      "title": "Project Title",
      "description": "Brief description",
      "technologies": ["Tech 1"],
      "bullets": ["Impact bullet 1"]
    }}
  ],
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "dates": "Start - End",
      "bullets": ["Action oriented bullet"]
    }}
  ],
  "education": [
    {{
      "institution": "University Name",
      "degree": "Degree",
      "dates": "Start - End"
    }}
    "Achievements & Certifications" : 
    [
    {{
    "achievement": "Award Name",
    "description": "Description of achievement",
    "date": "Date"
    }}
    ]
  ]
}}
Output ONLY the JSON object. Do not include markdown formatting like ```json.
"""

def generate_tailored_resume(career_profile: dict, jd_analysis: dict, selected_projects: list, selected_experiences: list, selected_achievements: list) -> dict:
    prompt = PROMPT_TEMPLATE.format(
        jd_analysis=json.dumps(jd_analysis, indent=2, default=str),
        summary=career_profile.get('summary', ''),
        projects=json.dumps(selected_projects, indent=2, default=str),
        experiences=json.dumps(selected_experiences, indent=2, default=str),
        achievements=json.dumps(selected_achievements, indent=2, default=str)
    )
    
    try:
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        text = response.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:])
            if text.rstrip().endswith("```"):
                text = text.rstrip()[:-3]
        return json.loads(text)
    except Exception as e:
        logger.error(f"Failed to generate tailored resume: {e}")
        return {}
