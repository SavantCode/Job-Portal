import express from "express";
import {
    generateCoverLetter,
    getAtsMatchScore,
    generateInterviewPrep,
    draftRecruiterCommunication
} from "../controllers/ai.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

const router = express.Router();

// Supports both internal job IDs and external payload generations
router.route("/generate-cover-letter/:jobId?").post(generateCoverLetter);
router.route("/ats-match/:jobId").get(getAtsMatchScore);
router.route("/interview-prep/:jobId").post(generateInterviewPrep);
router.route("/draft-hiring-email").post(isAuthenticated, draftRecruiterCommunication);

export default router;