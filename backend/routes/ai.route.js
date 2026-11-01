import express from "express";
import {
    generateCoverLetter,
    getAtsMatchScore,
    generateInterviewPrep,
    evaluateInterviewAnswer,
    draftRecruiterCommunication,
    generateJobPostWithAI,
    generateResumeBullets
} from "../controllers/ai.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

const router = express.Router();

/**
 * Candidate & Recruiter AI Endpoints
 * All routes are protected with isAuthenticated so req.id is populated
 * with the logged-in user's MongoDB ObjectId.
 */
router.route("/generate-cover-letter/:jobId?").post(isAuthenticated, generateCoverLetter);
router.route("/ats-match/:jobId").get(isAuthenticated, getAtsMatchScore);
router.route("/interview-prep/:jobId").post(isAuthenticated, generateInterviewPrep);
router.route("/evaluate-interview-answer").post(isAuthenticated, evaluateInterviewAnswer);
router.route("/draft-hiring-email").post(isAuthenticated, draftRecruiterCommunication);
router.route("/generate-job-description").post(isAuthenticated, generateJobPostWithAI);
router.route("/resume-bullets/:jobId").post(isAuthenticated, generateResumeBullets);

export default router;