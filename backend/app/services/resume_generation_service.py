import json
import logging
from google import genai
from app.core.config import settings

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE = """
You are an expert resume writer specializing in High ATS Optimization. Generate a perfectly tailored, 1-page resume based on the candidate's verified profile data and the target job description.

Target Job Description Analysis:
{jd_analysis}

Candidate Profile (Verified Data):
Summary: {summary}
Selected Projects: {projects}
Selected Experiences: {experiences}
Selected Achievements: {achievements}

{extra_notes_section}

CRITICAL ATS & TAILORING INSTRUCTIONS:
1. TAILORED SUMMARY: Write a concise 2-3 sentence Professional Summary strictly aligned with the target role title (e.g., if the job is for Software Development/Frontend/Backend Engineer, focus on web applications, software engineering principles, system design, and API development rather than irrelevant AI framing, unless AI is requested in the JD).
2. CATEGORIZED SKILLS: Categorize the candidate's technical skills into clear, segregated groups (e.g., "Languages", "Frameworks & Libraries", "Tools & Platforms", "Databases & Core CS"). Do NOT return a single continuous un-categorized array.
3. TAILORED EXPERIENCE & PROJECTS: Select and re-frame bullet points using strong action verbs (Architected, Developed, Engineered, Optimized, Implemented) and exact ATS keywords from the JD. Highlight responsibilities and technical accomplishments that directly match the target role.
4. VERIFIED FACTS ONLY: Do NOT hallucinate metrics, titles, or technologies not grounded in the verified data.
5. 1-PAGE LIMIT: Keep descriptions concise and high-impact so the compiled resume fits neatly on a single page.

Output the final resume as a JSON object with this exact schema:
{{
  "summary": "Tailored 2-3 sentence summary specifically aligned to target role title and JD.",
  "skills": {{
    "Languages": ["JavaScript", "TypeScript", "Python", "SQL"],
    "Frameworks & Libraries": ["React", "Node.js", "Express", "TailwindCSS"],
    "Tools & Platforms": ["Git", "Docker", "AWS", "PostgreSQL"],
    "Core CS & Methodology": ["REST APIs", "Agile", "System Architecture"]
  }},
  "projects": [
    {{
      "title": "Project Title",
      "description": "Brief description emphasizing relevant aspects for the target role",
      "technologies": ["Tech 1", "Tech 2"],
      "bullets": ["Action-oriented bullet matching JD keywords"]
    }}
  ],
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "dates": "Start - End",
      "bullets": ["High-impact bullet with action verb and key technology"]
    }}
  ],
  "education": [
    {{
      "institution": "University Name",
      "degree": "Degree Name",
      "dates": "Start - End"
    }}
  ],
  "achievements": [
    {{
      "title": "Award or Certification",
      "description": "Short description",
      "date": "Date"
    }}
  ]
}}
Output ONLY the JSON object. Do not include markdown formatting like ```json.
"""

def generate_tailored_resume(career_profile: dict, jd_analysis: dict, selected_projects: list, selected_experiences: list, selected_achievements: list, extra_notes: str = None) -> dict:
    extra_notes_section = f"User's Extra Custom Instructions:\n{extra_notes}\n" if extra_notes and extra_notes.strip() else ""
    
    prompt = PROMPT_TEMPLATE.format(
        jd_analysis=json.dumps(jd_analysis, indent=2, default=str),
        summary=career_profile.get('summary', ''),
        projects=json.dumps(selected_projects, indent=2, default=str),
        experiences=json.dumps(selected_experiences, indent=2, default=str),
        achievements=json.dumps(selected_achievements, indent=2, default=str),
        extra_notes_section=extra_notes_section
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
