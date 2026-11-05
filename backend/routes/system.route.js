import express from "express";
import jwt from "jsonwebtoken";
import {
    getSystemHealthAndTelemetry,
    getAuditLogs,
    getDeadLetterQueue,
    replayDeadLetterTask,
    flushSystemCache,
    getPlatformHeadquartersOverview,
    createTestAuditEvent,
    adminDeleteJobFromHq
} from "../controllers/system.controller.js";

const router = express.Router();

/**
 * Optional Auth Extractor for Platform Headquarters (HQ):
 * Attaches req.id and req.userRole when a JWT cookie is present, while allowing
 * the Platform Maintainer / Developer to inspect `/admin/hq` directly in local dev.
 */
const optionalHqAuth = (req, _res, next) => {
    try {
        const token = req.cookies?.token;
        if (token) {
            const secret = process.env.SECRET_KEY || "jobportal_secret_key";
            const decoded = jwt.verify(token, secret);
            if (decoded?.userId) {
                req.id = decoded.userId;
                req.userRole = decoded.role || null;
            }
        }
    } catch {
        // Proceed in maintainer mode if token expired
    }
    next();
};

// Telemetry, Analytics & Read-Only HQ Endpoints
router.route("/health").get(getSystemHealthAndTelemetry);
router.route("/hq-overview").get(optionalHqAuth, getPlatformHeadquartersOverview);
router.route("/audit-logs").get(optionalHqAuth, getAuditLogs);
router.route("/dlq").get(optionalHqAuth, getDeadLetterQueue);

// Operational & Maintainer Controls in HQ
router.route("/audit-logs/test").post(optionalHqAuth, createTestAuditEvent);
router.route("/dlq/:id/replay").post(optionalHqAuth, replayDeadLetterTask);
router.route("/cache/flush").post(optionalHqAuth, flushSystemCache);
router.route("/hq/job/:id").delete(optionalHqAuth, adminDeleteJobFromHq);

export default router;