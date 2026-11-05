import mongoose from "mongoose";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";

/**
 * ============================================================================
 * DATABASE SYSTEMS, ACID TRANSACTIONS & QUERY OPTIMIZATION ENGINE
 * ============================================================================
 * PURPOSE:
 *   Database Systems & Query Optimization Engine providing:
 *   1. ACID Transaction Wrapper (`withAcidTransaction`) with automatic fallback
 *      for standalone local MongoDB instances (error code 20 / 263).
 *   2. O(1) Keyset / Cursor-Based Pagination helpers (`encodeCursor`, `decodeCursor`)
 *      to avoid O(N) MongoDB `.skip()` scans on deep pages.
 *   3. Multi-dimensional Job Market Facet Analytics (`computeJobAnalytics` /
 *      `computeJobAnalyticsFacet`) for job types, locations, experience brackets,
 *      and top demanded skills.
 *   4. 8-Stage Recruiter Hiring Pipeline Funnel Analytics
 *      (`computeRecruiterPipelineAnalytics` / `computeRecruiterPipelineFacet`)
 *      with stage-to-stage conversion metrics.
 * ============================================================================
 */

/**
 * Executes a multi-document database mutation inside a Mongoose ACID Transaction.
 * If the connected MongoDB deployment is a standalone node (common in local dev)
 * rather than a Replica Set, it catches error code 20 ("Transaction numbers are
 * only allowed on a replica set member or mongos") and seamlessly executes `workFn(null)`
 * so local development never breaks while production Atlas clusters get full ACID guarantees.
 *
 * @param {(session: import('mongoose').ClientSession | null) => Promise<any>} workFn
 */
export const withAcidTransaction = async (workFn) => {
    if (mongoose.connection.readyState !== 1) {
        return await workFn(null);
    }

    let session = null;
    try {
        session = await mongoose.startSession();
        let result;
        await session.withTransaction(async () => {
            result = await workFn(session);
        });
        return result;
    } catch (error) {
        const msg = String(error?.message || "");
        const isStandaloneMongoError =
            error?.code === 20 ||
            error?.code === 263 ||
            msg.includes("Transaction numbers are only allowed on a replica set") ||
            msg.includes("transactions are not supported");

        if (isStandaloneMongoError) {
            // Graceful fallback for local standalone MongoDB instances
            return await workFn(null);
        }
        throw error;
    } finally {
        if (session) {
            try {
                await session.endSession();
            } catch {
                // Ignore session cleanup errors
            }
        }
    }
};

/**
 * Encodes a pagination cursor from a timestamp and document ID into a URL-safe Base64 token.
 */
export const encodeCursor = (createdAt, id) => {
    if (!createdAt || !id) return null;
    const payload = JSON.stringify({
        t: new Date(createdAt).toISOString(),
        id: String(id)
    });
    return Buffer.from(payload, "utf8").toString("base64url");
};

/**
 * Decodes a Base64url pagination cursor back into its `{ createdAt, id }` components.
 */
export const decodeCursor = (cursorStr) => {
    if (!cursorStr || typeof cursorStr !== "string") return null;
    try {
        const raw = Buffer.from(cursorStr, "base64url").toString("utf8");
        const parsed = JSON.parse(raw);
        if (!parsed.t || !parsed.id) return null;
        return {
            createdAt: new Date(parsed.t),
            id: String(parsed.id)
        };
    } catch {
        return null;
    }
};

/**
 * Computes multi-dimensional job market facet analytics in a single O(N) pass.
 */
export const computeJobAnalytics = (jobs = []) => {
    const byJobType = {};
    const byLocation = {};
    const byExperience = {
        "Fresher (0 Yrs)": 0,
        "Junior (1-2 Yrs)": 0,
        "Mid-Level (3-4 Yrs)": 0,
        "Senior (5+ Yrs)": 0
    };
    const skillFrequency = {};
    let totalOpenPositions = 0;

    for (const job of jobs) {
        const jt = job.jobType || "Full-Time";
        byJobType[jt] = (byJobType[jt] || 0) + 1;

        const rawLoc = (job.location || "India").split(",")[0].trim();
        const city = rawLoc.toLowerCase() === "bangalore" ? "Bengaluru" : rawLoc;
        byLocation[city] = (byLocation[city] || 0) + 1;

        const exp = Number(job.experienceLevel ?? 0);
        if (exp <= 0) byExperience["Fresher (0 Yrs)"]++;
        else if (exp <= 2) byExperience["Junior (1-2 Yrs)"]++;
        else if (exp <= 4) byExperience["Mid-Level (3-4 Yrs)"]++;
        else byExperience["Senior (5+ Yrs)"]++;

        const reqs = Array.isArray(job.requirements)
            ? job.requirements.flatMap((r) => String(r).split(",")).map((s) => s.trim()).filter(Boolean)
            : [];
        for (const sk of reqs) {
            skillFrequency[sk] = (skillFrequency[sk] || 0) + 1;
        }

        totalOpenPositions += Number(job.position || 1);
    }

    const topSkills = Object.entries(skillFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([skill, count]) => ({ skill, count }));

    return {
        totalJobs: jobs.length,
        totalOpenPositions,
        byJobType,
        byLocation,
        byExperience,
        topSkills
    };
};

/**
 * Async-safe facet wrapper used by `system.controller.js`.
 * Accepts either a pre-fetched `jobs` array OR automatically queries `Job.find().lean()`.
 */
export const computeJobAnalyticsFacet = async (jobs = null) => {
    try {
        const list = Array.isArray(jobs)
            ? jobs
            : mongoose.connection.readyState === 1
            ? await Job.find({}).lean()
            : [];
        return computeJobAnalytics(list);
    } catch {
        return computeJobAnalytics([]);
    }
};

/**
 * Computes 8-stage hiring pipeline funnel analytics and stage-to-stage conversion
 * rates across applications.
 */
export const computeRecruiterPipelineAnalytics = (applications = []) => {
    const stages = {
        applied: 0,
        shortlisted: 0,
        assignment_sent: 0,
        interview_scheduled: 0,
        interview_passed: 0,
        offer_sent: 0,
        offer_accepted: 0,
        hired: 0,
        rejected: 0
    };

    for (const app of applications) {
        const st =
            app.hiringStage ||
            (app.status === "accepted"
                ? "shortlisted"
                : app.status === "rejected"
                ? "rejected"
                : "applied");
        if (stages[st] !== undefined) {
            stages[st]++;
        } else {
            stages.applied++;
        }
    }

    const total = applications.length;
    const progressedPastApplied =
        stages.shortlisted +
        stages.assignment_sent +
        stages.interview_scheduled +
        stages.interview_passed +
        stages.offer_sent +
        stages.offer_accepted +
        stages.hired;

    const reachedInterviewOrBeyond =
        stages.interview_scheduled +
        stages.interview_passed +
        stages.offer_sent +
        stages.offer_accepted +
        stages.hired;

    const reachedOfferOrBeyond =
        stages.offer_sent +
        stages.offer_accepted +
        stages.hired;

    return {
        totalApplications: total,
        stages,
        conversionMetrics: {
            shortlistRate: total > 0 ? Math.round((progressedPastApplied / total) * 100) : 0,
            interviewRate: total > 0 ? Math.round((reachedInterviewOrBeyond / total) * 100) : 0,
            offerRate: total > 0 ? Math.round((reachedOfferOrBeyond / total) * 100) : 0,
            hireRate: total > 0 ? Math.round((stages.hired / total) * 100) : 0
        }
    };
};

/**
 * Async-safe pipeline facet wrapper used by `system.controller.js`.
 */
export const computeRecruiterPipelineFacet = async (applications = null) => {
    try {
        const list = Array.isArray(applications) && applications.length > 0
            ? applications
            : mongoose.connection.readyState === 1
            ? await Application.find({}).lean()
            : [];
        return computeRecruiterPipelineAnalytics(list);
    } catch {
        return computeRecruiterPipelineAnalytics([]);
    }
};