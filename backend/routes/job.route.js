import express from "express";
import isAuthenticated, { isRecruiter } from "../middlewares/isAuthenticated.js";
import { deleteJob, getAdminJobs, getAllJobs, getJobById, postJob, updateJob } from "../controllers/job.controller.js";

const router = express.Router();

router.route("/post").post(isAuthenticated, isRecruiter, postJob);
router.route("/get").get(getAllJobs);
router.route("/getadminjobs").get(isAuthenticated, isRecruiter, getAdminJobs);
// Public job detail route so visitors can view job descriptions before logging in
router.route("/get/:id").get(getJobById);
router.route("/update/:id").put(isAuthenticated, isRecruiter, updateJob);
router.route("/delete/:id").delete(isAuthenticated, isRecruiter, deleteJob);

export default router;