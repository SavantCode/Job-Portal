# 🎙️ Interactive AI Mock Interview Simulator (Voice + Text Q&A with Instant Grading)

## 1. Overview
The **Interactive AI Mock Interview Simulator** is an enterprise-grade, zero-cost career readiness module built into the Job Portal (`JobDescription.jsx` → `MockInterviewSimulator.jsx`). It enables job seekers to practice role-specific technical and behavioral interviews in either **Live Voice Mode** or **Structured Text Q&A Mode** and receive instant, multi-metric AI grading.

---

## 2. Zero-Cost Enterprise Architecture (100% Free Stack)

| Layer | Technology Used | Cost & Reliability |
| :--- | :--- | :--- |
| **Speech-to-Text (Candidate Voice Input)** | Browser Native Web Speech API (`window.SpeechRecognition` / `webkitSpeechRecognition`) | **100% Free**, zero latency, continuous real-time transcription with live editing. |
| **Text-to-Speech (AI Interviewer Output)** | Browser Native Speech Synthesis API (`window.speechSynthesis`) | **100% Free**, offline-capable, reads questions and ideal sample answers aloud. |
| **AI Question & Answer Evaluation Engine** | Groq Cloud LLM (`llama-3.3-70b-versatile`) + Deterministic Enterprise Rubric Fallback | **100% Free**, sub-second JSON evaluation with guaranteed uptime even without an API key. |
| **Executive Report Export** | Isolated `@page { size: A4 }` Vector PDF Engine (`printMockInterviewReport`) | **100% Free**, clean multi-page A4 PDF scorecard. |

---

## 3. User Workflow & Features

### Step 1: Generating the 5-Round Interview
When viewing any job on `/description/:id`, the candidate clicks **"Start AI Mock Interview"**.
The backend (`POST /api/v1/ai/interview-prep/:jobId`) generates 5 structured questions tailored to the job's title, company, and required tech stack:
1. **Round 1:** Technical Depth
2. **Round 2:** Architecture & System Design
3. **Round 3:** Debugging & Problem Solving
4. **Round 4:** Practical Engineering Scenario
5. **Round 5:** Behavioral (STAR Framework)

### Step 2: Choosing Voice Mode vs. Text Mode
- **🎙️ Live Voice Interview Mode:**
  - The AI Interviewer automatically speaks the active question aloud (with a **Mute/Unmute** toggle and **Stop AI Voice** control).
  - The candidate clicks **"Start Speaking"** to activate continuous microphone transcription (`SpeechRecognition`).
  - A live recording timer (`● REC 00:42`) and real-time transcript stream into the editor box. The candidate can refine the transcript before submitting.
- **⌨️ Text Q&A Mode:**
  - Candidates read the prompt and type their response at their own pace with a live word counter.

### Step 3: Instant 10-Point AI Rubric Evaluation
Clicking **"Submit Answer for Instant AI Grading"** calls `POST /api/v1/ai/evaluate-interview-answer` and renders:
- **Overall Score (`0.0 – 10.0`) & Hiring Signal Badge:**
  - `8.0 – 10.0`: **Strong Hire Signal**
  - `6.5 – 7.9`: **Hire - Solid Answer**
  - `5.0 – 6.4`: **Borderline - Needs Depth**
  - `< 5.0`: **Needs Practice**
- **3 Sub-Score Progress Bars (`0 – 10`):**
  1. **Technical Accuracy:** Domain keyword coverage & architectural correctness.
  2. **Clarity & Structure:** Logical flow, transition markers, and optimal length.
  3. **STAR / Practical Depth:** Quantifiable metrics (`%`, latency, scale) and real-world impact.
- **✅ What You Did Well** & **⚠️ How to Reach a 10/10** bullet lists.
- **💡 Ideal 10/10 Reference Answer** (with a **"🔊 Listen to Ideal Answer"** audio button).

### Step 4: Final Executive Readiness Report & A4 PDF Export
Once one or more questions are graded, the candidate can click **"Readiness Report"** to view their aggregate score, hiring verdict, question-by-question breakdown, and export a formatted **A4 PDF Mock Interview Report**.

---

## 4. Key Files Modified / Created

- **`backend/controllers/ai.controller.js`**:
  - Added `evaluateInterviewAnswer` controller with Groq JSON evaluation + deterministic rubric fallback.
  - Enhanced `generateInterviewPrep` to include `keyConcepts` per question.
- **`backend/routes/ai.route.js`**:
  - Registered `POST /api/v1/ai/evaluate-interview-answer`.
- **`frontend/src/components/MockInterviewSimulator.jsx`**:
  - Created the modular Voice + Text simulator component with `SpeechRecognition` and `speechSynthesis` lifecycle management.
- **`frontend/src/components/JobDescription.jsx`**:
  - Integrated `MockInterviewSimulator` into the Job Description page.
- **`frontend/src/utils/printDocument.js`**:
  - Added `printMockInterviewReport` for clean A4 PDF scorecard generation.