# Security Audits

This document tracks security vulnerabilities, risks, and recommended mitigations for the project.

## 1. JWT Passed via URL Query Parameters (OAuth Flow)

**Date Logged**: 2026-06-24
**Severity**: Medium / High
**Location**: `backend/app/api/routes/auth.py` (OAuth Callback) & `frontend/src/app/auth/callback/page.tsx`

### Description
Currently, after a successful Google OAuth sign-in, the backend generates a JWT access token and passes it back to the Next.js frontend via a URL query parameter (e.g., `http://localhost:3000/auth/callback?token=xxx`). The frontend then reads this token from the URL and stores it in `localStorage`.

### Vulnerability Vectors
While HTTPS encrypts the URL during transit, exposing tokens in the URL introduces several risks:
1. **Browser History**: The URL (and token) is permanently saved in the user's browser history. Anyone with physical access to the browser later can extract the token.
2. **Server/Proxy Logs**: Any intermediary servers, reverse proxies (like Nginx), CDNs, or analytics platforms typically log full URLs. This causes the tokens to be written in plain text to log files.
3. **Referer Leakage**: If the callback page loads any third-party resources (like images or external scripts) before it redirects away, the URL containing the token may be leaked via the `Referer` HTTP header.
4. **XSS / LocalStorage**: Storing tokens in `localStorage` makes them accessible to JavaScript, leaving the app vulnerable to Cross-Site Scripting (XSS) attacks where malicious scripts could steal the token.

### Recommended Mitigation
Migrate to an **HttpOnly Cookie** architecture:
1. After OAuth success, the backend should set the JWT as an `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`) cookie.
2. The redirect to the frontend should not contain the token in the URL.
3. For all subsequent API requests, the browser will automatically attach the cookie.
4. This completely removes the token from URLs, browser history, and makes it inaccessible to client-side JavaScript, effectively neutralizing both URL-based leaks and XSS token theft.

### Status: ✅ RESOLVED (2026-06-24)
Migrated to HttpOnly cookie-based auth. JWT is now set as an `HttpOnly`, `SameSite=Lax` cookie by the backend OAuth callback. Token is no longer in URLs or localStorage. Frontend uses `credentials: 'include'` for all requests.

---

## 2. No Email verification when custom signup

**Date Logged**: 2026-06-24
**Severity**: Low

### Status: ✅ RESOLVED (2026-06-24)
Email/password signup has been completely removed. All authentication now goes through Google OAuth, which inherently verifies the user's email address.

---

## 3. Encrypted API Key Storage (Apify Tokens)

**Date Logged**: 2026-06-24
**Severity**: Informational (Security Enhancement)
**Location**: `backend/app/core/encryption.py`, `backend/app/models/integration.py`, `backend/app/api/routes/integrations.py`

### Description
Apify API tokens are now encrypted at rest using Fernet (AES-128-CBC with HMAC-SHA256) with a dedicated `ENCRYPTION_KEY` stored in the `.env` file. API keys are encrypted before database writes and only decrypted server-side when making API calls. The frontend never receives raw API keys — only masked versions (e.g., `****xxxx`).

### Security Considerations
1. **Key Management**: The `ENCRYPTION_KEY` is separate from the JWT `SECRET_KEY` to limit blast radius if either is compromised.
2. **Key Rotation**: Consider implementing key versioning to support future key rotation without re-encrypting all records simultaneously.
3. **Production**: The encryption key MUST be stored securely (e.g., environment variable from a secrets manager, not checked into version control).

---

## 4. Encrypted Google OAuth Refresh Tokens

**Date Logged**: 2026-06-24
**Severity**: Informational (Security Enhancement)
**Location**: `backend/app/models/user.py`, `backend/app/api/routes/auth.py`

### Description
Google OAuth refresh tokens (used for Gmail API access) are encrypted at rest using the same Fernet encryption module. The `encrypted_google_refresh_token` column in the `users` table stores the ciphertext. Tokens are only decrypted server-side when making Gmail API calls.

### Security Considerations
1. **Refresh Token Sensitivity**: A Google refresh token is essentially equivalent to long-lived credentials — it can be exchanged for access tokens indefinitely until revoked by the user.
2. **Scope**: The tokens grant `gmail.readonly`, `gmail.send`, and `gmail.compose` scopes, meaning they can read, send, and manage drafts in the user's Gmail.
3. **Re-authentication**: If the refresh token becomes invalid (user revokes access), the system detects this and prompts re-authentication.

---

## 5. CSRF Considerations with Cookie-Based Auth

**Date Logged**: 2026-06-24
**Severity**: Low / Medium
**Location**: `backend/app/core/security.py`, `backend/app/main.py`

### Description
Switching from Bearer token auth to HttpOnly cookies introduces potential CSRF (Cross-Site Request Forgery) risk. A malicious site could potentially make authenticated requests on behalf of the user since the browser automatically attaches cookies.

### Vulnerability Vectors
1. **State-Changing Requests**: POST/PUT/DELETE requests could be triggered by a malicious site embedding forms or using JavaScript.
2. **SameSite Mitigation**: The `SameSite=Lax` cookie attribute mitigates most CSRF attacks — the browser won't send the cookie for cross-site POST requests. However, top-level GET navigations will still include the cookie.

### Current Mitigation
- `SameSite=Lax` is set on the auth cookie, which prevents cross-site POST/PUT/DELETE.
- CORS is configured to only allow the frontend URL.
- State-changing operations use POST/PUT/DELETE (not GET), which `SameSite=Lax` protects.

### Recommended Future Enhancement
For defense-in-depth, consider adding a CSRF token (e.g., double-submit cookie pattern) for high-sensitivity operations.

---

## 6. Gmail API Scope Permissions

**Date Logged**: 2026-06-24
**Severity**: Informational
**Location**: `backend/app/api/routes/auth.py`

### Description
The application requests the following Gmail API scopes during Google OAuth:
- `gmail.readonly` — Read all email messages and metadata
- `gmail.send` — Send emails on behalf of the user
- `gmail.compose` — Create, read, update, and delete drafts

### Security Considerations
1. **Principle of Least Privilege**: These scopes are intentionally limited. We do NOT request `https://mail.google.com/` (full Gmail access) or `gmail.modify` (label/delete operations).
2. **User Consent**: Google's consent screen will explicitly list what the app can do, and users can revoke access at any time from their Google account settings.
3. **Production**: The Google OAuth app must be verified by Google before requesting sensitive scopes for non-test users.

---

## 7. Missing Authentication on Resume Endpoints (IDOR)

**Date Logged**: 2026-07-04
**Severity**: Critical
**Location**: `backend/app/api/routes/resumes.py`

### Description
All resume CRUD endpoints (POST, GET, PUT, DELETE) had no `get_current_user` authentication dependency. Additionally, no `user_id` filtering was applied to queries, meaning any unauthenticated user could create, read, update, or delete any user's resumes.

### Vulnerability Vectors
1. **Unauthenticated Access**: All endpoints were publicly accessible without any login.
2. **Insecure Direct Object Reference (IDOR)**: No user_id scoping — any user could access/modify other users' resumes by guessing IDs.
3. **User ID Spoofing**: The `user_id` field was accepted from the client request body, allowing impersonation.

### Recommended Mitigation
- Add `current_user: User = Depends(get_current_user)` to all endpoints.
- Filter all queries by `Resume.user_id == current_user.id`.
- Auto-set `user_id` from the authenticated user on create; remove from client schema.

### Status: ✅ RESOLVED (2026-07-04)
Authentication and user_id filtering added to all resume endpoints. `user_id` removed from `ResumeCreate` schema.

---

## 8. Missing Authentication on Campaign Endpoints (IDOR)

**Date Logged**: 2026-07-04
**Severity**: Critical
**Location**: `backend/app/api/routes/campaigns.py`

### Description
Identical to Bug 7 — all campaign CRUD endpoints lacked authentication and user_id filtering.

### Vulnerability Vectors
1. **Unauthenticated Access**: All endpoints publicly accessible.
2. **IDOR**: No user scoping on queries.
3. **User ID Spoofing**: `user_id` accepted from client body.

### Recommended Mitigation
Same as Bug 7.

### Status: ✅ RESOLVED (2026-07-04)
Authentication and user_id filtering added to all campaign endpoints. `user_id` removed from `CampaignCreate` schema.

---

## 9. Missing Authentication on RAG Endpoints

**Date Logged**: 2026-07-04
**Severity**: High
**Location**: `backend/app/api/routes/rag.py`

### Description
The `/rag/ingest`, `/rag/retrieve`, and `/rag/tailor` endpoints had no authentication. Anyone could ingest data into the vector DB, retrieve career context, or trigger the LangGraph workflow without being logged in.

### Vulnerability Vectors
1. **Unauthenticated Data Ingestion**: Attackers could poison the vector DB with malicious data.
2. **Information Disclosure**: Career context could be retrieved by anyone.
3. **Resource Abuse**: The LangGraph workflow (which calls Gemini API) could be triggered unlimited times, running up API costs.

### Recommended Mitigation
Add `current_user: User = Depends(get_current_user)` to all RAG endpoints.

### Status: ✅ RESOLVED (2026-07-04)
Authentication added to all three RAG endpoints.

---

## 10. API Key Misconfiguration in RAG Ingestion Service

**Date Logged**: 2026-07-04
**Severity**: High
**Location**: `backend/app/services/rag_ingestion.py`, line 27

### Description
The `get_embedding()` function used `os.environ.get("GEMINI_API_KEY")` to configure the Gemini client, while the rest of the application uses `settings.GOOGLE_API_KEY` from the centralized config. The env var name mismatch (`GEMINI_API_KEY` vs `GOOGLE_API_KEY`) meant the embedding client always received `None` as the API key, causing all embedding generation to silently fail.

### Vulnerability Vectors
1. **Silent Failure**: Embeddings silently return empty lists, causing all RAG ingestion and retrieval to fail without clear errors.
2. **Configuration Drift**: Inconsistent env var names make it easy to miss required variables during deployment.

### Recommended Mitigation
Use `from app.core.config import settings` and `settings.GOOGLE_API_KEY` consistently.

### Status: ✅ RESOLVED (2026-07-04)
Changed to use `settings.GOOGLE_API_KEY` from the centralized config.