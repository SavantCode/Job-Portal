# 🛠️ JobPortal — Full-Stack Issues & Bug Fix Tracker

This document tracks all bugs, security vulnerabilities, and UI/UX edge cases discovered across the **Backend** and **Frontend**, along with their resolution status.

---

## ✅ Newly Identified & Fixed Bugs (Latest Audit)

### Backend Fixes
| ID | File(s) | Bug / Issue Description | Resolution | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-BE-01** | `backend/middlewares/isAuthenticated.js`, `company.route.js`, `job.route.js`, `application.route.js` | **Missing Role-Based Access Control (`isRecruiter`)**: Recruiter-only routes (`/job/post`, `/job/update/:id`, `/job/delete/:id`, `/company/register`, `/company/update/:id`, `/application/:id/applicants`, `/application/status/:id/update`, `/application/:id/hiring-action`) only checked `isAuthenticated`. A logged-in student could invoke recruiter APIs directly. | Added `isRecruiter` middleware with DB role verification fallback and attached it to all recruiter/admin routes. | ✅ **FIXED** |
| **BUG-BE-02** | `backend/models/user.model.js` | **`phoneNumber` Schema Type `Number` CastError**: Storing `phoneNumber` as a `Number` caused Mongoose `CastError` when users entered `+91`, spaces, or dashes, and stripped leading zeros. | Changed `phoneNumber` schema type from `Number` to `String`. | ✅ **FIXED** |
| **BUG-BE-03** | `backend/middlewares/mutler.js` | **Unbounded In-Memory File Upload**: `multer.memoryStorage()` had no `fileSize` limit, allowing large uploads to exhaust Node.js RAM. | Added `limits: { fileSize: 10 * 1024 * 1024 }` (10 MB cap) to `singleUpload`. | ✅ **FIXED** |

### Frontend Fixes
| ID | File(s) | Bug / Issue Description | Resolution | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-FE-01** | `frontend/src/index.css`, `HeroSection.jsx`, `Footer.jsx`, `Navbar.jsx` | **Tailwind v4 Utility Classes in Tailwind v3 Project**: Classes like `shadow-2xs`, `shadow-xs`, `focus:outline-hidden`, `py-0.2`, and suffix important modifiers (`bg-transparent! border-none!`) were not generating CSS in Tailwind v3. | Added compatibility utilities in `index.css` for `.shadow-2xs`, `.shadow-xs`, `.focus:outline-hidden`, `.py-0.2`, and converted suffix `!` modifiers to prefix `!bg-transparent !border-none`. | ✅ **FIXED** |
| **BUG-FE-02** | `frontend/src/components/shared/Navbar.jsx` | **Cross-User Redux Persist Data Leak on Logout**: Logging out only cleared `auth.user`, leaving `allAppliedJobs`, `allAdminJobs`, `companies`, `applicants`, and `notifications` in `localStorage` for the next user on the same browser. | Dispatched reset actions for `job`, `company`, `application`, and `notification` slices inside `logoutHandler`. | ✅ **FIXED** |
| **BUG-FE-03** | `frontend/src/components/shared/Navbar.jsx` | **Missing Mobile Navigation Menu**: `<nav className="hidden md:block">` hid all navigation links on mobile viewports (`< 768px`) with no mobile toggle button or drawer. | Added a responsive mobile menu toggle button and collapsible navigation drawer in `Navbar.jsx`. | ✅ **FIXED** |
| **BUG-FE-04** | `frontend/src/components/JobDescription.jsx` | **Stale Job & AI State Flash Between Job Pages**: Navigating from Job A to Job B briefly displayed Job A's `atsData`, `resumeBullets`, `interviewQuestions`, and `isApplied` state until the network call finished. | Reset `atsData`, `resumeBullets`, `interviewQuestions`, and `coverNote` on `jobId` change and verified `singleJob._id === jobId` before computing initial application status. | ✅ **FIXED** |
| **BUG-FE-05** | `frontend/src/components/admin/PostJob.jsx` | **`PostJob.jsx` Hardcoded Select Options vs. AI Auto-Write**: `PostJob` didn't fetch companies on mount (`useGetAllCompanies()` was missing if visiting `/admin/jobs/create` directly) and couldn't display custom AI-suggested salary or experience values if they weren't in the static list. | Added `useGetAllCompanies()` on mount and dynamically merged any custom/AI salary, location, or experience values into the `<Select>` options. | ✅ **FIXED** |
| **BUG-FE-06** | `frontend/src/components/shared/Footer.jsx` | **Misaligned Twitter Social Icon**: The Twitter `<a>` tag had `className="w-4 h-4"` instead of the circular button classes used on LinkedIn, Facebook, and GitHub. | Applied matching `w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#6A38C2] hover:text-white transition-colors` classes. | ✅ **FIXED** |
| **BUG-FE-07** | `frontend/src/components/Browse.jsx` | **Premature Search Query Reset on Unmount**: `Browse.jsx` cleared `searchedQuery` in an unmount cleanup effect, which could overwrite active searches when navigating to `/jobs`. | Removed the destructive unmount cleanup effect while keeping explicit Reset buttons. | ✅ **FIXED** |
| **BUG-FE-08** | `frontend/src/utils/printDocument.js` | **Unescaped HTML Interpolation in A4 PDF Print Window**: Candidate name, company name, job title, skills, and offer/joining table fields were interpolated directly into `printWin.document.write()`. | Added `escapeHtml()` sanitizer and applied it across `printA4Letterhead`, `printCandidateCV`, and `printMockInterviewReport`. | ✅ **FIXED** |
| **BUG-FE-09** | `frontend/src/utils/constant.js` | **Hardcoded Localhost API URL**: All endpoints were hardcoded to `http://localhost:8000/api/v1`. | Added `import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"` fallback support. | ✅ **FIXED** |

---

## 📜 Previously Resolved Milestones & Features

1. **Multi-Stage Kanban Hiring Pipeline**: Implemented end-to-end stage transitions (`applied`, `shortlisted`, `assignment_sent`, `interview_scheduled`, `interview_passed`, `offer_sent`, `offer_accepted`, `offer_declined`, `hired`, `rejected`) with automated email notifications and in-app alerts.
2. **Two-Way Offer Letter Digital Signing**: Candidates can digitally sign & accept or decline employment offers from their Candidate Portal, notifying the recruiter in real time.
3. **Interactive Voice & Text AI Mock Interview Simulator**: 5-question role-specific interview simulator with Web Speech API STT/TTS, 10-point Bar-Raiser rubric grading, and printable A4 readiness reports.
4. **Live ATS Skill Matcher & XYZ Resume Bullet Generator**: Real-time 0–100% ATS score calculation, matched/missing skill chips, and 1-click quantifiable resume bullet generation.
5. **Dark Mode & Dynamic Filter Synchronization**: Persistent light/dark theme toggle and live job count badges across City, Tech Stack, Work Type, Experience, and Salary filters.