import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * ============================================================================
 * IDEMPOTENCY-KEY MIDDLEWARE (AT-MOST-ONCE MUTATION GUARANTEE)
 * ============================================================================
 * Bug Fixed:
 * - Previously, when mounted in `index.js` before `isAuthenticated`, `req.id` was
 *   undefined, causing all users on the same IP to share an idempotency fingerprint.
 * - Now automatically extracts `userId` from the JWT cookie if `req.id` is not yet
 *   populated, and includes `req.originalUrl` (which has `:id`) + body hash so
 *   applying to Job A and then Job B never collides.
 */

const idempotencyStore = new Map();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes for explicit Idempotency-Key header
const AUTO_FINGERPRINT_TTL_MS = 4 * 1000; // 4 seconds double-click protection

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of idempotencyStore.entries()) {
        if (now > entry.expiresAt) {
            idempotencyStore.delete(key);
        }
    }
}, 60 * 1000).unref?.();

let totalReplayedRequests = 0;

const resolveActorId = (req) => {
    if (req.id) return String(req.id);
    try {
        const token = req.cookies?.token;
        if (token) {
            const decoded = jwt.verify(token, process.env.SECRET_KEY || "jobportal_secret_key");
            if (decoded?.userId) return String(decoded.userId);
        }
    } catch {
        // Fallback to IP if unauthenticated
    }
    return req.ip || "anon";
};

export const idempotencyMiddleware = (req, res, next) => {
    if (!["POST", "PUT", "DELETE"].includes(req.method)) {
        return next();
    }

    const explicitHeaderKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
    const actor = resolveActorId(req);

    let key;
    let ttl = IDEMPOTENCY_TTL_MS;

    if (explicitHeaderKey) {
        key = `idem:explicit:${actor}:${explicitHeaderKey}`;
    } else {
        // Automatic 4-second double-click protection keyed by actor + method + exact URL + body
        const bodyHash = crypto
            .createHash("sha1")
            .update(JSON.stringify(req.body || {}))
            .digest("hex")
            .slice(0, 14);
        key = `idem:auto:${actor}:${req.method}:${req.originalUrl}:${bodyHash}`;
        ttl = AUTO_FINGERPRINT_TTL_MS;
    }

    const existing = idempotencyStore.get(key);
    const now = Date.now();

    if (existing && now <= existing.expiresAt) {
        if (existing.state === "IN_PROGRESS") {
            return res.status(409).json({
                success: false,
                message: "Duplicate request is currently being processed. Please wait a moment."
            });
        }

        if (existing.state === "COMPLETED") {
            totalReplayedRequests += 1;
            res.setHeader("X-Idempotent-Replayed", "true");
            return res.status(existing.statusCode).json(existing.responseBody);
        }
    }

    idempotencyStore.set(key, {
        state: "IN_PROGRESS",
        startedAt: now,
        expiresAt: now + ttl
    });

    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            idempotencyStore.set(key, {
                state: "COMPLETED",
                statusCode: res.statusCode,
                responseBody: body,
                expiresAt: Date.now() + ttl
            });
        } else {
            // Allow immediate retry if request failed validation or returned 4xx/5xx
            idempotencyStore.delete(key);
        }
        return originalJson(body);
    };

    next();
};

export const getIdempotencyStats = () => ({
    trackedKeys: idempotencyStore.size,
    totalReplayedRequests
});