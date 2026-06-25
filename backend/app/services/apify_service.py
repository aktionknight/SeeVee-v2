import asyncio
import logging
import re
from apify_client import ApifyClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.integration import Integration
from app.models.lead import Lead
from app.core.encryption import decrypt_value
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


def _build_linkedin_query(user_query: str) -> str:
    """
    Ensures the search query always targets LinkedIn profile pages.
    If the user already included site:linkedin.com, use as-is.
    Otherwise, wrap the user's intent into a LinkedIn-targeted Google query.
    """
    q = user_query.strip()
    if 'site:linkedin.com' in q.lower():
        return q
    # Force Google to only return LinkedIn profile pages
    return f'site:linkedin.com/in/ {q}'


def _parse_linkedin_title(title: str) -> dict:
    """
    Parse a LinkedIn profile title from Google search results.
    
    LinkedIn titles follow these common formats:
      - "First Last - Title at Company | LinkedIn"
      - "First Last - Title - Company | LinkedIn"
      - "First Last | LinkedIn"
      - "First Last – Title – Company | LinkedIn"  (en-dash variant)
    
    Returns dict with 'name', 'role_title', 'company'.
    """
    # Remove the " | LinkedIn" suffix (or "- LinkedIn")
    cleaned = re.sub(r'\s*[\|–-]\s*LinkedIn\s*$', '', title, flags=re.IGNORECASE).strip()
    
    # Split on common separators: " - ", " – ", " | "
    parts = re.split(r'\s+[-–|]\s+', cleaned)
    parts = [p.strip() for p in parts if p.strip()]
    
    name = parts[0] if len(parts) > 0 else 'Unknown'
    role_title = parts[1] if len(parts) > 1 else ''
    company = parts[2] if len(parts) > 2 else ''
    
    # Sometimes the role contains "at Company" — extract company from it
    if role_title and not company:
        at_match = re.match(r'^(.+?)\s+at\s+(.+)$', role_title, re.IGNORECASE)
        if at_match:
            role_title = at_match.group(1).strip()
            company = at_match.group(2).strip()
    
    return {
        'name': name,
        'role_title': role_title,
        'company': company or 'Unknown Company',
    }


def _classify_role(role_title: str, description: str) -> str:
    """Classify a person's role into a category based on their title and description."""
    text = f"{role_title} {description}".lower()
    
    if any(kw in text for kw in ['founder', 'co-founder', 'cofounder', 'ceo', 'owner']):
        return 'founder'
    if any(kw in text for kw in ['recruiter', 'talent acquisition', 'hiring', 'hr manager', 'people ops']):
        return 'recruiter'
    if any(kw in text for kw in ['cto', 'vp engineering', 'head of engineering', 'engineering director', 'engineering manager']):
        return 'engineering_lead'
    if any(kw in text for kw in ['software', 'engineer', 'developer', 'sde', 'swe', 'programmer']):
        return 'engineer'
    if any(kw in text for kw in ['product manager', 'pm', 'head of product', 'vp product']):
        return 'product'
    if any(kw in text for kw in ['marketing', 'growth', 'cmo']):
        return 'marketing'
    if any(kw in text for kw in ['sales', 'business development', 'account executive', 'bdr', 'sdr']):
        return 'sales'
    return 'other'


def _classify_domain(role_title: str, description: str) -> str:
    """Classify the domain/industry of a lead."""
    text = f"{role_title} {description}".lower()
    
    ai_keywords = ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning',
                   'nlp', 'natural language', 'computer vision', 'generative ai', 'llm', 'gpt']
    sde_keywords = ['software', 'web development', 'full stack', 'backend', 'frontend', 'devops',
                    'cloud', 'saas', 'platform']
    
    has_ai = any(kw in text for kw in ai_keywords)
    has_sde = any(kw in text for kw in sde_keywords)
    
    if has_ai and has_sde:
        return 'both'
    if has_ai:
        return 'ai-ml'
    if has_sde:
        return 'sde'
    return 'both'


def _extract_email_from_text(description: str) -> str | None:
    """Try to extract an email address from the Google search result description."""
    if not description:
        return None
    # Simple email regex
    match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', description)
    return match.group(0) if match else None


async def run_apify_scrape_job(user_id: int, query: str, max_results: int = 10, job_id: int = None):
    """
    Runs the Apify scrape job in the background.
    Searches Google for LinkedIn profiles matching the user's query,
    parses profile data from search results, and stores them as leads.
    """
    try:
        async with AsyncSessionLocal() as db:
            # Get apify key
            result = await db.execute(select(Integration).filter(
                Integration.user_id == user_id, Integration.platform == 'apify'))
            integration = result.scalars().first()
            
            if not integration or not integration.encrypted_credentials:
                logger.error(f"Apify integration not found for user {user_id}")
                return
                
            apify_token = decrypt_value(integration.encrypted_credentials)
            client = ApifyClient(apify_token)
            
            actor_id = 'apify/google-search-scraper'
            search_query = _build_linkedin_query(query)
            
            input_data = {
                "queries": search_query,
                "maxPagesPerQuery": max(5, int(max_results / 10) + 1),
                "resultsPerPage": 10,
                "countryCode": "us",
            }
            
            logger.info(f"Starting Apify scrape for user {user_id} | query: {search_query} | max: {max_results}")
            
            # Run sync Apify client in an executor
            loop = asyncio.get_running_loop()
            run = await loop.run_in_executor(
                None, lambda: client.actor(actor_id).call(run_input=input_data))
            
            # Apify client returns a dict, not an object
            if isinstance(run, dict):
                run_id = run.get('id')
                dataset_id = run.get('defaultDatasetId') or run.get('default_dataset_id')
            else:
                run_id = getattr(run, 'id', None)
                dataset_id = getattr(run, 'defaultDatasetId',
                                     getattr(run, 'default_dataset_id', None))
            
            logger.info(f"Apify run completed: run_id={run_id}, dataset_id={dataset_id}")
            
            if not dataset_id:
                logger.error(f"No dataset ID in Apify run result for user {user_id}. Result: {run}")
                return
            
            dataset_items = await loop.run_in_executor(
                None, lambda: client.dataset(dataset_id).list_items().items)
            
            logger.info(f"Fetched {len(dataset_items)} dataset items from Apify")
            
            leads_added = 0
            skipped_non_profile = 0
            skipped_duplicate = 0
            
            for item in dataset_items:
                organic_results = item.get('organicResults', [])
                
                for result in organic_results:
                    if leads_added >= max_results:
                        break
                    
                    url = result.get('url', '')
                    title = result.get('title', '')
                    description = result.get('description', '')
                    
                    # RULE: Only accept actual LinkedIn profile pages
                    if 'linkedin.com/in/' not in url:
                        skipped_non_profile += 1
                        continue
                    
                    # Parse the LinkedIn profile title
                    profile = _parse_linkedin_title(title)
                    
                    # Classify role and domain from title + description
                    role = _classify_role(profile['role_title'], description)
                    domain = _classify_domain(profile['role_title'], description)
                    
                    # Try to extract email from description (rare but possible)
                    email = _extract_email_from_text(description)
                    
                    # Check for duplicates
                    existing = await db.execute(select(Lead).filter(
                        Lead.linkedin_url == url, Lead.user_id == user_id))
                    if existing.scalars().first():
                        skipped_duplicate += 1
                        continue
                    
                    new_lead = Lead(
                        user_id=user_id,
                        company_name=profile['company'],
                        person_name=profile['name'],
                        person_role=role,
                        linkedin_url=url,
                        email=email,
                        domain=domain,
                        region='us',
                        source='apify_scrape',
                        status='new'
                    )
                    db.add(new_lead)
                    leads_added += 1
                    logger.info(f"  + Lead: {profile['name']} | {profile['role_title']} @ {profile['company']} | {url}")
                            
            await db.commit()
            logger.info(
                f"Scrape complete for user {user_id}: "
                f"{leads_added} added, {skipped_duplicate} duplicates, "
                f"{skipped_non_profile} non-profile URLs skipped"
            )
            
            if job_id:
                from app.models.job import Job
                job = await db.execute(select(Job).filter(Job.id == job_id))
                job_record = job.scalars().first()
                if job_record:
                    job_record.status = "completed"
                    await db.commit()
            
    except Exception as e:
        logger.error(f"Apify scraping error for user {user_id}: {e}", exc_info=True)
        if job_id:
            async with AsyncSessionLocal() as db:
                from app.models.job import Job
                job = await db.execute(select(Job).filter(Job.id == job_id))
                job_record = job.scalars().first()
                if job_record:
                    job_record.status = "failed"
                    await db.commit()
