# 🚀 JobPortal — AI-Powered Career & Enterprise Hiring Ecosystem

> **A full-stack MERN + Generative AI recruitment platform featuring PDF/Word Resume Parsing, Real-Time ATS Skill Matchmaking, Voice & Text AI Mock Interviews, Kanban Applicant Tracking, Digital Offer Signing, and A4 PDF Executive Letter Generation.**

[![React 18](https://img.shields.io/badge/Frontend-React_18_%7C_Vite_%7C_Tailwind-6A38C2?style=for-the-badge)](https://react.dev/)
[![Node & Express](https://img.shields.io/badge/Backend-Node.js_%7C_Express-0F172A?style=for-the-badge)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB_%7C_Mongoose-10B981?style=for-the-badge)](https://www.mongodb.com/)
[![Google Gemini AI](https://img.shields.io/badge/AI_Engine-Google_Gemini_2.5_Flash_%2B_Fallback-F83002?style=for-the-badge)](https://ai.google.dev/)

---

## ⚡ 60-Second Executive Summary (For Recruiters & Reviewers)

Unlike standard CRUD job boards, **JobPortal** solves the two biggest bottlenecks in modern hiring: **candidate preparation** and **recruiter pipeline automation**.

| For Candidates (Job Seekers) | For Recruiters (Hiring Managers) |
| :--- | :--- |
| 📄 **Zero-Dependency PDF & Word Resume Parser** that auto-extracts 120+ tech skills, links, and ATS readiness scores on upload. | 📊 **8-Stage Visual Kanban Pipeline** (`Applied` → `Shortlisted` → `Assignment` → `Interview` → `Offer` → `Hired` / `Rejected`). |
| 🎯 **Live ATS Match % on Every Job Card** comparing your parsed resume, skills, and project tech stacks against job requirements. | ✨ **1-Click AI Job Description & Skill Writer** that drafts structured responsibilities and tech stacks from just a role title. |
| 🎙️ **Voice & Text AI Mock Interview Simulator** with 5 role-specific rounds, 10-point rubric grading, and printable A4 PDF reports. | 🏛️ **Executive HR Letter Studio** with AI-drafted Offer Letters, Joining Letters, Google Calendar invites, and HTML email dispatch. |
| ✍️ **Digital Offer Acceptance & A4 Print Engine** to sign employment offers online and download vector A4 PDF Offer/Joining letters. | 🔍 **Candidate Dossier Inspector** to view parsed resume text, portfolio projects, GitHub/LinkedIn links, and submitted assignments. |

---

## 🏆 Quick Demo Credentials (Seeded & Ready to Test)

Run `node backend/seed.js` to populate 3 enterprise recruiters, 6 companies, 12 jobs, and 5 rich candidate profiles across every hiring stage.

| Role | Email | Password | What You Can Demo Immediately |
| :--- | :--- | :--- | :--- |
| **Recruiter (Best All-in-One Demo)** | `recruiter@google.com` | `password123` | Manages **Google India** & **Stripe**. Open **"Senior Full Stack Engineer" → Applicants** to see 5 candidates across `Applied`, `Assignment`, `Interview`, `Offer Sent`, and `Hired` stages! |
| **Candidate (Best All-in-One Demo)** | `aarav@student.com` | `password123` | Has a **94% Parsed Resume**, 2 Portfolio Projects, a **Google Offer Letter (28 LPA)** ready to digitally sign, a **Razorpay Joining Letter PDF**, and an **Atlassian Technical Assignment**. |
| **Candidate (AI/ML Track)** | `priya@student.com` | `password123` | M.Tech AI profile with a scheduled Google Meet interview & high match scores on AI/Data roles. |
| **Recruiter (Microsoft & Atlassian)** | `recruiter@microsoft.com` | `password123` | Manages **Microsoft** & **Atlassian** remote/hybrid engineering roles. |

---

## ✨ Key Platform Features

### 🧠 1. Built-In AI Career Copilot Suite
- **Live ATS Resume & Skill Matcher**: Calculates a real-time `0–100%` compatibility score on job cards and job detail pages, highlighting **Matched Skills** (`✓`) vs. **Missing Keywords** (`+`).
- **AI Resume Bullet Improver**: Generates 3 quantifiable **Google XYZ-format** resume bullet points (`Accomplished [X] as measured by [Y], by doing [Z]`) for any missing skills in 1 click.
- **Interactive Voice & Text AI Mock Interviewer**:
  - Uses the browser's **Web Speech API** (`SpeechSynthesis` + `SpeechRecognition`) for hands-free voice answers and spoken interviewer questions.
  - Grades each answer on a **10-Point Rubric** (`Technical Depth`, `STAR Structure`, `Clarity`, `Overall Score`) with Strengths, Improvements, and an Ideal Reference Answer.
- **1-Click AI Cover Pitch Studio**: Auto-fills job details from any active portal listing (or external JD) to craft a concise 100-word outreach note.

### 📄 2. Native PDF & Word (`.docx` / `.doc`) Resume Parser
- Built-in binary stream parser (`backend/utils/resumeParser.js`) that extracts raw text from **PDF** (`FlateDecode` decompression + text operators), **Word `.docx`** (`word/document.xml` unzipper), and legacy **`.doc`** files.
- Automatically detects **120+ technical skills**, **GitHub/LinkedIn/LeetCode URLs**, and computes an **ATS Readiness Score** without requiring paid third-party OCR APIs.
- Works seamlessly even if Cloudinary credentials are not configured (automatic base64 data-URI fallback).

### 🏢 3. End-to-End Recruiter ATS & Executive Letterhead Engine
- **Visual Kanban Funnel**: Filter applicants by stage, search by skill (e.g., `React`, `Go`, `PyTorch`), and inspect full candidate portfolios.
- **Automated Stage Actions & Email Dispatch**:
  - **Send Technical Assignment**: Attach task instructions, deadline, and reference link; candidates submit their GitHub/live URL directly from their profile.
  - **Schedule Interview**: Generates a **1-Click Google Calendar Invite** link + meeting room URL.
  - **Issue Official Offer & Joining Letters**: Drafts executive letters with CTC breakdown, joining date, probation terms, and reporting manager.
- **Isolated A4 Vector PDF Print Engine**: Generates clean, multi-page `@page { size: A4 portrait }` documents for **Offer Letters**, **Appointment/Joining Letters**, **Candidate CVs**, and **Mock Interview Scorecards**—free of modal scrollbars or UI clipping.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Redux Toolkit + Redux Persist, React Router v6, Tailwind CSS, Radix UI / Shadcn Primitives, Framer Motion, Lucide Icons, Sonner Toasts.
- **Backend**: Node.js, Express.js, MongoDB + Mongoose, JWT Cookie Authentication (`httpOnly`, `sameSite`), Multer Memory Storage, Nodemailer SMTP.
- **AI & Document Processing**: Google Gemini (`@google/genai` — `gemini-2.5-flash`) with deterministic offline fallback generators, Native Node `zlib` PDF/DOCX Parser, Cloudinary (with local fallback).
- **Security**: Custom HTTP Security Headers (CSP, HSTS, X-Frame-Options), NoSQL Operator Sanitizer, XSS Payload Cleaner, Auth & AI Endpoint Rate Limiters.

---

## ⚙️ Local Setup & Installation

### 1. Clone & Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables (`backend/.env`)
Create a `.env` file inside the `backend/` directory:
```env
PORT=8000
MONGO_URI=mongodb://127.0.0.1:27017/jobportal
SECRET_KEY=your_super_secret_jwt_key_here
FRONTEND_URL=http://localhost:5173

# Optional: Google Gemini API Key (Platform includes deterministic smart fallbacks if omitted)
GEMINI_API_KEY=your_gemini_api_key

# Optional: Cloudinary (Platform falls back to inline DataURI if omitted)
CLOUD_NAME=your_cloud_name
API_KEY=your_cloudinary_key
API_SECRET=your_cloudinary_secret

# Optional: Gmail SMTP for real email dispatch (Simulated safely if omitted)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

### 3. Seed Realistic Demo Data & Run
```bash
# Seed recruiters, companies, jobs, parsed resumes, offer letters & notifications
node backend/seed.js

# Start Backend (Port 8000)
cd backend && npm run dev

# Start Frontend (Port 5173)
cd frontend && npm run dev
```

---

## 📚 Additional Documentation
- 📐 **[Architecture, System Design & Engineering Challenges](./documentation/ARCHITECTURE_AND_ENGINEERING_CHALLENGES.md)** — Deep dive into our architecture, data models, security hardening, and how we solved key engineering challenges.
- 🎙️ **[AI Mock Interview Simulator Guide](./documentation/AI_Mock_Interview_Simulator.md)** — Detailed breakdown of the voice/text interview grading pipeline.
- 🔒 **[Security Audit & Changelog](./CHANGELOG_AND_SECURITY_AUDIT.md)** — Summary of OWASP protections, rate limiters, and sanitizers.