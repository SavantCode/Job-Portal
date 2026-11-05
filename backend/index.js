import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";
import aiRoute from "./routes/ai.route.js";
import notificationRoute from "./routes/notification.route.js";
import systemRoute from "./routes/system.route.js";
import {
    createRateLimiter,
    mongoSanitizeAndXss,
    requestLatencyTracker,
    securityHeaders,
    validateObjectIdParams
} from "./middlewares/security.js";
import { idempotencyMiddleware } from "./middlewares/idempotency.js";
import { startKeepAliveCron, getKeepAliveStats } from "./utils/keepAliveCron.js";

dotenv.config({});

const app = express();

// Required on Render, Railway & Vercel proxies so req.ip & secure cookies work accurately
app.set("trust proxy", 1);

// 1. High-Resolution Request Latency Tracker (X-Response-Time + P50/P95/P99 Telemetry)
app.use(requestLatencyTracker);

// 2. Security Headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
app.use(securityHeaders);

// 3. Body & Cookie Parsers with bounded payload sizes to prevent DoS memory exhaustion
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// 4. MongoDB NoSQL Operator Injection & XSS Sanitizer
app.use(mongoSanitizeAndXss);

// 5. Production-Ready CORS Configuration (Supports Localhost, FRONTEND_URL, and Vercel/Render deployments)
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3005",
    "http://localhost:3006"
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (
            !origin ||
            allowedOrigins.includes(origin) ||
            /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
            /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin) ||
            /^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/.test(origin)
        ) {
            callback(null, true);
        } else {
            callback(new Error("Origin not allowed by CORS policy"));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));

// 6. Tiered Sliding-Window Rate Limiters
// SSE streams and Keep-Alive Cron pings are skipped from rate-limiting.
const globalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 800,
    keyPrefix: "global",
    skip: (req) =>
        req.originalUrl?.includes("/notification/stream") ||
        req.headers?.["x-keep-alive-cron"] === "true" ||
        req.query?.source === "keepalive-cron",
    message: "Too many API requests from this IP, please wait a few minutes."
});
const aiLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 80,
    keyPrefix: "ai",
    message: "AI rate limit reached. Please wait a moment before generating more content."
});
const uploadLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 40,
    keyPrefix: "upload",
    message: "Too many file uploads from this IP. Please try again in 15 minutes."
});

app.use("/api/v1", globalLimiter);
app.use("/api/v1/user/profile/update", uploadLimiter);
app.use("/api/v1/user/resume/parse", uploadLimiter);
app.use("/api/v1/ai", aiLimiter);

// 7. Idempotency-Key Protection on Critical Mutation Routes
app.use("/api/v1/application/apply", idempotencyMiddleware);
app.use("/api/v1/job/post", idempotencyMiddleware);

// 8. Validate MongoDB ObjectIds across parameterized routes
app.param("id", validateObjectIdParams);
app.param("jobId", validateObjectIdParams);

// 9. Health Check & Render Keep-Alive Endpoint
app.get("/api/v1/health", (req, res) => {
    return res.status(200).json({
        success: true,
        status: "healthy",
        rateLimiting: "active",
        mongoSanitize: "active",
        lruCache: "active",
        sseBroker: "active",
        keepAliveCron: getKeepAliveStats(),
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 8000;

// 10. API Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/job", jobRoute);
app.use("/api/v1/application", applicationRoute);
app.use("/api/v1/ai", aiRoute);
app.use("/api/v1/notification", notificationRoute);
app.use("/api/v1/system", systemRoute);

// 11. Global Error Handler (prevents stack trace leaks in production)
app.use((err, req, res, next) => {
    if (err?.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: "Invalid resource identifier format."
        });
    }
    console.error("Unhandled Server Error:", err?.message || err);
    return res.status(err?.status || 500).json({
        success: false,
        message: err?.message || "Internal server error"
    });
});

app.listen(PORT, () => {
    connectDB();
    startKeepAliveCron();
    console.log(`Server running at port ${PORT}`);
});