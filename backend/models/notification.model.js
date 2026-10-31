import mongoose from "mongoose";

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
            'shortlisted',
            'assignment',
            'interview',
            'interview_passed',
            'offer_letter',
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