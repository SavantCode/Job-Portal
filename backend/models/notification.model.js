import mongoose from "mongoose";

/**
 * ============================================================================
 * NOTIFICATION MODEL — WITH 90-DAY AUTOMATIC TTL EXPIRY INDEX
 * ============================================================================
 * WHY WE ADDED A TTL (TIME-TO-LIVE) INDEX:
 * - Notifications grow rapidly in high-volume platforms.
 * - `expireAfterSeconds: 7776000` (90 days) instructs MongoDB's background TTL
 *   daemon (which runs every 60s) to automatically purge notifications older
 *   than 90 days with zero cron jobs or manual cleanup queries.
 * ============================================================================
 */
const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        application: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Application"
        },
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job"
        },
        type: {
            type: String,
            enum: [
                "new_application",
                "shortlisted",
                "assignment",
                "assignment_submitted",
                "interview",
                "interview_passed",
                "offer_letter",
                "offer_accepted",
                "offer_declined",
                "joining_letter",
                "rejected",
                "status_update"
            ],
            default: "status_update"
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
    },
    { timestamps: true }
);

// 1. Fast Inbox & Unread Badge Query Index
notificationSchema.index(
    { recipient: 1, isRead: 1, createdAt: -1 },
    { name: "Notification_Recipient_Unread_Index" }
);

// 2. Automatic 90-Day TTL Purge Index (90 * 24 * 60 * 60 = 7,776,000 seconds)
notificationSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60, name: "Notification_90Day_TTL_Index" }
);

export const Notification = mongoose.model("Notification", notificationSchema);