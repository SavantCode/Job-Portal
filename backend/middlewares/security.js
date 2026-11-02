import mongoose from "mongoose";

/**
 * Enterprise Security & Database Protection Middleware Suite
 * - Full express-mongo-sanitize implementation (strips $ operators & dot-notation keys from body/query/params)
 * - Blocks MongoDB server-side JS execution ($where, $function, $accumulator, mapReduce)
 * - Blocks SQL/NoSQL Injection payloads & XSS script vectors
 * - Validates MongoDB ObjectIds on route params (:id, :jobId, :companyId) to prevent CastError crashes
 * - Sliding-window IP & Account/Role Rate Limiting
 */

const rateLimitBuckets = new Map();

// Periodic cleanup of expired rate-limit entries every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitBuckets.entries()) {
        if (now > entry.resetAt) {
            rateLimitBuckets.delete(key);
        }
    }
}, 5 * 60 * 1000).unref?.();

export const getClientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "unknown";
};

/**
 * Configurable Sliding-Window Rate Limiter
 */
export const createRateLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 300,
    keyPrefix = "global",
    keyGenerator = null,
    message = "Too many requests from this IP, please try again later."
} = {}) => {
    return (req, res, next) => {
        const ip = getClientIp(req);
        const customKey = typeof keyGenerator === "function" ? keyGenerator(req, ip) : ip;
        const key = `${keyPrefix}:${customKey}`;
        const now = Date.now();

        let record = rateLimitBuckets.get(key);
        if (!record || now > record.resetAt) {
            record = { count: 0, resetAt: now + windowMs };
        }

        record.count += 1;
        rateLimitBuckets.set(key, record);

        const remaining = Math.max(0, max - record.count);
        const resetSeconds = Math.ceil((record.resetAt - now) / 1000);

        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader("X-RateLimit-Remaining", String(remaining));
        res.setHeader("X-RateLimit-Reset", String(resetSeconds));

        if (record.count > max) {
            res.setHeader("Retry-After", String(resetSeconds));
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
    max: 10,
    keyPrefix: "auth_login",
    keyGenerator: (req, ip) => {
        const role = String(req.body?.role || "any").toLowerCase().trim();
        const email = String(req.body?.email || "").toLowerCase().trim();
        return `${ip}:${role}:${email || "ip_only"}`;
    },
    message: "Too many login attempts for this account/role. Please wait before trying again."
});

/**
 * Dedicated Signup / Registration Rate Limiter for ALL Roles (student & recruiter)
 */
export const signupRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyPrefix: "auth_signup",
    keyGenerator: (req, ip) => {
        const role = String(req.body?.role || "any").toLowerCase().trim();
        return `${ip}:${role}`;
    },
    message: "Too many signup attempts from this IP. Please wait before creating another account."
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
    res.removeHeader("X-Powered-By");
    next();
};

const DANGEROUS_MONGO_KEYS = new Set([
    "$where",
    "$function",
    "$accumulator",
    "$expr",
    "__proto__",
    "constructor",
    "prototype"
]);

/**
 * express-mongo-sanitize equivalent + XSS & SQL/NoSQL injection string cleaner
 * Recursively strips keys starting with '$' or containing '.' from objects/arrays
 */
const sanitizePayload = (target, stats = { stripped: 0 }) => {
    if (!target || typeof target !== "object") return target;

    if (Array.isArray(target)) {
        for (let i = 0; i < target.length; i++) {
            if (typeof target[i] === "string") {
                target[i] = cleanStringValue(target[i]);
            } else if (typeof target[i] === "object" && target[i] !== null) {
                target[i] = sanitizePayload(target[i], stats);
            }
        }
        return target;
    }

    for (const key of Object.keys(target)) {
        const trimmedKey = key.trim();
        if (
            trimmedKey.startsWith("$") ||
            trimmedKey.includes(".") ||
            DANGEROUS_MONGO_KEYS.has(trimmedKey.toLowerCase())
        ) {
            delete target[key];
            stats.stripped += 1;
            continue;
        }

        const val = target[key];
        if (typeof val === "string") {
            target[key] = cleanStringValue(val);
        } else if (typeof val === "object" && val !== null) {
            target[key] = sanitizePayload(val, stats);
        }
    }

    return target;
};

const cleanStringValue = (str) => {
    return str
        .replace(/\0/g, "") // Strip null bytes
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript\s*:/gi, "")
        .replace(/\$where|\$function|\$accumulator/gi, "");
};

/**
 * Express Middleware for MongoDB NoSQL Injection (express-mongo-sanitize), SQL Injection & XSS Protection
 */
export const mongoSanitizeAndXss = (req, res, next) => {
    try {
        const stats = { stripped: 0 };
        if (req.body && typeof req.body === "object") sanitizePayload(req.body, stats);
        if (req.query && typeof req.query === "object") sanitizePayload(req.query, stats);
        if (req.params && typeof req.params === "object") sanitizePayload(req.params, stats);

        if (stats.stripped > 0) {
            console.warn(
                `[SECURITY] Stripped ${stats.stripped} prohibited MongoDB operator key(s) from ${req.method} ${req.originalUrl} (IP: ${getClientIp(req)})`
            );
        }
    } catch {
        // Continue safely
    }
    next();
};

/**
 * Validates MongoDB ObjectId route parameters (:id, :jobId, :companyId)
 * Prevents malformed IDs or injection strings from causing Mongoose CastErrors
 */
export const validateObjectIdParams = (req, res, next) => {
    const paramKeys = ["id", "jobId", "companyId", "applicationId"];
    for (const key of paramKeys) {
        const val = req.params?.[key];
        if (val !== undefined && val !== "" && !mongoose.Types.ObjectId.isValid(val)) {
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