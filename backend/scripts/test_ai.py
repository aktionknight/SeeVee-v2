import asyncio
from services.ai_service import AIService

async def test_ai_service():
    ai = AIService()
    
    jd = """
    Software Engineer at Tech Innovations Inc.
    We are looking for a Python backend developer with experience in FastAPI, PostgreSQL, and LLM integrations.
    You will be building RAG pipelines and optimizing vector search.
    A self-starter attitude is required. We move fast and break things!
    """
    
    print("Analyzing JD...")
    analysis = await ai.analyze_jd(jd)
    print(f"Title: {analysis.job_title}")
    print(f"Company: {analysis.company_name}")
    print(f"Skills: {analysis.key_skills}")
    
    print("\nRetrieving MOCK chunks...")
    chunks = await ai.retrieve_relevant_resume_chunks("tenant-123", analysis)
    for c in chunks:
        print(c)
        
    print("\nGenerating Tailored Resume...")
    resume = await ai.generate_tailored_resume("tenant-123", jd)
    print(resume[:200] + "...")
    
    print("\nGenerating Email...")
    email = await ai.generate_email("tenant-123", jd, resume)
    print(email)

if __name__ == "__main__":
    # Note: Requires GOOGLE_API_KEY environment variable.
    # asyncio.run(test_ai_service())
    print("Syntax checks out.")
