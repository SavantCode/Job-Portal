# Full-Stack Audit: Bugs Fixed, New Features, Resume Parsing & Security Architecture

This document summarizes all bugs identified and fixed, new production-grade features added, the PDF/Word Resume Parser & Matchmaking system, and security/system design improvements implemented across the codebase.

---

## 1. Bugs Identified & Fixed

1. **Missing Multer Error Handling & File Type Validation (`backend/middlewares/mutler.js`)**:
   - **Bug**: Uploading a file larger than 10MB or an unsupported binary caused an unhandled Multer exception that crashed or returned an HTML error page.
   - **Fix**: Wrapped Multer in a custom error-handling middleware that catches `LIMIT_FILE_SIZE` and file-filter errors and returns structured JSON responses (`400 Bad Request`). Added strict extension validation (`.pdf`, `.doc`, `.docx`, `.txt`, `.rtf`, `.png`, `.jpg`, `.jpeg`, `.webp`).
2. **ReDoS (Regular Expression Denial of Service) in Job Search (`backend/controllers/job.controller.js`)**:
   - **Bug**: Searching for skills with special regex characters such as `C++`, `C#`, or `[React` passed unescaped user input directly into MongoDB `$regex`, causing MongoDB regex syntax errors or catastrophic backtracking.
   - **Fix**: Created `escapeRegex()` in `backend/middlewares/security.js` and applied it to all `$regex` queries in `getAllJobs` and included `requirements` array matching.
3. **Broken Favicon 404 Error (`frontend/index.html`)**:
   - **Bug**: Referenced `/job portal logo.png` which did not exist in `frontend/public`, causing a 404 console error on every page load.
   - **Fix**: Updated `frontend/index.html` to reference `/vite.svg` and added SEO meta tags.
4. **Unmounted `next-themes` Hook in Toast Component (`frontend/src/components/ui/sonner.jsx`)**:
   - **Bug**: Called `useTheme()` from `next-themes` without a `<ThemeProvider>`, which conflicted with the app's custom `.dark` class theme toggle.
   - **Fix**: Simplified `Toaster` so it inherits CSS variables directly from `document.documentElement.classList` (`.dark`).
5. **React Hook Dependency Warnings & Stale Closures (`useGetAllCompanies.jsx`, `useGetAllAdminJobs.jsx`, `useGetAppliedJobs.jsx`)**:
   - **Bug**: `useEffect` hooks omitted `dispatch` from their dependency arrays and left debug `console.log('called')` statements in production.
   - **Fix**: Cleaned up debug logs and added proper dependency arrays.
6. **Null/Undefined Array Crash in `CompaniesTable.jsx`**:
   - **Bug**: `companies.length >= 0 && companies.filter(...)` could throw a `TypeError` if `companies` was `null` in persisted Redux state.
   - **Fix**: Normalized `companies` with `Array.isArray(companies) ? companies : []`.
7. **Unauthorized Job Edit / Delete Protection (`backend/controllers/job.controller.js`)**:
   - **Bug**: `updateJob` and `deleteJob` did not verify that `job.created_by` matched the authenticated recruiter `req.id` (IDOR vulnerability).
   - **Fix**: Added strict ownership verification (`String(job.created_by) !== String(req.id)` returns `403 Forbidden`).

---

## 2. PDF & Word (`.pdf`, `.docx`, `.doc`) Resume Parsing & Job Matchmaking

- **Zero-Dependency Server-Side Resume Parser (`backend/utils/resumeParser.js`)**:
  - **PDF Parsing**: Decompresses `FlateDecode` zlib streams and extracts text from PDF text operators (`Tj`, `TJ`) with an ASCII fallback for custom font encodings.
  - **Word (`.docx` & `.doc`) Parsing**: Reads ZIP local file headers in `.docx` buffers, inflates `word/document.xml` via `zlib.inflateRawSync`, strips XML tags, and preserves paragraph breaks.
  - **Automatic Skill & Metadata Extraction**:
    - Detects 70+ technical skills (`React.js`, `Node.js`, `TypeScript`, `Python`, `AWS`, `Docker`, `MongoDB`, etc.) and automatically merges them into `user.profile.skills`.
    - Detects GitHub, LinkedIn, and Portfolio URLs inside the resume and populates empty social link fields automatically.
    - Computes a `0–100%` **Resume ATS Readiness Score** (`resumeAtsScore`).
- **Convenient In-App Resume Viewer (`frontend/src/components/Profile.jsx`)**:
  - Added a **"View Resume & Parsed ATS Data"** modal on the Candidate Profile page with tabs to view:
    1. **Parsed ATS Text & Auto-Extracted Skills**
    2. **Embedded PDF Document Preview**
    3. **1-Click Upload / Replace PDF or Word Resume**
- **Real-Time Job Matchmaking (`frontend/src/utils/matchmaking.js` & `backend/controllers/ai.controller.js`)**:
  - Every job card (`Job.jsx`, `LatestJobCards.jsx`) now displays a live **"XX% Match"** badge calculated from the user's parsed resume text, extracted skills, manual skills, and project tech stacks.
  - Matched skills on job cards are highlighted with a green `✓` badge.
  - Added **"Sort: Best Resume Match %"** on the `/jobs` page and a **"Top Job Matches for Your Resume"** section on `/profile`.

---

## 3. Rich Candidate Portfolio Features (Projects, Social Links, Experience, Education)

- **Expanded User Schema (`backend/models/user.model.js`)**:
  - `profile.projects`: Array of `{ title, description, techStack, liveUrl, githubUrl }`
  - `profile.socialLinks`: `{ github, linkedin, portfolio, leetcode, twitter }`
  - `profile.experience`: Array of `{ role, company, duration, description }`
  - `profile.education`: Array of `{ degree, institution, year, grade }`
  - `profile.headline`, `currentLocation`, `preferredLocations`, `experienceYears`, `expectedCtc`, `noticePeriod`, and `openToWork` badge.
- **Multi-Tab Profile Editor (`frontend/src/components/UpdateProfileDialog.jsx`)**:
  - Organized into 4 clean tabs: **Basic & Resume**, **Projects**, **Work & Education**, and **Social Links & Preferences**.
- **Profile Completeness Meter (`frontend/src/components/Profile.jsx`)**:
  - Calculates real-time profile completeness (`0–100%`) and guides candidates on what to add next.

---

## 4. Security & System Design Hardening

1. **Tiered Sliding-Window Rate Limiting (`backend/middlewares/security.js` & `backend/index.js`)**:
   - **Global API Limiter**: 500 requests / 15 min per IP with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers.
   - **Auth Brute-Force Limiter**: 40 requests / 15 min on `/api/v1/user/login` and `/api/v1/user/register`.
   - **AI Endpoint Limiter**: 80 requests / 10 min on `/api/v1/ai/*`.
2. **MongoDB NoSQL Injection & Prototype Pollution Sanitizer (`mongoSanitizeAndXss`)**:
   - Recursively strips keys starting with `$` or containing `.` (`$gt`, `$ne`, `$where`, `__proto__`, `constructor`) from `req.body`, `req.query`, and `req.params`.
3. **XSS Payload Sanitization**:
   - Strips `<script>` tags and `javascript:` URIs from incoming string fields.
4. **HTTP Security Headers (`securityHeaders`)**:
   - Sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Strict-Transport-Security`.
5. **Bounded Payload Sizes & Health Check Endpoint**:
   - Enforced `2mb` JSON/URL-encoded body limits and added `GET /api/v1/health` for uptime monitoring.