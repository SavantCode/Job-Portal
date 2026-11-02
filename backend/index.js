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
import {
    createRateLimiter,
    mongoSanitizeAndXss,
    securityHeaders,
    validateObjectIdParams
} from "./middlewares/security.js";

dotenv.config({});

const app = express();

// 1. Security Headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
app.use(securityHeaders);

// 2. Body & Cookie Parsers with bounded payload sizes to prevent DoS memory exhaustion
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// 3. MongoDB NoSQL Operator Injection (express-mongo-sanitize) & XSS Sanitizer
app.use(mongoSanitizeAndXss);

// 4. CORS Configuration
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3005"
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true
};

app.use(cors(corsOptions));

// 5. Tiered Sliding-Window Rate Limiters
const globalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 500,
    keyPrefix: "global",
    message: "Too many API requests from this IP, please wait a few minutes."
});
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 40,
    keyPrefix: "auth",
    message: "Too many authentication attempts. Please wait 15 minutes before trying again."
});
const aiLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 80,
    keyPrefix: "ai",
    message: "AI rate limit reached. Please wait a moment before generating more content."
});
const uploadLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyPrefix: "upload",
    message: "Too many file uploads from this IP. Please try again in 15 minutes."
});

app.use("/api/v1", globalLimiter);
app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/register", authLimiter);
app.use("/api/v1/user/profile/update", uploadLimiter);
app.use("/api/v1/user/resume/parse", uploadLimiter);
app.use("/api/v1/ai", aiLimiter);

// 6. Validate MongoDB ObjectIds across parameterized routes
app.param("id", validateObjectIdParams);
app.param("jobId", validateObjectIdParams);

// 7. System Health & Observability Endpoint
app.get("/api/v1/health", (req, res) => {
    return res.status(200).json({
        success: true,
        status: "healthy",
        rateLimiting: "active",
        mongoSanitize: "active",
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 8000;

// 8. API Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/job", jobRoute);
app.use("/api/v1/application", applicationRoute);
app.use("/api/v1/ai", aiRoute);
app.use("/api/v1/notification", notificationRoute);

// 9. Global Error Handler (prevents stack trace leaks in production)
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
    console.log(`Server running at port ${PORT}`);
});