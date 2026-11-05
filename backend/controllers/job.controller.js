import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { Notification } from "../models/notification.model.js";
import { Company } from "../models/company.model.js";
import { escapeRegex } from "../middlewares/security.js";
import { jobCache } from "../utils/lruCache.js";
import { withAcidTransaction } from "../utils/dbEngine.js";
import { logAuditEvent } from "../models/auditLog.model.js";

/**
 * Recruiter: Post a new job opening
 * - Enforces multi-tenant company ownership (IDOR prevention)
 * - Invalidates read-through LRU job cache
 * - Records immutable security audit event
 */
export const postJob = async (req, res) => {
    try {
        const {
            title,
            description,
            requirements,
            salary,
            location,
            jobType,
            experience,
            position,
            companyId
        } = req.body;
        const userId = req.id;

        if (
            !title ||
            !description ||
            !requirements ||
            !salary ||
            !location ||
            !jobType ||
            experience === undefined ||
            experience === "" ||
            !position ||
            !companyId
        ) {
            return res.status(400).json({
                message: "Please fill in all required job fields.",
                success: false
            });
        }

        // Multi-Tenant Isolation Check: Verify recruiter owns this company
        const ownedCompany = await Company.findOne({ _id: companyId, userId });
        if (!ownedCompany) {
            logAuditEvent({
                req,
                actorId: userId,
                actorRole: "recruiter",
                action: "UNAUTHORIZED_COMPANY_JOB_POST_ATTEMPT",
                entityType: "Company",
                entityId: companyId,
                status: "BLOCKED",
                metadata: { attemptedTitle: title, companyId }
            });
            return res.status(403).json({
                message: "You can only post jobs under companies registered by your recruiter account.",
                success: false
            });
        }

        const parsedRequirements = Array.isArray(requirements)
            ? requirements.map((r) => String(r).trim()).filter(Boolean)
            : String(requirements)
                  .split(",")
                  .map((skill) => skill.trim())
                  .filter(Boolean);

        const job = await Job.create({
            title: String(title).trim(),
            description: String(description).trim(),
            requirements: parsedRequirements,
            salary: String(salary).trim(),
            location: String(location).trim(),
            jobType: String(jobType).trim(),
            experienceLevel: Number(experience) || 0,
            position: Number(position) || 1,
            company: companyId,
            created_by: userId
        });

        // Bust cached job listings so new job appears immediately
        jobCache.invalidateByPrefix("jobs:");

        logAuditEvent({
            req,
            actorId: userId,
            actorRole: "recruiter",
            action: "JOB_CREATED",
            entityType: "Job",
            entityId: job._id,
            status: "SUCCESS",
            metadata: {
                title: job.title,
                company: ownedCompany.name,
                location: job.location,
                salary: job.salary
            }
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

/**
 * Public / Student: Get all jobs with Read-Through LRU Cache,
 * ReDoS-safe RegExp keyword filtering, and optional cursor/offset pagination.
 */
export const getAllJobs = async (req, res) => {
    try {
        const rawKeyword = (req.query.keyword || "").trim();
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
        const cursor = req.query.cursor || "";

        const cacheKey = `jobs:list:kw=${rawKeyword.toLowerCase()}:p=${page}:l=${limit}:c=${cursor}`;
        const cached = jobCache.get(cacheKey);

        if (cached) {
            res.setHeader("X-Cache", "HIT");
            res.setHeader("ETag", cached.etag);
            return res.status(200).json(cached.value);
        }

        const safeKeyword = escapeRegex(rawKeyword);
        const keywordRegex = safeKeyword ? new RegExp(safeKeyword, "i") : null;

        const query = keywordRegex
            ? {
                  $or: [
                      { title: keywordRegex },
                      { description: keywordRegex },
                      { location: keywordRegex },
                      { jobType: keywordRegex },
                      { requirements: keywordRegex }
                  ]
              }
            : {};

        if (cursor) {
            const cursorDate = new Date(cursor);
            if (!isNaN(cursorDate.getTime())) {
                query.createdAt = { $lt: cursorDate };
            }
        }

        const jobs = await Job.find(query)
            .populate({ path: "company" })
            .sort({ createdAt: -1 })
            .skip(cursor ? 0 : (page - 1) * limit)
            .limit(limit)
            .lean();

        const nextCursor = jobs.length > 0 ? jobs[jobs.length - 1].createdAt : null;

        const responsePayload = {
            jobs: jobs || [],
            pagination: {
                page,
                limit,
                count: jobs.length,
                nextCursor
            },
            success: true
        };

        const entry = jobCache.set(cacheKey, responsePayload, 60 * 1000);
        res.setHeader("X-Cache", "MISS");
        res.setHeader("ETag", entry.etag);

        return res.status(200).json(responsePayload);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch jobs.",
            success: false
        });
    }
};

/**
 * Public / Student: Get single job details by ID
 * - Uses Read-Through LRU cache
 * - Protects candidate privacy by projecting only non-sensitive application fields
 */
export const getJobById = async (req, res) => {
    try {
        const jobId = req.params.id;
        const cacheKey = `jobs:detail:${jobId}`;
        const cached = jobCache.get(cacheKey);

        if (cached) {
            res.setHeader("X-Cache", "HIT");
            res.setHeader("ETag", cached.etag);
            return res.status(200).json(cached.value);
        }

        const job = await Job.findById(jobId)
            .populate({ path: "company" })
            .populate({
                path: "applications",
                select: "_id applicant status hiringStage createdAt"
            })
            .lean();

        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }

        const responsePayload = { job, success: true };
        const entry = jobCache.set(cacheKey, responsePayload, 45 * 1000);
        res.setHeader("X-Cache", "MISS");
        res.setHeader("ETag", entry.etag);

        return res.status(200).json(responsePayload);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch job details.",
            success: false
        });
    }
};

/**
 * Recruiter: Get all jobs posted by this recruiter with application stage summaries
 */
export const getAdminJobs = async (req, res) => {
    try {
        const adminId = req.id;
        const jobs = await Job.find({ created_by: adminId })
            .populate({ path: "company" })
            .populate({
                path: "applications",
                select: "status hiringStage createdAt applicant"
            })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            jobs: jobs || [],
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch admin jobs.",
            success: false
        });
    }
};

/**
 * Recruiter: Update an existing job posting
 */
export const updateJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const {
            title,
            description,
            requirements,
            salary,
            location,
            jobType,
            experience,
            position,
            companyId
        } = req.body;

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

        if (companyId && String(companyId) !== String(job.company)) {
            const ownedCompany = await Company.findOne({ _id: companyId, userId: req.id });
            if (!ownedCompany) {
                return res.status(403).json({
                    message: "You can only assign jobs to companies owned by your account.",
                    success: false
                });
            }
            job.company = companyId;
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

        await job.save();
        jobCache.invalidateByPrefix("jobs:");

        logAuditEvent({
            req,
            actorId: req.id,
            actorRole: "recruiter",
            action: "JOB_UPDATED",
            entityType: "Job",
            entityId: job._id,
            status: "SUCCESS",
            metadata: { title: job.title, location: job.location }
        });

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

/**
 * Recruiter: Delete a job posting and its associated applications & notifications inside an ACID Transaction
 */
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

        await withAcidTransaction(async (session) => {
            const opts = session ? { session } : {};
            await Application.deleteMany({ job: jobId }, opts);
            await Notification.deleteMany({ job: jobId }, opts);
            await Job.findByIdAndDelete(jobId, opts);
        });

        jobCache.invalidateByPrefix("jobs:");

        logAuditEvent({
            req,
            actorId: req.id,
            actorRole: "recruiter",
            action: "JOB_DELETED_ACID",
            entityType: "Job",
            entityId: jobId,
            status: "SUCCESS",
            metadata: { deletedTitle: job.title }
        });

        return res.status(200).json({
            message: "Job and associated applications deleted atomically.",
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