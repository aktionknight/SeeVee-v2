import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from google import genai
from google.genai import types

from app.core.config import settings
from app.models.lead import Lead
from app.models.intelligence import ResearchProfile, LeadInsight, GeneratedContent

logger = logging.getLogger(__name__)

class LeadIntelligencePipeline:
    def __init__(self, db: AsyncSession):
        self.db = db
        # Initialize Google GenAI client
        self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)

    async def run_pipeline(self, lead_id: int, user_profile: dict, company_data: dict, founder_data: dict, product_data: dict, query: str = None):
        result = await self.db.execute(select(Lead).filter(Lead.id == lead_id))
        lead = result.scalars().first()
        if not lead:
            raise ValueError(f"Lead with ID {lead_id} not found")

        # Step 0: Qualification Agent
        qualification = await self._run_qualification_agent(founder_data, company_data)
        if not qualification.get("is_qualified", True):
            lead.is_qualified = False
            lead.disqualification_reason = qualification.get("reason", "Unknown")
            lead.status = "unqualified"
            await self.db.commit()
            return {
                "status": "unqualified",
                "reason": lead.disqualification_reason
            }

        # Step 1: Research Agent
        research_profile = await self._run_research_agent(lead_id, founder_data, company_data)

        # Step 2: Insight Agent
        insights = await self._run_insight_agent(lead_id, research_profile)

        # Step 3: Match Agent
        match_data = await self._run_match_agent(insights, user_profile)

        # Step 4: Opportunity Agent
        opportunity_data = await self._run_opportunity_agent(company_data, founder_data, product_data)

        # Step 5: Scoring Agent
        scoring_data = await self._run_scoring_agent(lead_id, insights, match_data, opportunity_data)

        # Step 6: Content Generation Agent
        email_content = await self._run_content_generation_email(lead_id, insights, match_data, opportunity_data, user_profile, query)
        linkedin_content = await self._run_content_generation_linkedin(lead_id, insights, match_data, opportunity_data, user_profile)

        return {
            "research_profile": research_profile,
            "insights": insights,
            "match_data": match_data,
            "opportunity_data": opportunity_data,
            "scoring": scoring_data,
            "generated_content": {
                "email": email_content,
                "linkedin": linkedin_content
            }
        }

    async def _call_gemini_json(self, prompt: str) -> dict:
        try:
            import asyncio
            def _sync_call():
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    )
                )
                if not response.text:
                    return {}
                return json.loads(response.text)
            return await asyncio.to_thread(_sync_call)
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            return {}

    async def _run_qualification_agent(self, founder_data: dict, company_data: dict) -> dict:
        prompt = f"""
        Evaluate the following founder and company profile to determine if there is enough substantive information to draft a highly personalized cold email.
        Founder Data: {json.dumps(founder_data)}
        Company Data: {json.dumps(company_data)}

        Criteria for Disqualification:
        1. The company is marked as "Stealth" or "Stealth Startup" with no other details.
        2. The founder profile has virtually no bio, career history, or details beyond a name and title.
        3. The data is largely empty or consists of placeholders.

        Return ONLY valid JSON with keys: 'is_qualified' (boolean) and 'reason' (string explaining why if unqualified, or empty string if qualified).
        """
        return await self._call_gemini_json(prompt)

    async def _run_research_agent(self, lead_id: int, founder_data: dict, company_data: dict) -> dict:
        prompt = f"""
        Analyze the following founder and company profile.
        Founder Data: {json.dumps(founder_data)}
        Company Data: {json.dumps(company_data)}

        Extract:
        1. Career history
        2. Industries worked in
        3. Current focus
        4. Technologies mentioned
        5. Company stage
        6. Recent interests

        Return ONLY valid JSON with keys: career_history (list), industries (list), focus (list), technologies (list), company_stage (string), recent_interests (list).
        """
        result = await self._call_gemini_json(prompt)

        # Save to DB
        db_result = await self.db.execute(select(ResearchProfile).filter(ResearchProfile.lead_id == lead_id))
        db_profile = db_result.scalars().first()
        
        if not db_profile:
            db_profile = ResearchProfile(lead_id=lead_id, normalized_profile=result)
            self.db.add(db_profile)
        else:
            db_profile.normalized_profile = result
        await self.db.commit()

        return result

    async def _run_insight_agent(self, lead_id: int, research_profile: dict) -> dict:
        prompt = f"""
        Find interesting founder-specific insights from this research profile.
        Research Profile: {json.dumps(research_profile)}

        Focus on:
        - Career transitions
        - Unique experiences
        - Recent posts
        - Public achievements

        Return ONLY valid JSON in this format: {{"hooks": [{{"type": "...", "text": "..."}}]}}
        Generate 3-5 hooks.
        """
        result = await self._call_gemini_json(prompt)

        # Save to DB
        db_result = await self.db.execute(select(LeadInsight).filter(LeadInsight.lead_id == lead_id))
        db_insight = db_result.scalars().first()
        
        if not db_insight:
            db_insight = LeadInsight(lead_id=lead_id, hooks=result.get("hooks", []))
            self.db.add(db_insight)
        else:
            db_insight.hooks = result.get("hooks", [])
        await self.db.commit()

        return result

    async def _run_match_agent(self, founder_insights: dict, user_profile: dict) -> dict:
        prompt = f"""
        Find meaningful overlap between the founder profile insights and the user profile.
        Founder Insights: {json.dumps(founder_insights)}
        User Profile: {json.dumps(user_profile)}

        Identify:
        1. Shared interests
        2. Shared technologies
        3. Similar backgrounds
        4. Relevant connections

        Return ONLY valid JSON in this format: {{"shared_context": ["..."]}}
        """
        return await self._call_gemini_json(prompt)

    async def _run_opportunity_agent(self, company_data: dict, founder_data: dict, product_data: dict) -> dict:
        prompt = f"""
        Given the following information:
        Founder: {json.dumps(founder_data)}
        Company: {json.dumps(company_data)}
        Product: {json.dumps(product_data)}

        What challenges might this company face that this product can solve?

        Return ONLY valid JSON in this format: {{"pain_points": ["..."]}}
        """
        return await self._call_gemini_json(prompt)

    async def _run_scoring_agent(self, lead_id: int, insights: dict, match_data: dict, opportunity_data: dict) -> dict:
        prompt = f"""
        Generate a quality score (0 to 10) for this lead based on:
        Insights: {json.dumps(insights)}
        Match Overlap: {json.dumps(match_data)}
        Opportunities/Pain Points: {json.dumps(opportunity_data)}

        Return ONLY valid JSON in this format: {{"score": 8.9, "reasons": ["..."]}}
        """
        result = await self._call_gemini_json(prompt)
        score = result.get("score", 0.0)
        
        # Update Insight with score and signals (reasons)
        db_result = await self.db.execute(select(LeadInsight).filter(LeadInsight.lead_id == lead_id))
        db_insight = db_result.scalars().first()
        
        if db_insight:
            db_insight.score = score
            db_insight.signals = result.get("reasons", [])
            await self.db.commit()
            
        return result

    async def _run_content_generation_email(self, lead_id: int, insights: dict, match_data: dict, opportunity_data: dict, user_profile: dict, query: str = None) -> dict:
        intent_section = f"Intent / Query: {query}\n" if query else ""
        prompt = f"""
        Generate a cold email based on this data:
        Hooks: {json.dumps(insights.get("hooks", []))}
        Shared Context: {json.dumps(match_data.get("shared_context", []))}
        Pain Points: {json.dumps(opportunity_data.get("pain_points", []))}
        User Profile: {json.dumps(user_profile)}
        {intent_section}
        Requirements:
        - Mention exactly one founder hook
        - Mention one relevant pain point
        - Under 120 words
        - No hype
        - No buzzwords
        - One Call to Action (CTA) based on the Intent/Query (if provided) or a general meeting request.

        Return ONLY valid JSON in this format: {{"subject": "...", "body": "..."}}
        """
        result = await self._call_gemini_json(prompt)

        # Save to DB
        content = GeneratedContent(
            lead_id=lead_id,
            content_type="email",
            content=result.get("body", ""),
            metadata_json={"subject": result.get("subject", "")}
        )
        self.db.add(content)
        await self.db.commit()

        return result
        
    async def _run_content_generation_linkedin(self, lead_id: int, insights: dict, match_data: dict, opportunity_data: dict, user_profile: dict) -> dict:
        prompt = f"""
        Generate a LinkedIn connection request message based on this data:
        Hooks: {json.dumps(insights.get("hooks", []))}
        Shared Context: {json.dumps(match_data.get("shared_context", []))}
        Pain Points: {json.dumps(opportunity_data.get("pain_points", []))}
        User Profile: {json.dumps(user_profile)}

        Requirements:
        - Maximum 300 characters
        - Friendly, professional tone

        Return ONLY valid JSON in this format: {{"message": "..."}}
        """
        result = await self._call_gemini_json(prompt)

        # Save to DB
        content = GeneratedContent(
            lead_id=lead_id,
            content_type="linkedin",
            content=result.get("message", ""),
            metadata_json={}
        )
        self.db.add(content)
        await self.db.commit()

        return result
