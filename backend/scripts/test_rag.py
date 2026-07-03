import os
import sys

# Add backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.rag_ingestion import ingest_career_data, retrieve_career_context

def main():
    print("Testing RAG Ingestion...")
    
    # Mock career data
    career_data = {
        "projects": [
            {
                "title": "AI Resume Tailor",
                "description": "An AI-powered system that tailors resumes to specific job descriptions.",
                "tech_stack": ["Python", "FastAPI", "React", "Gemini", "ChromaDB"]
            },
            {
                "title": "E-commerce Analytics Dashboard",
                "description": "A real-time analytics dashboard for e-commerce stores.",
                "tech_stack": ["TypeScript", "Next.js", "PostgreSQL", "TailwindCSS"]
            }
        ],
        "roles": [
            {
                "company": "Tech Innovators Inc.",
                "title": "Senior Full Stack Developer",
                "description": "Led the development of scalable web applications and mentored junior developers."
            },
            {
                "company": "Data Solutions LLC",
                "title": "Backend Engineer",
                "description": "Developed and maintained RESTful APIs and microservices using Python and Go."
            }
        ],
        "hackathons": [
            {
                "name": "Global AI Hackathon 2023",
                "project_name": "HealthPredict",
                "description": "Built a predictive model for early disease detection. Won 1st place in the health track."
            }
        ],
        "general_context": "I am a passionate software engineer with 5 years of experience specializing in backend development and AI integrations."
    }
    
    # Ingest data
    try:
        # Note: You need GEMINI_API_KEY environment variable set to run this locally
        # since we're using google-genai
        if not os.environ.get("GEMINI_API_KEY"):
            print("Warning: GEMINI_API_KEY is not set. The embedding generation will likely fail.")
            print("To run a full test, please set the environment variable and run again.")
            
        ingest_result = ingest_career_data(career_data)
        print("Ingestion Result:", ingest_result)
        
        # If ingestion worked (which means embeddings were generated), try retrieval
        if ingest_result.get("status") == "success":
            print("\nTesting RAG Retrieval...")
            queries = [
                "experience with Python and AI",
                "frontend development skills",
                "awards or hackathons won"
            ]
            
            for q in queries:
                print(f"\nQuery: '{q}'")
                results = retrieve_career_context(q, top_k=2)
                for i, res in enumerate(results):
                    print(f"  Result {i+1} (Dist: {res.get('distance', 0):.4f}):")
                    print(f"  Type: {res.get('metadata', {}).get('type')}")
                    print(f"  Content: {res.get('document')}\n")
                    
    except Exception as e:
        print(f"Error during testing: {e}")

if __name__ == "__main__":
    main()
