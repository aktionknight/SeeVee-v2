import asyncio
import logging
from app.services.apify_service import run_apify_scrape_job
from app.core.database import Base, engine

logging.basicConfig(level=logging.INFO)

async def test_scrape():
    # We will pass user_id=1, query='Scrape: Ai SaaS startup founders', max_results=2
    print("Running apify scrape job test...")
    await run_apify_scrape_job(user_id=1, query='Ai SaaS startup founders', max_results=2, job_id=1)
    print("Done!")

asyncio.run(test_scrape())
