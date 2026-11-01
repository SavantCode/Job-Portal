# 🛠️ Project Issues & Bug Fix Tracker

This document tracks all bugs, edge cases, and architectural improvements identified and resolved across the **Job Portal** codebase.

---

## ✅ Batch 1: Core Hiring Workflow, Auth & Filtering Bugs (Resolved)

### 1. Missing Offer Accept / Reject ("Decline") Controls in Notifications (`Notifications.jsx`)
- **Problem:** When a candidate received an Offer Letter notification in `/notifications` and clicked **"Inspect Details"**, the modal displayed the offer summary and A4 PDF print button, but had **no buttons to Accept or Decline the offer**—forcing the user to navigate away.
- **Resolution:** Added a direct **Accept Offer / Decline Offer** digital signature panel inside the Notification Inspector modal (as well as direct **Submit Assignment** input for assignment notifications) and synced state across Redux.

### 2. Hidden Offer Response Card in Profile (`AppliedJobTable.jsx`)
- **Problem:** In `AppliedJobTable.jsx`, the Offer Letter & Accept/Decline panel was gated strictly on `activeAppModal.offerDetails?.ctc`. If `ctc` was omitted or the stage was changed to `offer_sent`, the Accept/Decline buttons did not render. Additionally, declining an offer required a signature string.
- **Resolution:** Added an explicit **"Accept / Decline Offer"** action button in the table row when `hiringStage === "offer_sent"`, broadened the modal check (`hasOfferSection`), and allowed 1-click offer rejection without blocking on signature validation.

### 3. Missing `isAuthenticated` Middleware on Candidate AI Routes (`backend/routes/ai.route.js`)
- **Problem:** `/generate-cover-letter/:jobId?`, `/ats-match/:jobId`, `/interview-prep/:jobId`, and `/resume-bullets/:jobId` did not include `isAuthenticated` middleware, leaving `req.id` undefined.
- **Resolution:** Added `isAuthenticated` middleware to all AI routes and added a safe JWT fallback (`resolveUserId`) in `backend/controllers/ai.controller.js`.

### 4. Application Withdraw Endpoint ID Mismatch (`JobDescription.jsx` vs `AppliedJobTable.jsx`)
- **Problem:** `JobDescription.jsx` passed `jobId` to `DELETE /api/v1/application/withdraw/:id`, while `AppliedJobTable.jsx` passed `applicationId`. Also, withdrawing from `JobDescription.jsx` didn't update `allAppliedJobs` in Redux.
- **Resolution:** Standardized `withdrawJobHandler` to pass `userApplication?._id || jobId` and synchronize both `singleJob` and `allAppliedJobs` in Redux.

### 5. Guest Users Blocked from Viewing Job Descriptions (`backend/routes/job.route.js`)
- **Problem:** `GET /api/v1/job/get/:id` required `isAuthenticated`, causing unauthenticated visitors clicking "Details" on any job card to hit a `401 Unauthorized` error.
- **Resolution:** Made `GET /api/v1/job/get/:id` public while adding clean `requireAuth()` guards on interactive actions ("Apply Now", "Save For Later", and AI tools).

### 6. Salary Filter Range Mismatch (`Jobs.jsx` & `useGetAllJobs.jsx`)
- **Problem:** Filtering by salary in `Jobs.jsx` used `jobSal.includes(jobFilters.salary)`, which failed whenever a job had a single numeric salary like `"12"` LPA and the user selected `"10-15"` LPA. Also, `useGetAllJobs.jsx` was missing `searchedQuery` in its `useEffect` dependency array.
- **Resolution:** Implemented `matchesSalaryFilter()` in `Jobs.jsx` to parse numeric and range overlaps, and updated `useGetAllJobs.jsx` dependencies.

### 7. Recruiter Analytics & Auth Form Crash Fixes (`AdminJobs.jsx`, `Login.jsx`, `Signup.jsx`, `CompanyCreate.jsx`, `Profile.jsx`)
- **Problem:**
  - `AdminJobs.jsx` only checked `app.status` instead of `app.hiringStage` for conversion metrics.
  - `Login.jsx` and `Signup.jsx` accessed `error.response.data.message` without optional chaining and had email placeholders on password inputs.
  - `CompanyCreate.jsx` swallowed errors silently in `catch`.
  - `Profile.jsx` re-triggered `loadingSavedJobs` flicker whenever a job was unsaved.
- **Resolution:** Fixed all 5 components with proper optional chaining, validation toasts, multi-stage analytics, and flicker-free state updates.

---

## ✅ Batch 2: Interactive AI Mock Interview Simulator (Resolved)

### 8. Static Interview Prep Upgraded to Voice + Text Simulator (`MockInterviewSimulator.jsx`, `ai.controller.js`, `printDocument.js`)
- **Enhancement:** Upgraded static interview questions into a full **5-Round Interactive AI Mock Interview Simulator** supporting:
  - **Live Voice Interview Mode** (`window.SpeechRecognition` + `window.speechSynthesis`)
  - **Structured Text Q&A Mode**
  - **Instant 10-Point AI Rubric Evaluation** (`POST /api/v1/ai/evaluate-interview-answer`)
  - **Executive Interview Readiness Report & A4 PDF Export** (`printMockInterviewReport`)

---

## ✅ Batch 3: State Hygiene, Responsiveness & UX Polish (Resolved)

### 9. Redux-Persist State Leakage on Logout (`Navbar.jsx`)
- **Problem:** Logging out only cleared `auth.user`, leaving the previous user's `notifications`, `allAppliedJobs`, `allAdminJobs`, and `companies` persisted in `localStorage`.
- **Resolution:** Dispatched cleanup actions (`clearNotificationsInStore`, `setAllAppliedJobs([])`, `setAllAdminJobs([])`, `setCompanies([])`, `setSingleCompany(null)`, `setAllApplicants(null)`, `resetJobFilters()`) on logout.

### 10. Mobile Navigation & Active Link Highlighting (`Navbar.jsx`)
- **Problem:** Top navigation links overflowed on mobile screens and didn't highlight the active route.
- **Resolution:** Added active route styling and a responsive mobile menu popover in `Navbar.jsx`.

### 11. `/browse` Page Responsiveness, Search Bar & Empty State (`Browse.jsx`)
- **Problem:** `Browse.jsx` used a non-responsive `grid-cols-3`, had no search input or category pills, and showed a blank area when 0 jobs matched.
- **Resolution:** Rebuilt `Browse.jsx` with a live search bar, clickable popular category pills, active filter badge, responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` layout, and a clean empty state.

### 12. 1-Click Portal Job Auto-Fill in AI Cover Letter Studio (`AICoverLetterGenerator.jsx`)
- **Problem:** Users had to manually copy-paste job titles, company names, and descriptions even for jobs already listed on the portal.
- **Resolution:** Added a **"Quick-Fill from Active Portal Jobs"** dropdown in `AICoverLetterGenerator.jsx` that auto-populates the form in one click.

### 13. Footer Newsletter Feedback & Route Links (`Footer.jsx`, `Home.jsx`)
- **Problem:** Submitting the newsletter form in `Footer.jsx` did nothing, and several links pointed to `/`. `Home.jsx` had a missing `user` dependency in its recruiter redirect `useEffect`.
- **Resolution:** Connected all footer links to real application routes, added toast confirmation to the newsletter form, and fixed the `Home.jsx` effect dependency array.