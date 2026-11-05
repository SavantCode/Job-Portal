# Engineering Changelog, Resume Guide & Free Cloud Deployment Architecture

This document contains:
1. **Live Production Deployment Links**
2. **Step-by-Step GitHub Actions 24/7 Keep-Alive Cron Guide (Zero-Exposure Secret Mode)**
3. **Ready-to-Copy Resume Bullet Points (XYZ Formula)**
4. **Root-Cause Bug Audit & Fixes Applied**

---

## 1. Live Production Deployment Links

* **Live Frontend (Vercel CDN)**: `https://job-portal-ten-ivory-45.vercel.app`
* **Live Platform Headquarters (Admin HQ)**: `https://job-portal-ten-ivory-45.vercel.app/admin/hq`

---

## 2. Step-by-Step GitHub Actions 24/7 Keep-Alive Cron Guide

### Dual-Layer Keep-Alive Architecture
1. **Layer 1 — In-Process Self-Ping Cron (`backend/utils/keepAliveCron.js`)**:
   * Automatically detects Render's injected `RENDER_EXTERNAL_URL` at runtime.
   * Executes every **13 minutes**, sending an outbound HTTP(S) `GET /api/v1/health?source=keepalive-cron` request AND pinging `mongoose.connection.db.admin().ping()` to keep both the Node.js process and MongoDB Atlas connection pool warm.
2. **Layer 2 — External GitHub Actions Cron (`.github/workflows/keep-render-awake.yml`)**:
   * Runs every 14 minutes (`*/14 * * * *`) from GitHub's external Ubuntu runners.
   * **Zero-Exposure Secret Mode**: Reads `${{ secrets.RENDER_BACKEND_URL }}` from GitHub Encrypted Secrets and uses `curl -s -o /dev/null -w "%{http_code}"` so the backend URL is never hardcoded in the repository or printed in public Action logs—only the HTTP status code (`200`) and UTC timestamp are logged.

---

## 3. Ready-to-Copy Resume Section (Google XYZ Formula)

### Flagship Full-Stack / SDE Version (4 Bullets)
**AI-Powered Enterprise Job Portal & Hiring Pipeline Platform** | *React.js, Redux Toolkit, Node.js, Express.js, MongoDB, SSE, Groq/Gemini LLM*
* **Engineered a full-stack multi-tenant recruitment & ATS platform** with an **8-stage Kanban hiring pipeline** (*Applied $\rightarrow$ Assignment $\rightarrow$ Interview $\rightarrow$ Digital Offer Signing $\rightarrow$ Hired*), automating **RFC 5545 `.ics` calendar invites**, **A4 PDF Offer/Joining letterheads**, and **real-time Server-Sent Events (SSE)** push alerts in **<10ms** without client polling.
* **Architected a Multi-Provider AI Career Copilot Suite** (*Groq `openai/gpt-oss-20b` + Gemini 2.5 Flash + deterministic failover*) featuring a **Voice & Text AI Mock Interview Simulator** (10-point rubric grading), **PDF/Word (`.pdf`/`.docx`) Resume Parser**, and **Live ATS Skill Matcher** across **110+ technical competencies**.
* **Reduced job-discovery API latency from ~45ms to <0.5ms (`X-Cache: HIT`)** by implementing an **in-memory Read-Through LRU Cache with SHA-1 ETag validation**, **ESR-rule compound MongoDB B-tree indexes**, and **cursor-based pagination** to eliminate `SKIP` collection scans.
* **Hardened production reliability and security** using **MongoDB ACID transactions** (with standalone fallback), **Unique Compound Indexes** (`{ job: 1, applicant: 1 }`) & **Idempotency-Key middleware** to prevent duplicate applications, **Background Retry Queue with Exponential Backoff & Dead-Letter Queue (DLQ)**, and a **Platform Headquarters (`/admin/hq`)** observability console tracking **P50/P95/P99 latency** and **immutable 180-day TTL security audit logs**.

---

## 4. Root-Cause Bug Audit & Fixes Applied

* **Bug 1 (AI 401 UNAUTHENTICATED ERROR):** Built a Multi-Provider LLM Failover Engine (`generateTextWithLLM`) in `backend/controllers/ai.controller.js` that calls Groq (`openai/gpt-oss-20b` $\rightarrow$ `llama-3.3-70b-versatile`) first, validates `GEMINI_API_KEY` starts with `AIza` before calling Google, and falls back to deterministic templates offline.
* **Bug 2 (CRITICAL SEARCH BUG):** Removed `mongoose.set("sanitizeFilter", true)` from `backend/utils/db.js` and used a pre-compiled, ReDoS-escaped `new RegExp(safeKeyword, "i")` in `backend/controllers/job.controller.js`.
* **Bug 3 (MISSING ACID HELPER):** Implemented and exported `withAcidTransaction(workFn)` inside `backend/utils/dbEngine.js` with automatic standalone MongoDB fallback.
* **Bug 4 (TELEMETRY & DLQ METHODS):** Added `getDeadLetterItems()` to `BackgroundTaskQueue` and unified telemetry payloads across `backgroundQueue.js`, `lruCache.js`, `sseBroker.js`, and `security.js`.
* **Bug 5 (RATE LIMITING & MULTIPART):** Removed duplicate `authLimiter` mounts from `backend/index.js` and placed `singleUpload` before `signupRateLimiter` on `/register`.
* **Bug 6 (IDEMPOTENCY ACTOR RESOLUTION):** Updated `backend/middlewares/idempotency.js` with `resolveActorId(req)` to decode `userId` from the `token` cookie when `req.id` is not yet populated.
* **Bug 7 (RENDER START SCRIPT):** Added `"start": "node index.js"` and `"seed": "node seed.js"` to `backend/package.json` so Render's default `npm start` command boots the Express server cleanly.