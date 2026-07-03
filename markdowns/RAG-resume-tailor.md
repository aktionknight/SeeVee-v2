# RAG-Powered Personalized Resume & Cold Email System

## Objective

Build a Retrieval-Augmented Generation (RAG) layer that transforms SeeVee from a simple resume tailoring tool into a **career intelligence platform**.

Instead of relying only on the uploaded resume, the system maintains a searchable knowledge base of the user's entire professional history, retrieves the most relevant information for each job application, and uses it to generate:

- ATS-optimized resumes
- Personalized cold emails
- Relevant project selection
- Project bullet tailoring
- Interview talking points (future extension)

---

# High-Level Architecture

```text
                        Job URL
                           │
                           ▼
                Company Research Agent
                           │
        ┌──────────────────┴─────────────────┐
        ▼                                    ▼
 Founder Research Agent             Job Description Agent
        │                                    │
        └──────────────────┬─────────────────┘
                           ▼
                Requirement Extraction Agent
                           │
                   Generates Retrieval Query
                           │
                           ▼
                     RAG Retrieval Layer
              (Career Knowledge Vector DB)
                           │
        ┌──────────────┬───────────────┬──────────────┐
        ▼              ▼               ▼              ▼
 Resume Context   Projects       GitHub Data    Achievements
        │              │               │              │
        └──────────────┴───────────────┴──────────────┘
                           │
                           ▼
               Context Assembly Agent
                           │
        ┌──────────────────┴─────────────────┐
        ▼                                    ▼
 Resume Tailoring Agent           Cold Email Agent
        │                                    │
        └──────────────────┬─────────────────┘
                           ▼
                  ATS Evaluation Agent
                           │
                           ▼
                    PDF / DOCX Generator
```

---

# Why RAG?

Without RAG:

```
Resume
+
Job Description
↓

LLM

↓

Tailored Resume
```

The model only knows what is written in a single resume.

---

With RAG:

```
Resume
LinkedIn
GitHub
Portfolio
Hackathons
Certificates
Projects
Research
Blogs

↓

Retriever

↓

Relevant Context

↓

LLM
```

The LLM has access to the user's **entire career history**, not just one document.

---

# Step 1 - Build the Career Knowledge Base

Instead of storing resumes as PDFs, parse everything into structured documents.

## Sources

```
Master Resume(s)

LinkedIn

GitHub

Portfolio

Hackathon submissions

Research Papers

Certificates

Achievements

Blogs

Project Documentation
```

---

## Parsing

Extract plain text and metadata.

Example:

```json
{
    "source":"resume",
    "section":"project",
    "title":"Distributed AI Scheduler",
    "skills":[
        "FastAPI",
        "Redis",
        "Docker"
    ],
    "text":"Developed..."
}
```

---

# Step 2 - Chunking

Each project should become multiple chunks.

Example:

```
Project Overview

Architecture

Tech Stack

Achievements

Results

Metrics

Challenges
```

This produces much better retrieval than embedding an entire resume.

---

# Step 3 - Generate Embeddings

Use Gemini embeddings (or another embedding model).

```
Chunk

↓

Embedding Model

↓

768/1024-dimensional vector
```

Store:

```
Vector

Metadata

Original Text

Document Source
```

---

# Step 4 - Store in Vector Database

Recommended:

- Qdrant
- Pinecone
- Weaviate
- Chroma (development)

Metadata example:

```json
{
    "project":"SeeVee",
    "skills":[
        "LangGraph",
        "FastAPI",
        "Gemini",
        "RAG"
    ],
    "category":"project",
    "year":"2026",
    "resume":"Master Resume"
}
```

---

# Retrieval Flow

## Job Description Agent

Extract:

```json
{
    "role":"Backend AI Engineer",

    "skills":[
        "FastAPI",
        "Docker",
        "Redis",
        "Python",
        "LLMs"
    ],

    "responsibilities":[
        "...",
        "..."
    ],

    "culture":[
        "ownership",
        "open source"
    ]
}
```

---

# Query Generation Agent

Instead of querying with the raw JD, generate semantic queries.

Example:

```
Find:

FastAPI backend

Distributed systems

LLM orchestration

Redis

Docker

API deployment
```

These become retrieval queries.

---

# Retriever

Top-k search:

```
FastAPI

↓

SeeVee Project

↓

Backend Internship

↓

Hackathon

↓

GitHub README

↓

Portfolio
```

Returns only relevant experiences.

---

# Context Assembly

Merge retrieved chunks.

Example:

```
Resume

+

Relevant Projects

+

GitHub

+

Achievements

+

Certificates

↓

Single Context Window
```

This context is passed to downstream agents.

---

# Resume Tailoring Agent

## Input

```
Job Description

Retrieved Context

Master Resume
```

Prompt:

```
Rewrite the resume.

Rules:

Never fabricate experience.

Never invent skills.

Prefer retrieved projects.

Reorder sections.

Rewrite bullets.

Improve ATS keywords.

Maintain factual correctness.
```

Output:

```
Tailored Resume JSON
```

---

# Project Selection

## Problem

The user has:

```
20 Projects
```

Resume can only include:

```
3 Projects
```

---

Instead of asking the LLM to choose randomly,

retrieve the most relevant ones.

Example:

```
JD:

Blockchain

↓

Retriever

↓

Smart Contract Project

↓

Ethereum Wallet

↓

Supply Chain DApp
```

Those become the featured projects.

---

# Project Bullet Tailoring

Each retrieved project contains:

```
README

Architecture

Metrics

GitHub

Portfolio

Documentation
```

Instead of

```
Built AI chatbot.
```

Generate

```
Developed a production-ready multi-agent AI assistant using LangGraph,
Gemini 2.5 and FastAPI with RAG-based document retrieval.
```

No hallucination.

Only retrieved facts.

---

# Personalized Cold Email

This is where the founder research becomes powerful.

Pipeline:

```
Founder Profile

+

Company Research

+

Retrieved Career Context

↓

Cold Email Agent
```

---

Suppose founder values:

```
Distributed AI

Open Source

Agent Systems
```

Retriever searches:

```
Find:

Distributed systems

Agents

Open source

Hackathons

Research
```

Returns:

```
SeeVee

Snapdragon Hackathon

Open-source contribution

Distributed Scheduler
```

Cold email becomes:

> Hi <Founder>,
>
> While reading about your work on distributed AI infrastructure, I noticed your emphasis on modular agent systems. I recently built SeeVee, a multi-agent platform orchestrated with LangGraph and Gemini 2.5 that automatically researches founders, retrieves relevant career context using RAG, and generates personalized outreach and ATS-optimized resumes. That overlap in designing autonomous AI workflows is what motivated me to reach out...

Notice the email references **real experiences** retrieved from the knowledge base, not generic claims.

---

# ATS Evaluation Agent

Evaluate:

```
Keyword Coverage

Skill Match

Action Verbs

Resume Length

Formatting

Missing Technologies

Project Relevance
```

Generate:

```
ATS Score

Keyword Coverage

Missing Skills

Suggestions
```

---

# Final Outputs

Generate:

- Tailored Resume (PDF)
- Tailored Resume (DOCX)
- ATS Report
- Personalized Cold Email
- Selected Projects
- Missing Skill Recommendations

---

# LangGraph Workflow

```text
START

↓

Company Research Node

↓

Founder Research Node

↓

Job Analysis Node

↓

Requirement Extraction Node

↓

Retrieval Query Node

↓

RAG Retriever

↓

Context Assembly

↓

──────────── Parallel Execution ────────────

Resume Tailoring Node

Cold Email Node

ATS Evaluation Node

────────────────────────────────────────────

↓

Formatting Node

↓

END
```

---

# Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI |
| Agent Orchestration | LangGraph |
| LLM | Gemini 2.5 |
| Embeddings | Gemini Embeddings |
| Vector Database | Qdrant (recommended) |
| Resume Parsing | PyMuPDF + python-docx 
|
| GitHub Parsing | GitHub API |
| LinkedIn Parsing | Apify |
| Company Research | Apify Actors |
| Founder Research | Apify + Gemini |
| PDF Generation | WeasyPrint / LaTeX |
| Storage | MongoDB |
| Authentication | Firebase / Clerk (optional) |

---

# Future Extensions

## Interview Preparation

Retrieve experiences relevant to common interview questions.

Example:

```
Question:

Tell me about a challenging backend project.

↓

Retriever

↓

SeeVee

↓

Architecture Docs

↓

Metrics

↓

Generated STAR answer
```

---

## Dynamic Portfolio

Generate a customized portfolio page using the same retrieved projects and achievements.

---

## AI Career Copilot

Use the career knowledge base to:

- Recommend missing skills based on target roles.
- Suggest projects to build for skill gaps.
- Track application history.
- Analyze recruiter responses.
- Continuously improve resumes and outreach based on outcomes.

This transforms the RAG layer into a reusable intelligence engine that powers every feature in the application, rather than serving only resume tailoring.