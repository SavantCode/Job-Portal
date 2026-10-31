import express from "express";
import { generateCoverLetter, getAtsMatchScore, generateInterviewPrep } from "../controllers/ai.controller.js";

const router = express.Router();

// Supports both internal job IDs and external payload generations
router.route("/generate-cover-letter/:jobId?").post(generateCoverLetter);
router.route("/ats-match/:jobId").get(getAtsMatchScore);
router.route("/interview-prep/:jobId").post(generateInterviewPrep);

export default router;