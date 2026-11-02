import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { User } from "../models/user.model.js";
import { escapeRegex } from "../middlewares/security.js";

// Recruiter posts a new job
export const postJob = async (req, res) => {
    try {
        const { title, description, requirements, salary, location, jobType, experience, position, companyId } = req.body;
        const userId = req.id;

        if (!title || !description || !requirements || !salary || !location || !jobType || experience === undefined || !position || !companyId) {
            return res.status(400).json({
                message: "Please fill in all required job fields.",
                success: false
            });
        }

        const reqArray = Array.isArray(requirements)
            ? requirements.map((r) => String(r).trim()).filter(Boolean)
            : String(requirements)
                  .split(",")
                  .map((skill) => skill.trim())
                  .filter(Boolean);

        const job = await Job.create({
            title: String(title).trim(),
            description: String(description).trim(),
            requirements: reqArray,
            salary: String(salary).trim(),
            location: String(location).trim(),
            jobType: String(jobType).trim(),
            experienceLevel: Number(experience) || 0,
            position: Number(position) || 1,
            company: companyId,
            created_by: userId
        });

        return res.status(201).json({
            message: "New job created successfully.",
            job,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to post job.",
            success: false
        });
    }
};

// Public / Student: Get all jobs with ReDoS-safe keyword filtering
export const getAllJobs = async (req, res) => {
    try {
        const rawKeyword = req.query.keyword || "";
        const safeKeyword = escapeRegex(rawKeyword.trim());

        const query = safeKeyword
            ? {
                  $or: [
                      { title: { $regex: safeKeyword, $options: "i" } },
                      { description: { $regex: safeKeyword, $options: "i" } },
                      { location: { $regex: safeKeyword, $options: "i" } },
                      { jobType: { $regex: safeKeyword, $options: "i" } },
                      { requirements: { $elemMatch: { $regex: safeKeyword, $options: "i" } } }
                  ]
              }
            : {};

        const jobs = await Job.find(query)
            .populate({
                path: "company"
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            jobs: jobs || [],
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch jobs.",
            success: false
        });
    }
};

// Get single job by ID
export const getJobById = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId)
            .populate({
                path: "applications"
            })
            .populate({
                path: "company"
            });

        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }
        return res.status(200).json({ job, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch job details.",
            success: false
        });
    }
};

// Recruiter: Get all jobs created by this recruiter
export const getAdminJobs = async (req, res) => {
    try {
        const adminId = req.id;
        const jobs = await Job.find({ created_by: adminId })
            .populate({
                path: "company"
            })
            .populate({
                path: "applications"
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            jobs: jobs || [],
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to load recruiter jobs.",
            success: false
        });
    }
};

// Recruiter: Update an existing job
export const updateJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const { title, description, requirements, salary, location, jobType, experience, position, companyId } = req.body;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }

        if (String(job.created_by) !== String(req.id)) {
            return res.status(403).json({
                message: "You are not authorized to edit this job posting.",
                success: false
            });
        }

        if (title) job.title = String(title).trim();
        if (description) job.description = String(description).trim();
        if (requirements !== undefined) {
            job.requirements = Array.isArray(requirements)
                ? requirements.map((s) => String(s).trim()).filter(Boolean)
                : String(requirements)
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
        }
        if (salary) job.salary = String(salary).trim();
        if (location) job.location = String(location).trim();
        if (jobType) job.jobType = String(jobType).trim();
        if (experience !== undefined) job.experienceLevel = Number(experience) || 0;
        if (position !== undefined) job.position = Number(position) || 1;
        if (companyId) job.company = companyId;

        await job.save();

        return res.status(200).json({
            message: "Job updated successfully.",
            job,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to update job.",
            success: false
        });
    }
};

// Recruiter: Delete a job posting and its associated applications
export const deleteJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }

        if (String(job.created_by) !== String(req.id)) {
            return res.status(403).json({
                message: "You are not authorized to delete this job posting.",
                success: false
            });
        }

        await Application.deleteMany({ job: jobId });
        await Job.findByIdAndDelete(jobId);

        return res.status(200).json({
            message: "Job posting removed successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to delete job.",
            success: false
        });
    }
};