import express from "express";
import { login, logout, register, updateProfile } from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { singleUpload } from "../middlewares/mutler.js";
 import { toggleSaveJob, getSavedJobs } from "../controllers/user.controller.js";
const router = express.Router();

router.route("/register").post(singleUpload,register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/profile/update").post(isAuthenticated,singleUpload,updateProfile);

//self
router.route("/job/save/:id").post(isAuthenticated, toggleSaveJob);
router.route("/job/saved").get(isAuthenticated, getSavedJobs);

export default router;

