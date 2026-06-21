# SeeVee SaaS Roadmap

## Vision
AI-powered platform for:
- Lead generation
- Resume tailoring
- Cold email generation
- Outreach automation
- Application tracking

---

## Core Workflow

```text
User Login
↓
Connect Gmail
↓
Connect Apify
↓
Discover Leads / Jobs
↓
Analyze JD
↓
Resume RAG
↓
Generate Tailored Resume
↓
Generate Personalized Email
↓
Review
↓
Send
↓
Track Responses
```

---

## Tech Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend
- FastAPI

### Database
- PostgreSQL (Supabase)

### Vector Database
- pgvector

### Cache / Queue
- Redis
- Celery / BullMQ

### Authentication
- Google OAuth

### AI
- Gemini 2.5 Flash

### Integrations
- Gmail API
- Apify

---

## Database Design

### users
- id
- email
- name
- created_at

### integrations
- id
- tenant_id
- gmail_connected
- apify_connected
- encrypted_credentials

### jobs
- id
- tenant_id
- title
- company
- description

### resumes
- id
- tenant_id
- version
- content

### campaigns
- id
- tenant_id
- status

### emails
- id
- tenant_id
- lead_id
- subject
- body
- status

---

## Security

### MVP
- Gmail OAuth
- Apify Token
- Encrypted storage
- Redis session cache

### Production
- Persistent encrypted secrets
- Refresh token management
- Never store plaintext credentials

---

## Resume RAG

Store embeddings for:
- Experience
- Projects
- Skills
- Achievements
- Certifications
- GitHub projects

Flow:

```text
JD
↓
Embedding Search
↓
Top Relevant Chunks
↓
Gemini
↓
Tailored Resume
```

---

## Email Generation

Inputs:
- Job description
- Company information
- Resume context
- Relevant achievements

Output:
- Personalized outreach email

Future:
- RAG over successful historical emails and replies

---

## Company Intelligence Layer

Collect:
- Company website
- Job posting
- Recent news
- Hiring signals

Generate:
- Company summary
- Personalization hooks
- Hiring insights

---

## Lead Pipeline

```text
Apify
↓
Scrape
↓
Clean
↓
Deduplicate
↓
Enrich
↓
Store
```

---

## Lead Ranking

### Phase 1
Rule-based scoring:
- Skill match
- Experience match
- Location match
- Role match

### Phase 2
LightGBM ranking model

Features:
- Skill overlap
- Seniority overlap
- Company size
- Historical success

Output:
- Response probability
- Application success probability

---

## Outreach Automation

```text
Lead
↓
Generate Email
↓
Review
↓
Send
↓
Track
↓
Follow Up
```

Follow-ups:
- Day 3
- Day 7
- Day 14

---

## Analytics

Track:
- Emails sent
- Reply rate
- Positive replies
- Applications submitted
- Interviews received

---

## Future AI Features

### Resume Fit Score

Input:
- Resume
- JD

Output:
- Match percentage
- Missing skills

### Resume Variants
- ATS version
- Startup version
- Enterprise version

### Reply Prediction
- Likely reply
- Ignore
- Reject

---

## Agent Roadmap

Current:
- No agents
- Deterministic workflows

Future:
- Research Agent
- Resume Agent
- Email Agent
- QA Agent

Only after validating product-market fit.

---

## Deployment

### Free Tier

Frontend:
- Vercel

Backend:
- Render

Database:
- Supabase

Vector DB:
- pgvector

AI:
- Gemini 2.5 Flash

Scraping:
- User-owned Apify account

Email:
- User-owned Gmail account

---

## MVP Priorities

### Phase 1
1. Auth
2. Gmail integration
3. Apify integration
4. Resume upload
5. JD analysis
6. Resume RAG
7. Email generation
8. Email sending

### Phase 2
1. Company intelligence
2. Lead ranking
3. Follow-up automation
4. Analytics

### Phase 3
1. ML ranking
2. Email RAG
3. Resume fit scoring
4. Agents

---

## Guiding Principle

Build:

Resume RAG + Gemini Flash + Lead Discovery + Personalized Outreach

before adding agents, local LLMs, or complex orchestration.
