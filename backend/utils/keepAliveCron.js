import mongoose from "mongoose";

/**
 * ============================================================================
 * RENDER 24/7 KEEP-ALIVE CRON SCHEDULER
 * ============================================================================
 * Prevents Render Free Tier web services from spinning down after 15 minutes
 * of inactivity by:
 * 1. Automatically resolving Render's injected `RENDER_EXTERNAL_URL` (or
 *    `BACKEND_PUBLIC_URL` / `PUBLIC_API_URL`) and sending an outbound HTTP(S)
 *    GET request to `/api/v1/health?source=keepalive-cron` every 13 minutes.
 * 2. Pinging the active MongoDB connection pool so Atlas connections never
 *    drop into idle timeouts.
 */

const CRON_INTERVAL_MS = 13 * 60 * 1000; // 13 minutes (Render sleeps at 15m)

const cronStats = {
    enabled: false,
    intervalMinutes: 13,
    targetUrl: null,
    totalPings: 0,
    successfulPings: 0,
    failedPings: 0,
    lastPingAt: null,
    lastPingStatus: "IDLE",
    lastResponseTimeMs: null
};

let cronTimer = null;

export const resolvePublicHealthUrl = () => {
    const rawBase =
        process.env.RENDER_EXTERNAL_URL ||
        process.env.BACKEND_PUBLIC_URL ||
        process.env.PUBLIC_API_URL ||
        "";

    const cleanBase = rawBase.trim().replace(/\/+$/, "");
    if (!cleanBase) return null;

    if (cleanBase.endsWith("/api/v1/health")) {
        return `${cleanBase}?source=keepalive-cron`;
    }
    if (cleanBase.endsWith("/api/v1")) {
        return `${cleanBase}/health?source=keepalive-cron`;
    }
    return `${cleanBase}/api/v1/health?source=keepalive-cron`;
};

export const executeKeepAlivePing = async () => {
    const startMs = performance.now();
    cronStats.totalPings += 1;
    cronStats.lastPingAt = new Date().toISOString();

    try {
        // 1. Keep MongoDB connection pool warm
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            await mongoose.connection.db.admin().ping();
        }

        // 2. If deployed with a public URL (e.g., Render), send an external HTTP ping
        const targetUrl = resolvePublicHealthUrl();
        cronStats.targetUrl = targetUrl || `http://127.0.0.1:${process.env.PORT || 8000}/api/v1/health?source=keepalive-cron`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(cronStats.targetUrl, {
            method: "GET",
            headers: {
                "User-Agent": "JobPortal-KeepAlive-Cron/1.0",
                "X-Keep-Alive-Cron": "true"
            },
            signal: controller.signal
        });

        clearTimeout(timeout);

        cronStats.lastResponseTimeMs = Number((performance.now() - startMs).toFixed(2));

        if (response.ok) {
            cronStats.successfulPings += 1;
            cronStats.lastPingStatus = `OK (${response.status})`;
        } else {
            cronStats.failedPings += 1;
            cronStats.lastPingStatus = `HTTP_${response.status}`;
        }
    } catch (error) {
        cronStats.failedPings += 1;
        cronStats.lastResponseTimeMs = Number((performance.now() - startMs).toFixed(2));
        cronStats.lastPingStatus = `ERROR: ${error?.message || "Ping failed"}`;
    }
};

export const startKeepAliveCron = () => {
    if (cronTimer) return;

    cronStats.enabled = true;
    cronStats.targetUrl =
        resolvePublicHealthUrl() ||
        `http://127.0.0.1:${process.env.PORT || 8000}/api/v1/health?source=keepalive-cron`;

    // Schedule recurring 13-minute keep-alive ping
    cronTimer = setInterval(() => {
        executeKeepAlivePing();
    }, CRON_INTERVAL_MS);

    // Allow process to exit cleanly during graceful shutdowns
    cronTimer.unref?.();

    // Run an initial warm-up ping 30 seconds after server boot
    setTimeout(() => {
        executeKeepAlivePing();
    }, 30 * 1000).unref?.();

    console.log(
        `[KeepAliveCron] Active — pinging ${cronStats.targetUrl} every ${cronStats.intervalMinutes} minutes.`
    );
};

export const getKeepAliveStats = () => ({
    ...cronStats
});