import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from google import genai
from google.genai import types
from app.core.config import settings

# Setup Chroma DB connection
CHROMA_DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_db")
os.makedirs(CHROMA_DB_DIR, exist_ok=True)

chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

COLLECTION_NAME = "career_context"

# Get or create collection
try:
    collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)
except Exception as e:
    # Fallback in case of some initialization error
    collection = chroma_client.create_collection(name=COLLECTION_NAME)


def get_embedding(text: str) -> List[float]:
    """Generate embeddings using google-genai SDK"""
    try:
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        response = client.models.embed_content(
            model='gemini-embedding-2',
            contents=text,
        )
        # Handle different response structures for safety
        if hasattr(response, 'embeddings') and len(response.embeddings) > 0:
            return response.embeddings[0].values
        elif isinstance(response, list) and len(response) > 0:
            return response[0].values
        return []
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []

def ingest_career_data(data: Dict[str, Any], doc_id_prefix: str = "doc_"):
    """
    Ingest raw structured career data into the Vector DB.
    data format:
    {
        "projects": [...],
        "roles": [...],
        "hackathons": [...],
        "general_context": "..."
    }
    """
    documents = []
    metadatas = []
    ids = []
    embeddings = []

    # Process Projects
    for idx, project in enumerate(data.get("projects", [])):
        title = project.get("title", "Project")
        description = project.get("description", "")
        tech_stack = ", ".join(project.get("tech_stack", []))
        
        text = f"Project: {title}\nDescription: {description}\nTech Stack: {tech_stack}"
        documents.append(text)
        metadatas.append({"type": "project", "title": title})
        ids.append(f"{doc_id_prefix}project_{idx}")

    # Process Roles
    for idx, role in enumerate(data.get("roles", [])):
        company = role.get("company", "Company")
        title = role.get("title", "Role")
        description = role.get("description", "")
        
        text = f"Role: {title} at {company}\nDescription: {description}"
        documents.append(text)
        metadatas.append({"type": "role", "company": company})
        ids.append(f"{doc_id_prefix}role_{idx}")

    # Process Hackathons
    for idx, hackathon in enumerate(data.get("hackathons", [])):
        name = hackathon.get("name", "Hackathon")
        project_name = hackathon.get("project_name", "")
        description = hackathon.get("description", "")
        
        text = f"Hackathon: {name}\nProject: {project_name}\nDescription: {description}"
        documents.append(text)
        metadatas.append({"type": "hackathon", "name": name})
        ids.append(f"{doc_id_prefix}hackathon_{idx}")

    # Process General Context
    if "general_context" in data and data["general_context"]:
        text = f"General Context: {data['general_context']}"
        documents.append(text)
        metadatas.append({"type": "general"})
        ids.append(f"{doc_id_prefix}general_0")

    if not documents:
        return {"status": "no data to ingest"}

    # Generate embeddings
    for doc in documents:
        emb = get_embedding(doc)
        embeddings.append(emb)

    # Filter out empty embeddings (if API failed)
    valid_docs, valid_meta, valid_ids, valid_embs = [], [], [], []
    for i, emb in enumerate(embeddings):
        if emb:
            valid_docs.append(documents[i])
            valid_meta.append(metadatas[i])
            valid_ids.append(ids[i])
            valid_embs.append(emb)

    if valid_docs:
        collection.upsert(
            documents=valid_docs,
            metadatas=valid_meta,
            ids=valid_ids,
            embeddings=valid_embs
        )
        return {"status": "success", "ingested_count": len(valid_docs)}
    
    return {"status": "failed", "reason": "could not generate embeddings"}


def retrieve_career_context(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Retrieve the most relevant chunks for a given query."""
    query_embedding = get_embedding(query)
    
    if not query_embedding:
        return []
        
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )
    
    formatted_results = []
    
    if results and "documents" in results and results["documents"]:
        docs = results["documents"][0]
        metas = results["metadatas"][0] if "metadatas" in results and results["metadatas"] else [{}] * len(docs)
        distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(docs)
        
        for doc, meta, dist in zip(docs, metas, distances):
            formatted_results.append({
                "document": doc,
                "metadata": meta,
                "distance": dist
            })
            
    return formatted_results
