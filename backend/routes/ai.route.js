import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
    generateCoverLetter,
    getAtsMatchScore,
    generateInterviewPrep,
    evaluateInterviewAnswer,
    generateJobDescription,
    generateResumeBullets,
    draftRecruiterCommunication,
    generateRecruiterStageLetter
} from "../controllers/ai.controller.js";

const router = express.Router();

// Cover Letter & Quick Pitch
router.route("/generate-cover-letter").post(isAuthenticated, generateCoverLetter);
router.route("/generate-cover-letter/:jobId").post(isAuthenticated, generateCoverLetter);

// ATS Match Score & Resume Bullets
router.route("/ats-match/:jobId").get(isAuthenticated, getAtsMatchScore);
router.route("/resume-bullets/:jobId").post(isAuthenticated, generateResumeBullets);

// Recruiter AI Job Description & Stage Letter / Email Drafting
router.route("/generate-job-description").post(isAuthenticated, generateJobDescription);
router.route("/draft-recruiter-email").post(isAuthenticated, draftRecruiterCommunication);
router.route("/generate-stage-letter").post(isAuthenticated, generateRecruiterStageLetter);

// AI Mock Interview Simulator (Questions + 10-Point Rubric Grading)
router.route("/interview-prep/:jobId").post(isAuthenticated, generateInterviewPrep);
router.route("/evaluate-interview").post(isAuthenticated, evaluateInterviewAnswer);
router.route("/evaluate-interview-answer").post(isAuthenticated, evaluateInterviewAnswer);

export default router;