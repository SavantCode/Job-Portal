import mongoose from "mongoose";

/**
 * ============================================================================
 * IMMUTABLE SECURITY & HIRING AUDIT LOG MODEL
 * ============================================================================
 * Purpose:
 * - Provides an append-only event log for security events (logins, rate-limit blocks,
 *   NoSQL sanitization alerts) and hiring lifecycle mutations (job posted,
 *   application submitted, stage updated, offer letter sent, cache flushed).
 * - Uses flexible String types for entityId and actorRole so both MongoDB ObjectIds
 *   and system identifiers (e.g. "auth_login", "global_cache") never fail validation.
 * - Includes a 180-day TTL index so MongoDB automatically purges expired compliance logs.
 */
const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            index: true
        },
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        actorName: {
            type: String,
            default: "System / Anonymous"
        },
        actorEmail: {
            type: String,
            default: ""
        },
        actorRole: {
            type: String,
            default: "anonymous"
        },
        entityType: {
            type: String,
            default: "System"
        },
        entityId: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["SUCCESS", "BLOCKED", "FAILURE", "INFO"],
            default: "SUCCESS"
        },
        ipAddress: {
            type: String,
            default: "127.0.0.1"
        },
        userAgent: {
            type: String,
            default: ""
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true }
);

// Compound indexes for fast filtering in Platform Headquarters
auditLogSchema.index({ action: 1, createdAt: -1 }, { name: "AuditLog_Action_CreatedAt_Index" });
auditLogSchema.index({ actorId: 1, createdAt: -1 }, { name: "AuditLog_Actor_CreatedAt_Index" });
auditLogSchema.index({ status: 1, createdAt: -1 }, { name: "AuditLog_Status_CreatedAt_Index" });

// Automatic 180-day TTL Retention Index
auditLogSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 180 * 24 * 60 * 60, name: "AuditLog_TTL_180Days_Index" }
);

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);

/**
 * Non-blocking helper to record an audit log entry without adding latency
 * to the main HTTP request/response cycle.
 */
export const logAuditEvent = ({
    req = null,
    action = "SYSTEM_EVENT",
    actorId = null,
    actorName = "",
    actorEmail = "",
    actorRole = "",
    entityType = "System",
    entityId = "",
    status = "SUCCESS",
    metadata = {}
} = {}) => {
    setImmediate(async () => {
        try {
            const forwarded = req?.headers?.["x-forwarded-for"];
            const rawIp =
                (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") ||
                req?.ip ||
                req?.socket?.remoteAddress ||
                "127.0.0.1";

            const resolvedActorId =
                actorId && mongoose.Types.ObjectId.isValid(String(actorId))
                    ? actorId
                    : req?.id && mongoose.Types.ObjectId.isValid(String(req.id))
                    ? req.id
                    : null;

            await AuditLog.create({
                action: String(action || "SYSTEM_EVENT"),
                actorId: resolvedActorId,
                actorName: actorName || req?.userFullname || (resolvedActorId ? "Authenticated User" : "System / Guest"),
                actorEmail: actorEmail || req?.userEmail || "",
                actorRole: actorRole || req?.userRole || (resolvedActorId ? "user" : "anonymous"),
                entityType: String(entityType || "System"),
                entityId: entityId ? String(entityId) : "",
                status: ["SUCCESS", "BLOCKED", "FAILURE", "INFO"].includes(status) ? status : "SUCCESS",
                ipAddress: String(rawIp),
                userAgent: String(req?.headers?.["user-agent"] || "").slice(0, 250),
                metadata: metadata || {}
            });
        } catch {
            // Never crash the main application if background audit logging fails
        }
    });
};

// Alias for backward compatibility across all controllers
export const recordAuditLog = logAuditEvent;