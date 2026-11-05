import mongoose from "mongoose";

/**
 * ============================================================================
 * JOB MODEL — WITH B-TREE ESR COMPOUND INDEXES & WEIGHTED FULL-TEXT INDEX
 * ============================================================================
 * WHY WE ADDED THESE INDEXES (INTERVIEW EXPLANATION):
 * 1. Without indexes, MongoDB performs a full Collection Scan (COLLSCAN) in O(N)
 *    time on every search or filter request.
 * 2. By applying the ESR Rule (Equality -> Sort -> Range), MongoDB traverses a
 *    balanced B-Tree (IXSCAN) in O(log N) time and returns pre-sorted results
 *    without an expensive in-memory SORT stage.
 * 3. The Weighted Full-Text Index builds an inverted index with stemming and
 *    stop-word removal, weighting `title` (10x) > `requirements` (8x) >
 *    `location` (5x) > `description` (3x) for relevance ranking.
 * ============================================================================
 */
const jobSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        requirements: [{ type: String }],
        salary: { type: String, required: true }, // String to accept ranges like "10-15"
        experienceLevel: { type: Number, required: true },
        location: { type: String, required: true, trim: true },
        jobType: { type: String, required: true, trim: true },
        position: { type: Number, required: true },
        company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
        created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        applications: [
            { type: mongoose.Schema.Types.ObjectId, ref: "Application" }
        ]
    },
    { timestamps: true }
);

// 1. Recruiter Dashboard Index: Fast lookup of a recruiter's jobs sorted newest-first
jobSchema.index(
    { created_by: 1, createdAt: -1 },
    { name: "Job_Recruiter_CreatedAt_Index" }
);

// 2. ESR (Equality -> Sort -> Range) Discovery Index for candidate job filtering
jobSchema.index(
    { location: 1, jobType: 1, createdAt: -1, experienceLevel: 1 },
    { name: "Job_ESR_Discovery_Index" }
);

// 3. Weighted Full-Text Search Index for relevance-scored keyword queries
jobSchema.index(
    {
        title: "text",
        requirements: "text",
        location: "text",
        description: "text"
    },
    {
        name: "Job_Weighted_FullText_Index",
        weights: {
            title: 10,
            requirements: 8,
            location: 5,
            description: 3
        }
    }
);

export const Job = mongoose.model("Job", jobSchema);