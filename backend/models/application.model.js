import mongoose from "mongoose";

/**
 * ============================================================================
 * APPLICATION MODEL — RACE-CONDITION SAFE & KANBAN-INDEXED
 * ============================================================================
 * WHY WE ADDED THE UNIQUE COMPOUND INDEX `{ job: 1, applicant: 1 }`:
 * - Solves the TOCTOU (Time-Of-Check to Time-Of-Use) Race Condition:
 *   If a candidate double-clicks "Apply" or sends two concurrent requests 2ms
 *   apart, both requests could pass `Application.findOne({ job, applicant })`
 *   before either finishes `Application.create()`.
 * - With a database-level `{ unique: true }` compound index on `{ job: 1, applicant: 1 }`,
 *   MongoDB's WiredTiger storage engine enforces uniqueness at the B-Tree key
 *   level and rejects any duplicate with error code `11000`.
 * ============================================================================
 */
const applicationSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true
        },
        applicant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending"
        },
        hiringStage: {
            type: String,
            enum: [
                "applied",
                "shortlisted",
                "assignment_sent",
                "interview_scheduled",
                "interview_passed",
                "offer_sent",
                "offer_accepted",
                "offer_declined",
                "hired",
                "rejected"
            ],
            default: "applied"
        },
        currentRound: {
            type: Number,
            default: 0
        },
        coverNote: {
            type: String,
            default: ""
        },
        interviewDetails: {
            roundName: { type: String, default: "" },
            roundNumber: { type: Number, default: 1 },
            date: { type: String, default: "" },
            time: { type: String, default: "" },
            duration: { type: Number, default: 45 },
            mode: { type: String, default: "Google Meet" },
            meetingLink: { type: String, default: "" },
            notes: { type: String, default: "" }
        },
        assignmentDetails: {
            title: { type: String, default: "" },
            instructions: { type: String, default: "" },
            referenceLink: { type: String, default: "" },
            deadline: { type: String, default: "" },
            submissionLink: { type: String, default: "" },
            submittedAt: { type: Date }
        },
        offerDetails: {
            ctc: { type: String, default: "" },
            joiningDate: { type: String, default: "" },
            location: { type: String, default: "" },
            probationMonths: { type: Number, default: 3 },
            benefits: { type: String, default: "" },
            letterContent: { type: String, default: "" },
            issuedAt: { type: Date },
            responseStatus: {
                type: String,
                enum: ["pending", "accepted", "declined"],
                default: "pending"
            },
            candidateSignature: { type: String, default: "" },
            candidateNote: { type: String, default: "" },
            respondedAt: { type: Date }
        },
        joiningDetails: {
            joiningDate: { type: String, default: "" },
            reportingTime: { type: String, default: "10:00 AM" },
            reportingManager: { type: String, default: "" },
            workMode: { type: String, default: "Hybrid" },
            documentsRequired: { type: String, default: "" },
            letterContent: { type: String, default: "" },
            issuedAt: { type: Date }
        },
        emailLogs: [
            {
                actionType: { type: String },
                subject: { type: String },
                body: { type: String },
                sentAt: { type: Date, default: Date.now },
                deliveryMode: { type: String },
                previewUrl: { type: String, default: "" },
                metadata: { type: mongoose.Schema.Types.Mixed }
            }
        ]
    },
    { timestamps: true }
);

// 1. Unique Compound Index: Prevents race-condition duplicate job applications
applicationSchema.index(
    { job: 1, applicant: 1 },
    { unique: true, name: "Application_Unique_Job_Applicant_Index" }
);

// 2. Candidate Applied Jobs History Index
applicationSchema.index(
    { applicant: 1, createdAt: -1 },
    { name: "Application_Candidate_History_Index" }
);

// 3. Recruiter Kanban Pipeline Stage Index
applicationSchema.index(
    { job: 1, hiringStage: 1, createdAt: -1 },
    { name: "Application_Job_KanbanStage_Index" }
);

export const Application = mongoose.model("Application", applicationSchema);