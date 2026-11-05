# Engineering Changelog, Root-Cause Bug Audit & System Design Architecture Guide

This document provides a structured breakdown of **every bug found and fixed**, **why the backend was crashing or throwing errors**, **how the Multi-Provider LLM Engine (Groq `openai/gpt-oss-20b` + Gemini + Deterministic Fallback) works**, and **the Platform Headquarters (`/admin/hq`) architecture**, written so you can confidently explain every engineering decision to technical interviewers and recruiters.

---

## 1. Root-Cause Bug Audit & Fixes Applied

### Bug 1 (AI 401 UNAUTHENTICATED ERROR): `Gemini fallback used for cover letter: 401 API key not valid`
* **Symptom:** When generating a cover letter, the backend logged:
  `Gemini fallback used for cover letter: {"error":{"code":401,"message":"API key not valid. Please pass a valid API key.","status":"UNAUTHENTICATED","reason":"ACCESS_TOKEN_TYPE_UNSUPPORTED"}}`
* **Root Cause:**
  1. `backend/controllers/ai.controller.js` was only checking `process.env.GEMINI_API_KEY` and completely ignoring `process.env.GROQ_API_KEY` and `process.env.GROQ_MODEL=openai/gpt-oss-20b` configured in `backend/.env`.
  2. When `GEMINI_API_KEY` in `.env` was not a valid `AIza...` Google key (or was an OAuth/Groq token), Google's Generative Language API rejected it with `401 ACCESS_TOKEN_TYPE_UNSUPPORTED`.
* **Fix:**
  1. Built a **Multi-Provider LLM Failover Engine (`generateTextWithLLM`)** in `backend/controllers/ai.controller.js`:
     * **Primary Provider (Groq Cloud):** Uses `process.env.GROQ_API_KEY` and `process.env.GROQ_MODEL` (`openai/gpt-oss-20b`), with automatic model failover to `llama-3.3-70b-versatile` and `<think>...</think>` tag stripping for reasoning models.
     * **Secondary Provider (Google Gemini):** Validates that `GEMINI_API_KEY` starts with `AIza` before calling Google's endpoint, and circuit-breaks on any `401/403` so it never spams the console.
     * **Tertiary Provider (Deterministic Fallback):** Instant domain-specific templates guarantee 100% uptime even offline.

### Bug 2 (CRITICAL SEARCH BUG): `CastError: Cast to string failed for value "{ '$regex': 'react', '$options': 'i' }"`
* **Symptom:** Searching jobs by keyword (`GET /api/v1/job/get?keyword=react`) threw:
  `CastError: Cast to string failed for value "{ '$regex': 'react', '$options': 'i' }" (type Object) at path "title" for model "Job"`
* **Root Cause:** `backend/utils/db.js` had `mongoose.set("sanitizeFilter", true)` enabled globally. In Mongoose, `sanitizeFilter: true` wraps internal query operator objects like `{ $regex: "react", $options: "i" }` inside `{ $eq: ... }`, causing Mongoose to try casting the regex object to a `String`.
* **Fix:** Removed `mongoose.set("sanitizeFilter", true)` from `backend/utils/db.js` (HTTP request sanitization is already enforced at the Express boundary by `mongoSanitizeAndXss` in `backend/middlewares/security.js`) and used a pre-compiled, ReDoS-escaped `new RegExp(safeKeyword, "i")` in `backend/controllers/job.controller.js`.

### Bug 3 (CRITICAL BACKEND STARTUP CRASH): Missing `withAcidTransaction` Export in `backend/utils/dbEngine.js`
* **Symptom:** Starting the backend threw:
  `SyntaxError: The requested module '../utils/dbEngine.js' does not provide an export named 'withAcidTransaction'`
* **Fix:** Implemented and exported `withAcidTransaction(workFn)` inside `backend/utils/dbEngine.js` with full Mongoose `ClientSession` ACID transaction support AND automatic fallback (`workFn(null)`) for local standalone MongoDB instances (error codes `20` and `263`).

### Bug 4: Missing `getDeadLetterItems()` Method & Telemetry Key Mismatches Across Utils
* **Symptom:** Calling `GET /api/v1/system/dlq` threw `TypeError: backgroundQueue.getDeadLetterItems is not a function`, and telemetry counters (`hitRatePercent`, `activeConnections`, `totalEnqueued`, `securityCounters`) showed `0` or `undefined` in Platform Headquarters (`/admin/hq`).
* **Fix:** Added `getDeadLetterItems()` to `BackgroundTaskQueue` and exported unified alias fields across `backgroundQueue.js`, `lruCache.js`, `sseBroker.js`, and `security.js`.

### Bug 5: Double Rate-Limiting & Multipart Form Ordering on `/login` and `/register`
* **Fix:** Removed duplicate `authLimiter` mounts from `backend/index.js` and placed `singleUpload` before `signupRateLimiter` on `/register` in `backend/routes/user.route.js`.

### Bug 6: Idempotency Middleware Running Before JWT Authentication (`req.id === undefined`)
* **Fix:** Updated `backend/middlewares/idempotency.js` with `resolveActorId(req)`, which decodes `userId` from the `token` cookie when `req.id` is not yet populated.

---

## 2. Platform Headquarters (`/admin/hq`) — Full-Stack Architecture

As the platform maintainer connecting **Job Seekers** and **Recruiters**, `/admin/hq` serves as the central observability and moderation command center:

1. **Executive Overview & Visual Analytics (`GET /api/v1/system/hq-overview`)**:
   * **6 Global KPIs**: Total Job Seekers, Parsed Resume Upload %, Verified Recruiters & Companies, Active Jobs, Total Applications & Shortlist Conversion %, Average Candidate ATS Readiness Score, and Total Compliance Audit Events.
   * **8-Stage Hiring Pipeline Conversion Funnel**: Visual progress bars for `Applied` $\rightarrow$ `Shortlisted` $\rightarrow$ `Assignment Sent` $\rightarrow$ `Interview Scheduled` $\rightarrow$ `Interview Passed` $\rightarrow$ `Offer Sent` $\rightarrow$ `Offer Accepted` $\rightarrow$ `Joined / Hired` (plus `Rejected`).
   * **Recruiter Skill Demand vs. Candidate Supply Gap Chart**: Compares the top required skills across all job postings against extracted skills from student resumes.
   * **Geographic & Work-Type Distribution**: Live breakdown of openings by city hub and employment type.
2. **Job Seekers Directory**:
   * Searchable table of all candidates with Open-to-Work status, parsed skills, ATS readiness score, direct link to uploaded CV, and latest application stage.
3. **Recruiters, Companies & All Platform Jobs Moderation**:
   * Multi-tenant table showing each recruiter's companies, jobs posted, applicant volume, and shortlist conversion rate.
   * Full platform job inventory with 1-click **ACID Transaction Job Deletion** (`DELETE /api/v1/system/hq/job/:id`) for moderating spam or expired listings.
4. **System Design, MongoDB Indexes & Per-Route P95 Latency**:
   * High-resolution `process.hrtime.bigint()` latency leaderboard showing request count, average ms, and peak ms per normalized route, alongside P50 / P95 / P99 percentiles and active MongoDB B-Tree, ESR, Full-Text, and TTL indexes.
5. **Immutable Security Audit Trail & Dead-Letter Queue (DLQ)**:
   * Filterable by status (`ALL`, `SUCCESS`, `BLOCKED`, `FAILURE`) and scope (`Platform-Wide` vs `My Account Only`), with 1-click **Record Test Audit Event**, **Export JSON**, **Flush LRU Cache**, and **Replay DLQ Task**.