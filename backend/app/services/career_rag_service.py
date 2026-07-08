import os
import json
from typing import List, Dict, Any
import chromadb
from app.core.config import settings
from google import genai

CHROMA_DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_db")
os.makedirs(CHROMA_DB_DIR, exist_ok=True)
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
COLLECTION_NAME = "career_evidence"

try:
    collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)
except Exception:
    collection = chroma_client.create_collection(name=COLLECTION_NAME)

def get_embedding(text: str) -> List[float]:
    try:
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        response = client.models.embed_content(
            model='text-embedding-004',
            contents=text,
        )
        if hasattr(response, 'embeddings') and len(response.embeddings) > 0:
            return response.embeddings[0].values
        elif isinstance(response, list) and len(response) > 0:
            return response[0].values
        return []
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []

def index_career_evidence(user_id: int, profile_data: dict, db_session) -> dict:
    """
    Creates evidence chunks from profile entities and stores them in ChromaDB with user_id metadata.
    profile_data is expected to contain keys: 'projects', 'experiences', 'achievements', 'skills'
    """
    documents = []
    metadatas = []
    ids = []
    
    # Process Projects
    for proj in profile_data.get("projects", []):
        tech_stack = ", ".join(proj.get("technologies", []))
        bullets = "\n- ".join(proj.get("bullets", []))
        text = f"Project: {proj.get('title')}\nDescription: {proj.get('description')}\nTechnologies: {tech_stack}\nHighlights:\n- {bullets}"
        documents.append(text)
        metadatas.append({
            "user_id": user_id,
            "entity_type": "project",
            "entity_id": proj.get("id"),
            "entity_title": proj.get("title")
        })
        ids.append(f"user_{user_id}_project_{proj.get('id')}")

    # Process Experiences
    for exp in profile_data.get("experiences", []):
        bullets = "\n- ".join(exp.get("bullets", []))
        text = f"Experience: {exp.get('title')} at {exp.get('company')}\nDescription: {exp.get('description')}\nHighlights:\n- {bullets}"
        documents.append(text)
        metadatas.append({
            "user_id": user_id,
            "entity_type": "experience",
            "entity_id": exp.get("id"),
            "entity_title": exp.get("title")
        })
        ids.append(f"user_{user_id}_experience_{exp.get('id')}")

    # Process Achievements
    for ach in profile_data.get("achievements", []):
        text = f"Achievement ({ach.get('achievement_type')}): {ach.get('title')}\nIssuer: {ach.get('issuer')}\nDescription: {ach.get('description')}"
        documents.append(text)
        metadatas.append({
            "user_id": user_id,
            "entity_type": "achievement",
            "entity_id": ach.get("id"),
            "entity_title": ach.get("title")
        })
        ids.append(f"user_{user_id}_achievement_{ach.get('id')}")

    # Process Skills
    for skill in profile_data.get("skills", []):
        text = f"Skill: {skill.get('name')}\nCategory: {skill.get('category')}\nProficiency: {skill.get('proficiency_level')}"
        documents.append(text)
        metadatas.append({
            "user_id": user_id,
            "entity_type": "skill",
            "entity_id": skill.get("id"),
            "entity_title": skill.get("name")
        })
        ids.append(f"user_{user_id}_skill_{skill.get('id')}")

    if not documents:
        return {"status": "no data to ingest"}

    embeddings = [get_embedding(doc) for doc in documents]
    
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

def retrieve_career_evidence(user_id: int, query: str, top_k: int = 10) -> list:
    query_embedding = get_embedding(query)
    if not query_embedding:
        return []
        
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"user_id": user_id}  # CRITICAL: Prevent cross-user data leakage
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

def rank_projects(jd_analysis: dict, projects: list, evidence_results: list) -> list:
    """
    Hybrid ranking:
    45% semantic relevance (from evidence_results)
    30% required skill overlap
    15% preferred skill overlap
    10% evidence quality (has bullets, tech stack)
    """
    ranked_projects = []
    
    req_skills = set([s.lower() for s in jd_analysis.get('required_skills', [])])
    pref_skills = set([s.lower() for s in jd_analysis.get('preferred_skills', [])])
    
    # Map project IDs to their best semantic distance from Qdrant/Chroma
    semantic_scores = {}
    for ev in evidence_results:
        if ev['metadata'].get('entity_type') == 'project':
            pid = ev['metadata'].get('entity_id')
            # convert distance to a score (lower distance = better score)
            # assuming cosine distance roughly 0 to 2
            score = max(0, 1 - (ev['distance'] / 2.0))
            if pid not in semantic_scores or score > semantic_scores[pid]:
                semantic_scores[pid] = score
                
    for proj in projects:
        techs = set([t.lower() for t in proj.get('technologies', [])])
        
        # 45% semantic relevance
        sem_score = semantic_scores.get(proj.get('id'), 0.0)
        
        # 30% required skill overlap
        req_overlap = len(req_skills.intersection(techs))
        req_score = (req_overlap / len(req_skills)) if req_skills else 1.0
        
        # 15% preferred skill overlap
        pref_overlap = len(pref_skills.intersection(techs))
        pref_score = (pref_overlap / len(pref_skills)) if pref_skills else 1.0
        
        # 10% evidence quality
        ev_score = 0.0
        if proj.get('bullets'): ev_score += 0.5
        if proj.get('technologies'): ev_score += 0.5
        
        final_score = (0.45 * sem_score) + (0.30 * req_score) + (0.15 * pref_score) + (0.10 * ev_score)
        
        proj_copy = proj.copy()
        proj_copy['match_score'] = final_score
        ranked_projects.append(proj_copy)
        
    ranked_projects.sort(key=lambda x: x['match_score'], reverse=True)
    return ranked_projects
