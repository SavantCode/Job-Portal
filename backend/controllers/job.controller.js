import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";

// Admin posts a new job
export const postJob = async (req, res) => {
    try {
        const { title, description, requirements, salary, location, jobType, experience, position, companyId } = req.body;
        const userId = req.id;

        if (!title || !description || !requirements || !salary || !location || !jobType || experience === undefined || !position || !companyId) {
            return res.status(400).json({
                message: "Something is missing.",
                success: false
            });
        }

        const job = await Job.create({
            title,
            description,
            requirements: typeof requirements === "string" ? requirements.split(",").map(req => req.trim()).filter(Boolean) : requirements,
            salary: String(salary),
            location,
            jobType,
            experienceLevel: Number(experience),
            position: Number(position),
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
            message: "Server error while posting job.",
            success: false
        });
    }
};

// Get all jobs (with optional keyword search for students)
export const getAllJobs = async (req, res) => {
    try {
        const keyword = req.query.keyword || "";
        const query = {
            $or: [
                { title: { $regex: keyword, $options: "i" } },
                { description: { $regex: keyword, $options: "i" } },
                { location: { $regex: keyword, $options: "i" } }
            ]
        };

        const jobs = await Job.find(query).populate({
            path: "company"
        }).populate({
            path: "applications"
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            jobs,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error while fetching jobs.",
            success: false
        });
    }
};

// Get a single job by ID
export const getJobById = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId)
            .populate({ path: "company" })
            .populate({
                path: "applications",
                populate: {
                    path: "applicant"
                }
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
            message: "Server error while fetching job details.",
            success: false
        });
    }
};

// Get all jobs created by the logged-in admin
export const getAdminJobs = async (req, res) => {
    try {
        const adminId = req.id;
        const jobs = await Job.find({ created_by: adminId })
            .populate({ path: 'company' })
            .populate({ path: 'applications' })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            jobs,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error while fetching admin jobs.",
            success: false
        });
    }
};

// Update an existing job (Recruiter)
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

        if (title !== undefined) job.title = title;
        if (description !== undefined) job.description = description;
        if (requirements !== undefined) {
            job.requirements = typeof requirements === "string"
                ? requirements.split(",").map(r => r.trim()).filter(Boolean)
                : requirements;
        }
        if (salary !== undefined) job.salary = String(salary);
        if (location !== undefined) job.location = location;
        if (jobType !== undefined) job.jobType = jobType;
        if (experience !== undefined) job.experienceLevel = Number(experience);
        if (position !== undefined) job.position = Number(position);
        if (companyId) job.company = companyId;

        await job.save();
        const populatedJob = await Job.findById(job._id).populate("company").populate("applications");

        return res.status(200).json({
            message: "Job updated successfully.",
            job: populatedJob,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error while updating job.",
            success: false
        });
    }
};

// Delete a job (Recruiter)
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

        await Application.deleteMany({ job: jobId });
        await Job.findByIdAndDelete(jobId);

        return res.status(200).json({
            message: "Job and associated applications deleted successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error while deleting job.",
            success: false
        });
    }
};