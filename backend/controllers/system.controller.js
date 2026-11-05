import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { Notification } from "../models/notification.model.js";
import { AuditLog, logAuditEvent } from "../models/auditLog.model.js";
import { jobCache } from "../utils/lruCache.js";
import { sseBroker } from "../utils/sseBroker.js";
import { backgroundQueue } from "../utils/backgroundQueue.js";
import { getIdempotencyStats } from "../middlewares/idempotency.js";
import { getSecurityAndLatencyStats } from "../middlewares/security.js";
import { computeJobAnalyticsFacet, computeRecruiterPipelineFacet, withAcidTransaction } from "../utils/dbEngine.js";

/**
 * Helper to mask IP addresses in multi-tenant logs when viewed across organizations
 */
const maskIpAddress = (ip = "") => {
    const str = String(ip || "127.0.0.1");
    if (str === "::1" || str === "127.0.0.1") return "127.0.0.1 (Local)";
    const parts = str.split(".");
    if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return str.slice(0, 10) + "...";
};

/**
 * GET /api/v1/system/health
 * Real-time System Health, MongoDB Ping Latency, P50/P95/P99 HTTP Latency,
 * LRU Cache Hit Ratio, Active SSE Connections, and Rate-Limiter Counters.
 */
export const getSystemHealthAndTelemetry = async (_req, res) => {
    try {
        const startPing = performance.now();
        let dbState = "disconnected";
        let dbLatencyMs = 0;

        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            await mongoose.connection.db.admin().ping();
            dbLatencyMs = Number((performance.now() - startPing).toFixed(2));
            dbState = "connected";
        }

        const mem = process.memoryUsage();
        const securityAndLatency = getSecurityAndLatencyStats();

        return res.status(200).json({
            success: true,
            status: dbState === "connected" ? "HEALTHY" : "DEGRADED",
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.round(process.uptime()),
            memoryMB: {
                rss: Math.round(mem.rss / 1024 / 1024),
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
            },
            database: {
                state: dbState,
                pingLatencyMs: dbLatencyMs,
                poolMaxSize: 25
            },
            latency: securityAndLatency.latency,
            securityCounters: securityAndLatency.securityCounters,
            security: securityAndLatency.security,
            cache: jobCache.getStats(),
            sseBroker: sseBroker.getStats(),
            backgroundQueue: backgroundQueue.getStats(),
            idempotency: getIdempotencyStats()
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            status: "ERROR",
            message: error.message
        });
    }
};

/**
 * GET /api/v1/system/hq-overview
 * Complete Platform Headquarters (Admin HQ) Aggregation & Intelligence Endpoint.
 * Computes:
 * 1. Global KPIs (Job Seekers, Recruiters, Companies, Jobs, Applications, Resume Upload %, Avg ATS Score)
 * 2. 8-Stage Hiring Pipeline Conversion Funnel across the entire platform
 * 3. Skill Demand vs. Candidate Supply Gap Analysis (Top skills recruiters want vs. candidate supply)
 * 4. Job Market Breakdown by Location, Job Type, and Salary Ranges
 * 5. Enriched Job Seekers Directory & Recruiters Directory
 * 6. Complete Platform Jobs Inventory with applicant & conversion stats
 */
export const getPlatformHeadquartersOverview = async (req, res) => {
    try {
        const [
            users,
            companies,
            jobs,
            applications,
            notificationsCount,
            auditCount,
            jobFacets,
            pipelineFacets
        ] = await Promise.all([
            User.find({})
                .select("fullname email phoneNumber role profile createdAt savedJobs")
                .sort({ createdAt: -1 })
                .lean(),
            Company.find({})
                .populate("userId", "fullname email")
                .sort({ createdAt: -1 })
                .lean(),
            Job.find({})
                .populate("company", "name logo location website")
                .populate("created_by", "fullname email")
                .sort({ createdAt: -1 })
                .lean(),
            Application.find({})
                .populate("job", "title salary location jobType company")
                .populate("applicant", "fullname email profile")
                .sort({ createdAt: -1 })
                .lean(),
            Notification.countDocuments(),
            AuditLog.countDocuments(),
            computeJobAnalyticsFacet(),
            computeRecruiterPipelineFacet([])
        ]);

        // Seed an initial AuditLog event if collection is empty so HQ Audit tab always has real data
        if (auditCount === 0) {
            await AuditLog.create({
                action: "HQ_TELEMETRY_INITIALIZED",
                actorId: req.id && mongoose.Types.ObjectId.isValid(String(req.id)) ? req.id : null,
                actorRole: req.userRole || "maintainer",
                actorName: "Platform Headquarters",
                entityType: "System",
                status: "SUCCESS",
                ipAddress: "127.0.0.1",
                metadata: {
                    totalUsers: users.length,
                    totalJobs: jobs.length,
                    totalApplications: applications.length
                }
            });
        }

        const students = users.filter((u) => u.role === "student");
        const recruiters = users.filter((u) => u.role === "recruiter");

        // 1. 8-Stage Hiring Pipeline Funnel Aggregation
        const stageOrder = [
            "applied",
            "shortlisted",
            "assignment_sent",
            "interview_scheduled",
            "interview_passed",
            "offer_sent",
            "offer_accepted",
            "hired",
            "rejected"
        ];
        const stageCountsMap = {};
        stageOrder.forEach((s) => (stageCountsMap[s] = 0));

        applications.forEach((app) => {
            const st =
                app.hiringStage ||
                (app.status === "accepted"
                    ? "shortlisted"
                    : app.status === "rejected"
                    ? "rejected"
                    : "applied");
            stageCountsMap[st] = (stageCountsMap[st] || 0) + 1;
        });

        const totalApps = applications.length;
        const funnelBreakdown = stageOrder.map((stage) => {
            const count = stageCountsMap[stage] || 0;
            const percentage = totalApps > 0 ? Math.round((count / totalApps) * 100) : 0;
            return { stage, count, percentage };
        });

        // 2. Top In-Demand Tech Skills (from Jobs) vs. Candidate Supply (from Student Profiles)
        const demandSkillMap = new Map();
        jobs.forEach((job) => {
            const reqs = Array.isArray(job.requirements)
                ? job.requirements.flatMap((r) => String(r).split(",")).map((s) => s.trim()).filter(Boolean)
                : [];
            reqs.forEach((sk) => {
                const clean = sk.trim();
                if (!clean) return;
                demandSkillMap.set(clean, (demandSkillMap.get(clean) || 0) + 1);
            });
        });

        const supplySkillMap = new Map();
        students.forEach((stu) => {
            const skills = [
                ...(stu.profile?.skills || []),
                ...(stu.profile?.extractedSkills || [])
            ];
            const uniqueStudentSkills = new Set(skills.map((s) => String(s).trim().toLowerCase()).filter(Boolean));
            uniqueStudentSkills.forEach((lowSkill) => {
                supplySkillMap.set(lowSkill, (supplySkillMap.get(lowSkill) || 0) + 1);
            });
        });

        const topSkillsComparison = Array.from(demandSkillMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([skill, jobDemandCount]) => {
                const candidateSupplyCount = supplySkillMap.get(skill.toLowerCase()) || 0;
                return {
                    skill,
                    jobDemandCount,
                    candidateSupplyCount,
                    gapRatio:
                        jobDemandCount > 0
                            ? Math.round((candidateSupplyCount / jobDemandCount) * 100)
                            : 100
                };
            });

        // 3. Location & Work-Type Distribution
        const locationCounts = new Map();
        const jobTypeCounts = new Map();
        jobs.forEach((j) => {
            const loc = (j.location || "India").split(",")[0].trim();
            locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
            const jt = j.jobType || "Full-Time";
            jobTypeCounts.set(jt, (jobTypeCounts.get(jt) || 0) + 1);
        });

        const jobsByLocation = Array.from(locationCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([location, count]) => ({ location, count }));

        const jobsByType = Array.from(jobTypeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([jobType, count]) => ({ jobType, count }));

        // 4. Enriched Job Seekers Directory
        const jobSeekersDirectory = students.map((stu) => {
            const stuApps = applications.filter(
                (a) => String(a.applicant?._id || a.applicant) === String(stu._id)
            );
            const combinedSkills = Array.from(
                new Set([...(stu.profile?.skills || []), ...(stu.profile?.extractedSkills || [])])
            );
            const hasResume = Boolean(stu.profile?.resume || stu.profile?.parsedResumeText);

            // Deterministic ATS readiness score based on profile completeness & parsed resume
            let computedAts = 45;
            if (hasResume) computedAts += 20;
            if (combinedSkills.length >= 3) computedAts += 15;
            if ((stu.profile?.projects || []).length >= 1) computedAts += 10;
            if (stu.profile?.bio) computedAts += 5;

            return {
                _id: stu._id,
                fullname: stu.fullname,
                email: stu.email,
                phoneNumber: stu.phoneNumber,
                headline: stu.profile?.headline || stu.profile?.bio || "Software Engineering Candidate",
                location: stu.profile?.currentLocation || "India",
                skills: combinedSkills.slice(0, 10),
                hasResume,
                resumeUrl: stu.profile?.resume || "",
                resumeOriginalName: stu.profile?.resumeOriginalName || "",
                resumeAtsScore: Math.min(98, stu.profile?.resumeAtsScore || computedAts),
                projectsCount: (stu.profile?.projects || []).length,
                savedJobsCount: (stu.savedJobs || []).length,
                applicationsCount: stuApps.length,
                latestStage: stuApps[0]?.hiringStage || (stuApps.length > 0 ? "applied" : "none"),
                openToWork: stu.profile?.openToWork !== false,
                createdAt: stu.createdAt
            };
        });

        // 5. Enriched Recruiters Directory
        const recruitersDirectory = recruiters.map((rec) => {
            const recCompanies = companies.filter(
                (c) => String(c.userId?._id || c.userId) === String(rec._id)
            );
            const recJobs = jobs.filter(
                (j) => String(j.created_by?._id || j.created_by) === String(rec._id)
            );
            const recJobIds = new Set(recJobs.map((j) => String(j._id)));
            const recApps = applications.filter((a) => recJobIds.has(String(a.job?._id || a.job)));
            const shortlistedApps = recApps.filter((a) =>
                [
                    "shortlisted",
                    "assignment_sent",
                    "interview_scheduled",
                    "interview_passed",
                    "offer_sent",
                    "offer_accepted",
                    "hired"
                ].includes(a.hiringStage) || a.status === "accepted"
            );

            return {
                _id: rec._id,
                fullname: rec.fullname,
                email: rec.email,
                phoneNumber: rec.phoneNumber,
                companies: recCompanies.map((c) => c.name),
                jobsPostedCount: recJobs.length,
                totalApplicationsReceived: recApps.length,
                shortlistedCount: shortlistedApps.length,
                conversionRate:
                    recApps.length > 0 ? Math.round((shortlistedApps.length / recApps.length) * 100) : 0,
                createdAt: rec.createdAt
            };
        });

        // 6. Platform Jobs Inventory for HQ Moderation & Inspection
        const jobsInventory = jobs.map((j) => {
            const jobApps = applications.filter(
                (a) => String(a.job?._id || a.job) === String(j._id)
            );
            return {
                _id: j._id,
                title: j.title,
                companyName: j.company?.name || "Enterprise",
                companyLogo: j.company?.logo || "",
                recruiterName: j.created_by?.fullname || "Recruiter",
                recruiterEmail: j.created_by?.email || "",
                location: j.location,
                jobType: j.jobType,
                salary: j.salary,
                position: j.position,
                applicationsCount: jobApps.length,
                requirements: (j.requirements || []).slice(0, 6),
                createdAt: j.createdAt
            };
        });

        // 7. Active MongoDB Collection Indexes Inventory
        const dbIndexes = {
            Job: [
                "Job_ESR_Discovery_Index ({ location: 1, jobType: 1, createdAt: -1, experienceLevel: 1 })",
                "Job_Weighted_FullText_Index (title:10, requirements:8, location:5, description:3)",
                "Job_Recruiter_CreatedAt_Index ({ created_by: 1, createdAt: -1 })"
            ],
            Application: [
                "Application_Unique_Job_Applicant_Index ({ job: 1, applicant: 1 }, unique: true)",
                "Application_Applicant_CreatedAt_Index ({ applicant: 1, createdAt: -1 })",
                "Application_Job_Stage_CreatedAt_Index ({ job: 1, hiringStage: 1, createdAt: -1 })"
            ],
            Notification: [
                "Notification_Recipient_Read_CreatedAt_Index ({ recipient: 1, isRead: 1, createdAt: -1 })",
                "Notification_TTL_90Days_Index ({ createdAt: 1 }, expireAfterSeconds: 7776000)"
            ],
            AuditLog: [
                "AuditLog_Action_CreatedAt_Index ({ action: 1, createdAt: -1 })",
                "AuditLog_Actor_CreatedAt_Index ({ actorId: 1, createdAt: -1 })",
                "AuditLog_TTL_180Days_Index ({ createdAt: 1 }, expireAfterSeconds: 15552000)"
            ]
        };

        const resumesUploaded = jobSeekersDirectory.filter((s) => s.hasResume).length;
        const avgAtsScore =
            jobSeekersDirectory.length > 0
                ? Math.round(
                      jobSeekersDirectory.reduce((sum, s) => sum + (s.resumeAtsScore || 70), 0) /
                          jobSeekersDirectory.length
                  )
                : 75;

        const shortlistedOrBeyondCount = applications.filter(
            (a) =>
                [
                    "shortlisted",
                    "assignment_sent",
                    "interview_scheduled",
                    "interview_passed",
                    "offer_sent",
                    "offer_accepted",
                    "hired"
                ].includes(a.hiringStage) || a.status === "accepted"
        ).length;

        return res.status(200).json({
            success: true,
            kpis: {
                totalUsers: users.length,
                totalStudents: students.length,
                totalRecruiters: recruiters.length,
                totalCompanies: companies.length,
                totalJobs: jobs.length,
                totalApplications: applications.length,
                totalNotifications: notificationsCount,
                totalAuditEvents: Math.max(auditCount, 1),
                resumesUploadedCount: resumesUploaded,
                resumeUploadRate:
                    students.length > 0 ? Math.round((resumesUploaded / students.length) * 100) : 0,
                avgCandidateAtsScore: avgAtsScore,
                shortlistedOrBeyondCount,
                overallConversionRate:
                    applications.length > 0
                        ? Math.round((shortlistedOrBeyondCount / applications.length) * 100)
                        : 0,
                hiredCount: stageCountsMap.hired + stageCountsMap.offer_accepted
            },
            funnelBreakdown,
            topSkillsComparison,
            jobsByLocation,
            jobsByType,
            jobSeekersDirectory,
            recruitersDirectory,
            jobsInventory,
            dbIndexes,
            facets: {
                jobFacets,
                pipelineFacets
            }
        });
    } catch (error) {
        console.error("HQ Overview Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to compute Platform Headquarters overview."
        });
    }
};

/**
 * GET /api/v1/system/audit-logs
 * Supports filtering by status (SUCCESS, BLOCKED, FAILURE) and scope (platform vs. tenant).
 */
export const getAuditLogs = async (req, res) => {
    try {
        const statusFilter = (req.query.status || "ALL").toUpperCase();
        const scope = (req.query.scope || "platform").toLowerCase();
        const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 100));

        const query = {};
        if (statusFilter !== "ALL") {
            query.status = statusFilter;
        }

        if (scope === "tenant" && req.id && mongoose.Types.ObjectId.isValid(String(req.id))) {
            query.actorId = req.id;
        }

        const rawLogs = await AuditLog.find(query)
            .populate("actorId", "fullname email role")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const formattedLogs = rawLogs.map((log) => {
            const isOwnEvent = req.id && String(log.actorId?._id || log.actorId) === String(req.id);
            return {
                _id: log._id,
                action: log.action,
                actorName: log.actorId?.fullname || log.actorName || "System / Guest",
                actorEmail: log.actorId?.email || log.actorEmail || "",
                actorRole: log.actorId?.role || log.actorRole || "system",
                entityType: log.entityType || "System",
                entityId: log.entityId || "",
                status: log.status || "SUCCESS",
                ipAddress: isOwnEvent ? log.ipAddress : maskIpAddress(log.ipAddress),
                metadata: log.metadata || {},
                createdAt: log.createdAt
            };
        });

        return res.status(200).json({
            success: true,
            count: formattedLogs.length,
            scope,
            logs: formattedLogs
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch security audit logs."
        });
    }
};

/**
 * POST /api/v1/system/audit-logs/test
 * Allows the Maintainer / Recruiter to trigger a live verification audit event
 * from Platform Headquarters to demonstrate append-only audit logging in interviews.
 */
export const createTestAuditEvent = async (req, res) => {
    try {
        const entry = await AuditLog.create({
            action: "HQ_SECURITY_AUDIT_VERIFICATION",
            actorId: req.id && mongoose.Types.ObjectId.isValid(String(req.id)) ? req.id : null,
            actorName: req.body?.actorName || "Platform Maintainer",
            actorRole: req.userRole || "maintainer",
            entityType: "PlatformHQ",
            entityId: "manual_verification",
            status: "SUCCESS",
            ipAddress: req.ip || "127.0.0.1",
            metadata: {
                note: "Triggered live from Platform Headquarters Audit Console",
                cacheHitRate: jobCache.getStats().hitRatePercent,
                timestamp: new Date().toISOString()
            }
        });

        return res.status(201).json({
            success: true,
            message: "Verification security audit event recorded in MongoDB!",
            entry
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to record test audit event."
        });
    }
};

/**
 * DELETE /api/v1/system/hq/job/:id
 * Platform Maintainer moderation: atomically remove a job and its applications from HQ.
 */
export const adminDeleteJobFromHq = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
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
            actorRole: req.userRole || "maintainer",
            action: "HQ_JOB_MODERATION_DELETED",
            entityType: "Job",
            entityId: jobId,
            status: "SUCCESS",
            metadata: { deletedTitle: job.title }
        });

        return res.status(200).json({
            success: true,
            message: `Job "${job.title}" and its linked applications removed atomically.`
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete job from HQ."
        });
    }
};

/**
 * GET /api/v1/system/dlq
 */
export const getDeadLetterQueue = async (_req, res) => {
    return res.status(200).json({
        success: true,
        stats: backgroundQueue.getStats(),
        deadLetterItems: backgroundQueue.getDeadLetterItems()
    });
};

/**
 * POST /api/v1/system/dlq/:id/replay
 */
export const replayDeadLetterTask = async (req, res) => {
    const taskId = req.params.id;
    const replayed = backgroundQueue.replayDeadLetter(taskId);

    if (!replayed) {
        return res.status(404).json({
            success: false,
            message: "Dead-letter task not found."
        });
    }

    logAuditEvent({
        req,
        actorId: req.id,
        actorRole: req.userRole || "maintainer",
        action: "DLQ_TASK_REPLAYED",
        entityType: "BackgroundQueue",
        entityId: taskId,
        status: "SUCCESS"
    });

    return res.status(200).json({
        success: true,
        message: "Task re-queued for background execution."
    });
};

/**
 * POST /api/v1/system/cache/flush
 */
export const flushSystemCache = async (req, res) => {
    jobCache.clear();

    logAuditEvent({
        req,
        actorId: req.id,
        actorRole: req.userRole || "maintainer",
        action: "LRU_CACHE_FLUSHED",
        entityType: "Cache",
        entityId: "jobCache",
        status: "SUCCESS"
    });

    return res.status(200).json({
        success: true,
        message: "In-memory LRU Read-Through Cache flushed successfully."
    });
};