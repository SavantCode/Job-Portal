import mongoose from "mongoose";

/**
 * Application Schema
 * Tracks the end-to-end enterprise hiring lifecycle for a candidate's job application:
 * - Sequential hiringStage state machine (including two-way offer acceptance/decline)
 * - Multi-round interview scheduling metadata
 * - Technical assignment instructions & candidate submission links
 * - Official Offer Letter details + Candidate digital signature response
 * - Official Joining / Appointment Letter details
 * - Complete audit log of all dispatched emails & letters
 */
const applicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    applicant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    hiringStage: {
        type: String,
        enum: [
            'applied',
            'shortlisted',
            'assignment_sent',
            'interview_scheduled',
            'interview_passed',
            'offer_sent',
            'offer_accepted',
            'offer_declined',
            'hired',
            'rejected'
        ],
        default: 'applied'
    },
    currentRound: {
        type: Number,
        default: 0
    },
    coverNote: {
        type: String,
        default: ""
    },
    // Stores details for the active/latest scheduled interview round
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
    // Stores technical assignment brief sent by recruiter & submission link from candidate
    assignmentDetails: {
        title: { type: String, default: "" },
        instructions: { type: String, default: "" },
        referenceLink: { type: String, default: "" },
        deadline: { type: String, default: "" },
        submissionLink: { type: String, default: "" },
        submittedAt: { type: Date }
    },
    // Stores Official Offer Letter terms & Two-Way Candidate Acceptance/Signature
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
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending'
        },
        candidateSignature: { type: String, default: "" },
        candidateNote: { type: String, default: "" },
        respondedAt: { type: Date }
    },
    // Stores Official Joining / Appointment Letter onboarding instructions
    joiningDetails: {
        joiningDate: { type: String, default: "" },
        reportingTime: { type: String, default: "10:00 AM" },
        reportingManager: { type: String, default: "" },
        workMode: { type: String, default: "Hybrid" },
        documentsRequired: { type: String, default: "" },
        letterContent: { type: String, default: "" },
        issuedAt: { type: Date }
    },
    // Complete audit trail of every email/letter sent to the candidate
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
}, { timestamps: true });

export const Application = mongoose.model("Application", applicationSchema);