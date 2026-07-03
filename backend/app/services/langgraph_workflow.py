import os
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from app.services.rag_ingestion import retrieve_career_context

# State definition
class RAGState(TypedDict):
    job_description: str
    master_resume: str
    job_role: Optional[str]
    job_skills: Optional[List[str]]
    retrieval_queries: Optional[List[str]]
    retrieved_context: Optional[str]
    assembled_context: Optional[str]
    tailored_resume: Optional[str]
    cold_email: Optional[str]

# Node functions
def job_analysis_node(state: RAGState) -> dict:
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
    jd = state.get("job_description", "")
    
    prompt = f"Analyze the following job description and extract the role and a comma-separated list of skills:\n{jd}\n\nFormat your response strictly as:\nRole: [Role]\nSkills: [Skill1, Skill2, ...]"
    
    response = llm.invoke(prompt)
    content = response.content
    
    role = "Unknown"
    skills = []
    for line in content.split("\n"):
        if line.startswith("Role:"):
            role = line.replace("Role:", "").strip()
        elif line.startswith("Skills:"):
            skills = [s.strip() for s in line.replace("Skills:", "").split(",")]
            
    return {"job_role": role, "job_skills": skills}

def query_generation_node(state: RAGState) -> dict:
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
    role = state.get("job_role", "")
    skills = state.get("job_skills", [])
    
    prompt = f"Generate 3 to 5 semantic search queries to retrieve relevant projects and experience for a {role} role that requires the following skills: {', '.join(skills)}.\nOutput one query per line."
    
    response = llm.invoke(prompt)
    queries = [line.strip() for line in response.content.split("\n") if line.strip()]
    
    return {"retrieval_queries": queries}

def rag_retriever_node(state: RAGState) -> dict:
    queries = state.get("retrieval_queries", [])
    
    # Retrieve relevant context from ChromaDB for each query
    seen_documents = set()
    unique_documents = []

    for query in queries:
        results = retrieve_career_context(query=query, top_k=5)
        for result in results:
            doc_text = result["document"]
            if doc_text not in seen_documents:
                seen_documents.add(doc_text)
                unique_documents.append(doc_text)

    # Concatenate all unique retrieved documents
    retrieved_context = "\n---\n".join(unique_documents) if unique_documents else "No relevant context found."
    
    return {"retrieved_context": retrieved_context}

def context_assembly_node(state: RAGState) -> dict:
    master_resume = state.get("master_resume", "")
    retrieved_context = state.get("retrieved_context", "")
    
    assembled_context = f"=== Master Resume ===\n{master_resume}\n\n=== Additional Context ===\n{retrieved_context}"
    
    return {"assembled_context": assembled_context}

def resume_tailoring_node(state: RAGState) -> dict:
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
    context = state.get("assembled_context", "")
    jd = state.get("job_description", "")
    
    prompt = f"You are an expert resume writer. Using the context below, rewrite the resume to perfectly fit the provided job description.\nDo not fabricate anything. Rely only on the provided context.\n\nContext:\n{context}\n\nJob Description:\n{jd}\n\nTailored Resume:"
    
    response = llm.invoke(prompt)
    return {"tailored_resume": response.content}

def cold_email_node(state: RAGState) -> dict:
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
    context = state.get("assembled_context", "")
    jd = state.get("job_description", "")
    
    prompt = f"You are a professional outreach expert. Write a personalized cold email to the hiring manager for the job described below. Use the context to demonstrate relevant experience.\n\nContext:\n{context}\n\nJob Description:\n{jd}\n\nCold Email:"
    
    response = llm.invoke(prompt)
    return {"cold_email": response.content}

# Compile Graph
workflow = StateGraph(RAGState)

workflow.add_node("job_analysis", job_analysis_node)
workflow.add_node("query_generation", query_generation_node)
workflow.add_node("rag_retriever", rag_retriever_node)
workflow.add_node("context_assembly", context_assembly_node)
workflow.add_node("resume_tailoring", resume_tailoring_node)
workflow.add_node("cold_email", cold_email_node)

workflow.set_entry_point("job_analysis")
workflow.add_edge("job_analysis", "query_generation")
workflow.add_edge("query_generation", "rag_retriever")
workflow.add_edge("rag_retriever", "context_assembly")
workflow.add_edge("context_assembly", "resume_tailoring")
workflow.add_edge("context_assembly", "cold_email")

# Complete the parallel branches
workflow.add_edge("resume_tailoring", END)
workflow.add_edge("cold_email", END)

app_graph = workflow.compile()
