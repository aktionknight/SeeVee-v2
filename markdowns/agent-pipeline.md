# Seevee Founder Personalization Engine

## Goal

Transform:

```text
Founder Profile + Company Data + User Profile
```

into:

```text
Personalized Outreach
├── Cold Email
├── LinkedIn Message
├── Meeting Prep
├── CRM Notes
└── Lead Score
```

The core idea is to build a reusable **Lead Intelligence Layer** rather than generating emails directly from scraped data.

---

# High-Level Architecture

```text
                ┌──────────────────┐
                │ Frontend (NextJS) │
                └─────────┬────────┘
                          │
                          ▼
                ┌──────────────────┐
                │ FastAPI Backend  │
                └─────────┬────────┘
                          │
                          ▼

      ┌─────────────────────────────────────┐
      │ Lead Intelligence Pipeline          │
      └─────────────────────────────────────┘

            ▼
      Research Agent

            ▼
      Insight Agent

            ▼
      Match Agent

            ▼
      Opportunity Agent

            ▼
      Content Generation Agent

            ▼
         Outputs
```

---

# Database Design

## Leads

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY,
    company_name TEXT,
    company_domain TEXT,
    founder_name TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMP
);
```

---

## Raw Scraped Data

```sql
CREATE TABLE raw_profiles (
    lead_id UUID REFERENCES leads(id),

    founder_data JSONB,
    company_data JSONB,
    scraped_posts JSONB,

    created_at TIMESTAMP
);
```

Purpose:

- Cache expensive scraping results
- Avoid repeated Apify usage

---

## Research Output

```sql
CREATE TABLE research_profiles (
    lead_id UUID REFERENCES leads(id),

    normalized_profile JSONB,
    updated_at TIMESTAMP
);
```

Example:

```json
{
  "career_history": [
    "Stripe",
    "YC Startup"
  ],
  "current_focus": [
    "Outbound Automation"
  ],
  "recent_topics": [
    "AI SDRs",
    "Lead Qualification"
  ]
}
```

---

## Insights

```sql
CREATE TABLE lead_insights (
    lead_id UUID REFERENCES leads(id),

    hooks JSONB,
    signals JSONB,
    score FLOAT
);
```

Example:

```json
{
  "hooks": [
    "Worked at Stripe",
    "Recently discussed AI SDRs"
  ]
}
```

---

## Generated Content

```sql
CREATE TABLE generated_content (
    id UUID PRIMARY KEY,

    lead_id UUID REFERENCES leads(id),

    content_type TEXT,

    content TEXT,

    metadata JSONB,

    created_at TIMESTAMP
);
```

Types:

```text
email
linkedin
meeting_prep
crm_note
```

---

# Pipeline Overview

## Step 1: Scraping Layer

### Existing State

You already scrape:

```text
Founder Profile
User Profile
```

Expand to include:

### Founder

```text
Name
Headline
Bio
Experience
Education
Skills
Recent Posts
Company
```

### Company

```text
Website
Description
Funding
Industry
Employees
Recent News
```

### User

```text
Name
Company
Product
Target Market
Value Proposition
Experience
```

---

# Step 2: Research Agent

## Purpose

Convert noisy scraped data into structured information.

### Input

```json
{
  "founder_profile": {},
  "company_profile": {}
}
```

### Gemini Prompt

```text
Analyze the founder profile.

Extract:

1. Career history
2. Industries worked in
3. Current focus
4. Technologies mentioned
5. Company stage
6. Recent interests

Return valid JSON only.
```

### Output

```json
{
  "career_history": [
    "Stripe",
    "YC Startup"
  ],
  "industries": [
    "Fintech",
    "SaaS"
  ],
  "focus": [
    "Sales Automation"
  ]
}
```

### Implementation

```python
research_agent.py
```

```python
response = gemini.generate_content(prompt)
structured_profile = json.loads(response.text)
```

Store in:

```text
research_profiles
```

---

# Step 3: Insight Agent

## Purpose

Generate personalization hooks.

Instead of generating emails immediately.

### Input

```json
{
  "research_profile": {}
}
```

### Prompt

```text
Find interesting founder-specific insights.

Focus on:

- Career transitions
- Unique experiences
- Recent posts
- Public achievements

Return 3-5 hooks.
```

### Output

```json
{
  "hooks": [
    {
      "type": "career",
      "text": "Spent 5 years at Stripe"
    },
    {
      "type": "interest",
      "text": "Recently discussing outbound automation"
    }
  ]
}
```

Store in:

```text
lead_insights
```

---

# Step 4: Match Agent

## Most Important Agent

Most tools skip this.

Personalization should come from:

```text
Founder
      ∩
 User
```

---

### Input

```json
{
  "founder_insights": {},
  "user_profile": {}
}
```

### Prompt

```text
Find meaningful overlap between:

Founder profile
User profile

Identify:

1. Shared interests
2. Shared technologies
3. Similar backgrounds
4. Relevant connections

Return JSON.
```

### Output

```json
{
  "shared_context": [
    "Both focused on outbound automation"
  ]
}
```

---

# Step 5: Opportunity Agent

## Purpose

Determine likely pain points.

### Input

```json
{
  "company_data": {},
  "founder_data": {},
  "product_data": {}
}
```

### Prompt

```text
Given:

Founder
Company
Product

What challenges might this company face that this product can solve?

Return JSON.
```

### Output

```json
{
  "pain_points": [
    "Lead qualification",
    "Manual prospecting"
  ]
}
```

---

# Step 6: Lead Scoring Agent

Generate a quality score.

### Factors

#### Signal Strength

```text
Founder posts frequently
+2
```

#### Relevance

```text
Direct product fit
+4
```

#### Freshness

```text
Recent activity
+2
```

#### Shared Context

```text
Strong overlap
+2
```

### Output

```json
{
  "score": 8.9,
  "reasons": [
    "Strong founder signal",
    "High product relevance"
  ]
}
```

---

# Step 7: Content Generation Agent

## Email Generator

### Input

```json
{
  "hooks": [],
  "shared_context": [],
  "pain_points": [],
  "user_profile": {}
}
```

### Prompt

```text
Generate a cold email.

Requirements:

- Mention exactly one founder hook
- Mention one relevant pain point
- Under 120 words
- No hype
- No buzzwords
- One CTA
```

### Output

```json
{
  "subject": "...",
  "body": "..."
}
```

---

## LinkedIn Generator

Same inputs.

Prompt:

```text
Generate a LinkedIn connection request.

Maximum 300 characters.
```

---

## Meeting Prep Generator

Prompt:

```text
Create a call briefing.

Include:

- Founder background
- Recent interests
- Possible objections
- Talking points
```

---

# API Structure

## Generate Lead Intelligence

```http
POST /api/intelligence/generate
```

Body:

```json
{
  "lead_id": "..."
}
```

---

## Generate Email

```http
POST /api/content/email
```

Body:

```json
{
  "lead_id": "..."
}
```

---

## Generate LinkedIn Message

```http
POST /api/content/linkedin
```

---

## Get Insights

```http
GET /api/leads/{lead_id}/insights
```

---

# Suggested Tech Stack

## Backend

```text
FastAPI
PostgreSQL
SQLAlchemy
Alembic
Redis
```

---

## AI

```text
Gemini 2.5 Pro
```

Use:

```python
response_schema=
```

for structured JSON outputs.

Avoid parsing raw text.

---

## Scraping

### Current

```text
Apify
```

Actors:

```text
LinkedIn Profile Scraper
LinkedIn Company Scraper
Website Content Scraper
```

---

## Queue System

For production:

```text
Redis
Celery
```

or

```text
Redis
RQ
```

Flow:

```text
Scrape
 ↓
Research
 ↓
Insights
 ↓
Matching
 ↓
Content
```

Background jobs prevent long request times.

---

# Production Flow

```text
User clicks "Generate Outreach"

        ↓

Create Job

        ↓

Queue Worker

        ↓

Fetch Cached Scrapes

        ↓

Research Agent

        ↓

Insight Agent

        ↓

Match Agent

        ↓

Opportunity Agent

        ↓

Scoring Agent

        ↓

Email Agent

        ↓

Save Outputs

        ↓

Return Results
```

---

# Future Features

## AI CRM Notes

```text
Key Facts
Recent Activity
Suggested Pitch
Objections
```

---

## Multi-Angle Outreach

Generate:

```text
Career Angle
Technology Angle
Company Angle
Recent Post Angle
```

instead of a single email.

---

## Founder Timeline

```text
2018 → Stripe
2021 → Startup
2024 → Founded Company
2026 → Raised Seed
```

Generated from research profile.

---

## Automatic Follow-Ups

Generate:

```text
Initial Email
Follow-up #1
Follow-up #2
Breakup Email
```

using the same intelligence layer.

---

# Ultimate Goal

Do NOT think:

```text
Lead → Email
```

Build:

```text
Lead
 ↓
Intelligence Layer
 ↓
Emails
LinkedIn DMs
Meeting Prep
CRM Notes
Lead Scoring
Follow-ups
```

The intelligence layer becomes the moat. Every future feature reuses the same structured founder knowledge instead of repeatedly scraping and prompting.