import mongoose from "mongoose";

/**
 * Notification Schema
 * Supports two-way real-time alerts for both Candidates (Students) and Recruiters:
 * - Candidate alerts: shortlisted, assignment, interview, interview_passed, offer_letter, joining_letter, rejected
 * - Recruiter alerts: new_application, assignment_submitted, offer_accepted, offer_declined
 */
const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application'
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    },
    type: {
        type: String,
        enum: [
            'new_application',
            'shortlisted',
            'assignment',
            'assignment_submitted',
            'interview',
            'interview_passed',
            'offer_letter',
            'offer_accepted',
            'offer_declined',
            'joining_letter',
            'rejected',
            'status_update'
        ],
        default: 'status_update'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    emailSubject: {
        type: String,
        default: ""
    },
    emailBody: {
        type: String,
        default: ""
    },
    previewUrl: {
        type: String,
        default: ""
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const Notification = mongoose.model("Notification", notificationSchema);