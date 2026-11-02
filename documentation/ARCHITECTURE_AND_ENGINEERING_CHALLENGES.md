# 📐 System Architecture, Feature Design & Engineering Challenges

This document provides a technical deep-dive into the architecture of **JobPortal**, the design decisions behind its core features, and the real-world engineering challenges we encountered and resolved during development.

---

## 1. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 18 + Vite)                          │
│  • Redux Toolkit + Persist (Auth, Jobs, Companies, Applications, Alerts)   │
│  • Real-Time Client Matchmaking Engine (src/utils/matchmaking.js)          │
│  • Isolated A4 Vector Print Window Engine (src/utils/printDocument.js)     │
│  • Web Speech API Voice/Text Mock Interviewer (SpeechSynthesis + STT)      │
└───────────────────────────────────────┬────────────────────────────────────┘
                                        │ REST API (Axios + httpOnly JWT Cookie)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    SECURITY & MIDDLEWARE LAYER (Express)                   │
│  • Custom Security Headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)   │
│  • Recursive NoSQL Injection ($gt/$ne/$where) & Prototype Pollution Guard  │
│  • Sliding-Window IP Rate Limiters (Login, Signup, API, AI Endpoints)      │
│  • Role-Based Access Control (isAuthenticated + isRecruiter Middlewares)   │
└───────────────────────────────────────┬────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌──────────────────────┐   ┌─────────────────────────┐   ┌──────────────────────┐
│  RESUME PARSER &     │   │   HYBRID AI ENGINE      │   │  HIRING PIPELINE &   │
│  STORAGE ENGINE      │   │  (Google Gemini 2.5 +   │   │  NOTIFICATION ENGINE │
│  • Native PDF & DOCX │   │   Deterministic Local   │   │  • 8-Stage Kanban    │
│    Binary Extractor  │   │   Fallback Generators)  │   │  • Nodemailer HTML   │
│  • 120+ Skill Lexicon│   │  • ATS Score & Bullets  │   │    Email + Audit Log │
│  • Cloudinary +      │   │  • 10-Pt Rubric Grader  │   │  • In-App Bell Alerts│
│    DataURI Fallback  │   │  • HR Letter Drafter    │   │  • Google Calendar   │
└──────────┬───────────┘   └────────────┬────────────┘   └──────────┬───────────┘
           └────────────────────────────┼───────────────────────────┘
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER (MongoDB)                           │
│   Users (Portfolio + Parsed Resume) • Companies • Jobs • Applications      │
│   (Multi-Stage + Offer/Joining Letters + Email Logs) • Notifications       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Feature Design & Data Flow

### A. Zero-Dependency PDF & Word (`.docx` / `.doc`) Resume Parsing Pipeline
1. **Upload**: When a candidate uploads a resume in `UpdateProfileDialog.jsx`, Multer captures the file buffer in memory (`singleUpload`).
2. **Binary Extraction (`backend/utils/resumeParser.js`)**:
   - **PDF Files**: Decompresses `FlateDecode` zlib streams and parses PDF text blocks (`BT ... ET`, `Tj`, `TJ` arrays) + UTF-16BE hex strings.
   - **DOCX Files**: Locates PKZIP local file headers (`0x04034b50`), inflates `word/document.xml`, and strips XML tags while preserving paragraph breaks.
   - **Legacy DOC / Plaintext**: Extracts printable ASCII/UTF-16 sequences.
3. **Intelligent Enrichment**:
   - Matches text against a curated lexicon of **120+ engineering skills** using boundary-aware regexes.
   - Extracts **GitHub, LinkedIn, LeetCode, and Portfolio URLs** and auto-populates empty social link fields on the user profile.
   - Calculates a `0–100%` **Resume ATS Readiness Score** based on section completeness, quantifiable metrics (`%`, `x`, latency/revenue numbers), and skill density.

### B. Dual-Layer Candidate-to-Job Matchmaking
- **Instant Card-Level Match (`frontend/src/utils/matchmaking.js`)**: Computes a live match score on every job card in `<1ms` on the client by comparing the candidate's `skills`, `extractedSkills`, `parsedResumeText`, `projects[].techStack`, and `preferredLocations` against `job.requirements`.
- **Deep Job-Page ATS Audit (`GET /api/v1/ai/ats-match/:jobId`)**: Combines server-side resume corpus matching with **AI Resume Bullet Point Generation** (`POST /api/v1/ai/resume-bullets/:jobId`) so candidates can immediately bridge any missing skill gaps.

### C. 8-Stage Enterprise Hiring Workflow & Digital Signatures
- Applications track both legacy `status` (`pending` | `accepted` | `rejected`) for backward compatibility and granular `hiringStage`:
  - `applied` → `shortlisted` → `assignment_sent` → `interview_scheduled` → `interview_passed` → `offer_sent` → `offer_accepted` / `offer_declined` → `hired` / `rejected`.
- Every stage transition triggered by a recruiter:
  1. Updates structured stage metadata (`assignmentDetails`, `interviewDetails`, `offerDetails`, `joiningDetails`).
  2. Appends an immutable entry to `application.emailLogs`.
  3. Dispatches a branded HTML email via `backend/utils/mailer.js` (or logs a safe simulation when SMTP is unconfigured).
  4. Creates a real-time in-app `Notification` for the candidate.

---

## 3. Key Engineering Challenges Faced & How We Resolved Them

### Challenge 1: AI Feature Reliability Without Mandatory Paid API Keys or Quota Failures
- **The Problem**: Relying strictly on external LLM calls (`@google/genai`) causes the application to break during local evaluation if `GEMINI_API_KEY` is missing, rate-limited (`429 Too Many Requests`), or returns malformed JSON.
- **Our Solution**: We architected a **Hybrid AI + Deterministic Fallback Engine** in `backend/controllers/ai.controller.js`.
  - Every AI endpoint (`generateCoverLetter`, `generateInterviewPrep`, `evaluateInterviewAnswer`, `generateResumeBullets`, `generateJobDescription`, `generateHiringStageContent`) first attempts a structured prompt with `gemini-2.5-flash`.
  - If the API key is absent or the network call fails, a deterministic domain-aware generator synthesizes role-specific questions, rubric scores, XYZ resume bullets, or executive HR letters using the actual job requirements and candidate skills.
  - **Result**: 100% uptime and zero broken demos, whether online with Gemini or completely offline.

### Challenge 2: Broken PDF Downloads from Scrollable Modals (`window.print()` Clipping)
- **The Problem**: Calling `window.print()` directly on a React modal (`DialogContent`) only prints the currently visible scroll viewport, includes dark-mode backgrounds or close buttons, and clips multi-page Offer Letters.
- **Our Solution**: We built a dedicated **Isolated A4 Print Window Engine** (`frontend/src/utils/printDocument.js`).
  - Clicking **"Download / Print A4 PDF"** opens a clean, isolated document window injected with `@page { size: A4 portrait; margin: 14mm 16mm; }` and `-webkit-print-color-adjust: exact`.
  - All user-supplied strings are sanitized through `escapeHtml()` to prevent DOM XSS inside the print window.
  - Supports **Offer Letters**, **Appointment/Joining Letters**, **Candidate CVs**, and **AI Mock Interview Reports**.

### Challenge 3: Job Card Text Truncation & Visual Overlap in Multi-Column Grids
- **The Problem**: When displaying 3 job cards per row next to a `288px` sticky filter sidebar, each card was compressed to `<290px` width. Putting the Company Logo, Company Name, `• Posted Today`, `94% Match` badge, and Bookmark button on a single flex row caused severe text truncation (`B...`, `M...`) and visual crowding.
- **Our Solution**:
  1. Restructured the card header in `Job.jsx` and `LatestJobCards.jsx` so the left column gives full breathing room to the **Company Name** and **Location + Timestamp** subtitle, while the right column cleanly houses the **Match % Pill** and **Bookmark Icon**.
  2. Changed the sidebar-adjacent grid in `Jobs.jsx` from 3 columns to a spacious **2-column responsive grid** (`grid-cols-1 md:grid-cols-2 gap-6`), giving every card ~45% more horizontal width.
  3. Replaced unstructured badge wrapping with a high-contrast metadata strip (`Salary LPA`, `Job Type`, `Experience`, `Openings`) and matched skill chips (`✓ React.js`).

### Challenge 4: Resume Uploads Failing When Cloudinary Is Not Configured
- **The Problem**: In many local test environments, developers do not have Cloudinary API keys configured, causing profile updates or resume uploads to throw a `500 Internal Server Error`.
- **Our Solution**:
  - In `backend/controllers/user.controller.js`, we decoupled **Resume Binary Parsing** from **Cloud Storage**.
  - First, `parseResumeBuffer()` extracts the text and skills directly from the in-memory `req.file.buffer`.
  - Next, if `CLOUD_NAME`, `API_KEY`, and `API_SECRET` are present, the file uploads to Cloudinary; otherwise, for files `<= 2MB`, it gracefully falls back to a Base64 DataURI so the candidate can still view/download their uploaded resume and use ATS matchmaking without any external cloud account.

### Challenge 5: Dynamic Sidebar Filters Desynchronized from Seeded/Live Jobs
- **The Problem**: Hardcoded filter sidebars often show cities or salary brackets with `0` results, or miss newly posted locations/skills.
- **Our Solution**:
  - `FilterCard.jsx` dynamically scans `allJobs` in Redux using `useMemo` to aggregate live counts for **Locations** (normalizing `"Bangalore"` and `"Bengaluru"`), **Role & Tech Stack**, **Work Types**, **Experience Levels**, and **Salary Brackets** (`getJobSalaryLPA()`).
  - Includes an inline quick-search input inside the filter card so candidates can filter through dozens of skills or cities instantaneously.

### Challenge 6: Securing MongoDB & Express Without Breaking Frontend Rich Payloads
- **The Problem**: Standard NoSQL injection and XSS middlewares can accidentally corrupt legitimate JSON arrays (such as `projects`, `experience`, and `education` sent inside `multipart/form-data`) or break URLs.
- **Our Solution**:
  - Built `backend/middlewares/security.js` with a recursive NoSQL key sanitizer that strips `$` operators, `.` path traversal keys, and `__proto__`/`constructor` keys while preserving valid nested arrays.
  - Enabled `mongoose.set("sanitizeFilter", true)` and `mongoose.set("strictQuery", true)` globally in `backend/utils/db.js`.
  - Added sliding-window rate limiters (`loginRateLimiter`, `signupRateLimiter`, `aiRateLimiter`, `apiRateLimiter`) that automatically clean up expired IP buckets.