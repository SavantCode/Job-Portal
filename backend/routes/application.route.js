import express from "express";
import isAuthenticated, { isRecruiter } from "../middlewares/isAuthenticated.js";
import {
    applyJob,
    getApplicants,
    getAppliedJobs,
    updateStatus,
    withdrawApplication,
    executeHiringStageAction,
    submitCandidateAssignment,
    respondToOffer
} from "../controllers/application.controller.js";

const router = express.Router();

// Support both GET (legacy) and POST (with coverNote body)
router.route("/apply/:id").get(isAuthenticated, applyJob).post(isAuthenticated, applyJob);
router.route("/withdraw/:id").delete(isAuthenticated, withdrawApplication);
router.route("/get").get(isAuthenticated, getAppliedJobs);
router.route("/:id/applicants").get(isAuthenticated, isRecruiter, getApplicants);
router.route("/status/:id/update").post(isAuthenticated, isRecruiter, updateStatus);
router.route("/:id/hiring-action").post(isAuthenticated, isRecruiter, executeHiringStageAction);
router.route("/:id/submit-assignment").post(isAuthenticated, submitCandidateAssignment);
router.route("/:id/respond-offer").post(isAuthenticated, respondToOffer);

export default router;