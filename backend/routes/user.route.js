import express from "express";
import {
    getSavedJobs,
    login,
    logout,
    parseAndSaveResume,
    register,
    saveJob,
    updateProfile
} from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleUpload } from "../middlewares/mutler.js";
import { loginRateLimiter, signupRateLimiter } from "../middlewares/security.js";

const router = express.Router();

// Rate-limited Signup & Login for all roles (Student & Recruiter)
router.route("/register").post(signupRateLimiter, singleUpload, register);
router.route("/login").post(loginRateLimiter, login);
router.route("/logout").get(logout);

// Authenticated Profile & Resume Routes
router.route("/profile/update").post(isAuthenticated, singleUpload, updateProfile);
router.route("/resume/parse").post(isAuthenticated, singleUpload, parseAndSaveResume);
router.route("/job/save/:id").post(isAuthenticated, saveJob);
router.route("/saved-jobs").get(isAuthenticated, getSavedJobs);

export default router;