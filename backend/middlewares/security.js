import mongoose from "mongoose";
import { logAuditEvent } from "../models/auditLog.model.js";

/**
 * ============================================================================
 * ENTERPRISE SECURITY, RATE LIMITING & HIGH-RESOLUTION P95 LATENCY ENGINE
 * ============================================================================
 * What this module solves:
 * 1. Sliding-Window Rate Limiting with RFC-compliant X-RateLimit-* headers.
 * 2. Recursive NoSQL Operator Injection ($gt, $ne, $where) & Prototype Pollution
 *    (__proto__, constructor) sanitization across req.body, req.query, req.params.
 * 3. High-Resolution HTTP Latency Telemetry (X-Response-Time + P50/P95/P99 &
 *    per-route latency breakdown for Platform Headquarters).
 * 4. Strict ObjectId route parameter validation to prevent Mongoose CastErrors.
 */

const rateLimitBuckets = new Map();
const latencySamplesMs = [];
const MAX_LATENCY_SAMPLES = 500;
const routeLatencyMap = new Map();

const securityMetrics = {
    totalRateLimitedRequests: 0,
    totalSanitizedPayloads: 0,
    totalBlockedObjectIds: 0
};

// Periodic garbage collection of expired rate-limit buckets every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateLimitBuckets.entries()) {
        if (now > bucket.resetAt + 60000) {
            rateLimitBuckets.delete(key);
        }
    }
}, 60 * 1000).unref?.();

const extractClientIp = (req) => {
    const forwarded = req.headers?.["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "127.0.0.1";
};

/**
 * High-Resolution Request Latency Tracker Middleware
 * Attaches `X-Response-Time` header and records P50/P95/P99 metrics.
 */
export const requestLatencyTracker = (req, res, next) => {
    // Skip SSE stream from latency averages because streams stay open intentionally
    if (req.originalUrl?.includes("/notification/stream")) {
        return next();
    }

    const startNs = process.hrtime.bigint();

    const originalEnd = res.end;
    res.end = function (...args) {
        const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
        const roundedMs = Number(durationMs.toFixed(2));

        if (!res.headersSent) {
            res.setHeader("X-Response-Time", `${roundedMs}ms`);
        }

        latencySamplesMs.push(roundedMs);
        if (latencySamplesMs.length > MAX_LATENCY_SAMPLES) {
            latencySamplesMs.shift();
        }

        // Normalize dynamic IDs in route paths so /api/v1/job/get/65f... groups cleanly
        const cleanUrl = (req.originalUrl || req.url || "/")
            .split("?")[0]
            .replace(/\/[0-9a-fA-F]{24}/g, "/:id");
        const routeKey = `${req.method} ${cleanUrl}`;

        const existing = routeLatencyMap.get(routeKey) || { count: 0, totalMs: 0, maxMs: 0 };
        existing.count += 1;
        existing.totalMs += roundedMs;
        if (roundedMs > existing.maxMs) existing.maxMs = roundedMs;
        routeLatencyMap.set(routeKey, existing);

        return originalEnd.apply(this, args);
    };

    next();
};

/**
 * Factory for Tiered Sliding-Window Rate Limiters
 */
export const createRateLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 100,
    keyPrefix = "global",
    keyGenerator = null,
    skip = null,
    message = "Too many requests from this IP, please try again later."
} = {}) => {
    return (req, res, next) => {
        if (typeof skip === "function" && skip(req)) {
            return next();
        }

        const now = Date.now();
        const ip = extractClientIp(req);
        const customKey =
            typeof keyGenerator === "function"
                ? keyGenerator(req, ip)
                : `${req.id || ip}`;
        const bucketKey = `${keyPrefix}:${customKey}`;

        let record = rateLimitBuckets.get(bucketKey);
        if (!record || now > record.resetAt) {
            record = {
                count: 0,
                resetAt: now + windowMs
            };
        }

        record.count += 1;
        rateLimitBuckets.set(bucketKey, record);

        const remaining = Math.max(0, max - record.count);
        const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader("X-RateLimit-Remaining", String(remaining));
        res.setHeader("X-RateLimit-Reset", String(resetSeconds));

        if (record.count > max) {
            securityMetrics.totalRateLimitedRequests += 1;
            res.setHeader("Retry-After", String(resetSeconds));

            logAuditEvent({
                req,
                action: "RATE_LIMIT_EXCEEDED",
                entityType: "Security",
                entityId: keyPrefix,
                status: "BLOCKED",
                metadata: { tier: keyPrefix, url: req.originalUrl, retryAfterSeconds: resetSeconds }
            });

            return res.status(429).json({
                success: false,
                rateLimited: true,
                retryAfterSeconds: resetSeconds,
                message: `${message} (Retry in ${resetSeconds}s)`
            });
        }

        next();
    };
};

/**
 * Dedicated Login Rate Limiter for ALL Roles (student & recruiter)
 */
export const loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 25,
    keyPrefix: "auth_login",
    keyGenerator: (req, ip) => {
        const role = String(req.body?.role || "any").toLowerCase().trim();
        const email = String(req.body?.email || "").toLowerCase().trim();
        return `${ip}:${role}:${email || "ip_only"}`;
    },
    message: "Too many login attempts for this account. Please wait before trying again."
});

/**
 * Dedicated Signup / Registration Rate Limiter for ALL Roles (student & recruiter)
 * Runs AFTER multer or keys safely by IP so multipart form-data never causes undefined role issues.
 */
export const signupRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyPrefix: "auth_signup",
    keyGenerator: (req, ip) => {
        const email = String(req.body?.email || "").toLowerCase().trim();
        return `${ip}:${email || "register"}`;
    },
    message: "Too many registration attempts from this IP. Please wait before creating another account."
});

/**
 * Helmet-grade HTTP Security Headers
 */
export const securityHeaders = (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), geolocation=(), payment=()");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
};

/**
 * Recursive NoSQL Operator ($gt, $ne, $where, $regex) & Prototype Pollution Sanitizer
 */
const sanitizeObjectInPlace = (obj, stats) => {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            if (typeof obj[i] === "object" && obj[i] !== null) {
                sanitizeObjectInPlace(obj[i], stats);
            } else if (typeof obj[i] === "string") {
                obj[i] = obj[i].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
            }
        }
        return;
    }

    for (const key of Object.keys(obj)) {
        if (
            key.startsWith("$") ||
            key.includes(".") ||
            key === "__proto__" ||
            key === "constructor" ||
            key === "prototype"
        ) {
            delete obj[key];
            stats.stripped.push(key);
            continue;
        }

        const value = obj[key];
        if (typeof value === "object" && value !== null) {
            sanitizeObjectInPlace(value, stats);
        } else if (typeof value === "string") {
            obj[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
        }
    }
};

export const mongoSanitizeAndXss = (req, _res, next) => {
    try {
        const stats = { stripped: [] };
        if (req.body) sanitizeObjectInPlace(req.body, stats);
        if (req.query) sanitizeObjectInPlace(req.query, stats);
        if (req.params) sanitizeObjectInPlace(req.params, stats);

        if (stats.stripped.length > 0) {
            securityMetrics.totalSanitizedPayloads += 1;
            logAuditEvent({
                req,
                action: "NOSQL_INJECTION_ATTEMPT_SANITIZED",
                entityType: "Security",
                status: "BLOCKED",
                metadata: { strippedKeys: stats.stripped, url: req.originalUrl }
            });
        }
    } catch {
        // Continue safely
    }
    next();
};

/**
 * Validates MongoDB ObjectId route parameters (:id, :jobId, :companyId)
 */
export const validateObjectIdParams = (req, res, next) => {
    const paramKeys = ["id", "jobId", "companyId", "applicationId"];
    for (const key of paramKeys) {
        const val = req.params?.[key];
        if (val !== undefined && val !== "" && !mongoose.Types.ObjectId.isValid(val)) {
            securityMetrics.totalBlockedObjectIds += 1;
            return res.status(400).json({
                success: false,
                message: `Invalid ${key} identifier format.`
            });
        }
    }
    next();
};

/**
 * Escapes user strings before passing to MongoDB $regex to prevent ReDoS attacks
 */
export const escapeRegex = (str = "") => {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Computes live P50, P95, P99, and Average HTTP Latency + Rate-Limiter Telemetry
 * Returns both `security` and `securityCounters` keys so all callers stay 100% compatible.
 */
export const getSecurityAndLatencyStats = () => {
    const sorted = [...latencySamplesMs].sort((a, b) => a - b);
    const count = sorted.length;

    const getPercentile = (p) => {
        if (count === 0) return 0;
        const idx = Math.min(count - 1, Math.floor((p / 100) * count));
        return Number(sorted[idx].toFixed(2));
    };

    const avgMs =
        count > 0 ? Number((sorted.reduce((sum, v) => sum + v, 0) / count).toFixed(2)) : 0;

    const topEndpoints = Array.from(routeLatencyMap.entries())
        .map(([route, data]) => ({
            route,
            requests: data.count,
            avgMs: Number((data.totalMs / data.count).toFixed(2)),
            maxMs: Number(data.maxMs.toFixed(2))
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

    const countersPayload = {
        activeRateLimitBuckets: rateLimitBuckets.size,
        totalRateLimitedRequests: securityMetrics.totalRateLimitedRequests,
        totalSanitizedPayloads: securityMetrics.totalSanitizedPayloads,
        totalBlockedObjectIds: securityMetrics.totalBlockedObjectIds
    };

    return {
        latency: {
            sampleCount: count,
            avgMs,
            p50Ms: getPercentile(50),
            p95Ms: getPercentile(95),
            p99Ms: getPercentile(99),
            topEndpoints
        },
        security: countersPayload,
        securityCounters: countersPayload
    };
};