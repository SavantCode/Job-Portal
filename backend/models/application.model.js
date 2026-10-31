import mongoose from "mongoose";

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
        issuedAt: { type: Date }
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
            actionType: { type: String }, // shortlist, assignment, interview, offer_letter, joining_letter, rejection
            subject: { type: String },
            body: { type: String },
            sentAt: { type: Date, default: Date.now },
            deliveryMode: { type: String }, // smtp | ethereal
            previewUrl: { type: String, default: "" },
            metadata: { type: mongoose.Schema.Types.Mixed }
        }
    ]
}, { timestamps: true });

export const Application = mongoose.model("Application", applicationSchema);