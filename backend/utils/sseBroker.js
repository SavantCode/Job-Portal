/**
 * ============================================================================
 * REAL-TIME SERVER-SENT EVENTS (SSE) NOTIFICATION MULTIPLEXER BROKER
 * ============================================================================
 */
class SSENotificationBroker {
    constructor() {
        this.clients = new Map();
        this.totalEventsPublished = 0;
    }

    subscribe(userId, req, res) {
        const key = String(userId);

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no"
        });

        if (!this.clients.has(key)) {
            this.clients.set(key, new Set());
        }
        this.clients.get(key).add(res);

        res.write(
            `event: connected\ndata: ${JSON.stringify({
                connected: true,
                userId: key,
                timestamp: new Date().toISOString()
            })}\n\n`
        );

        const heartbeatTimer = setInterval(() => {
            try {
                res.write(`: heartbeat ${Date.now()}\n\n`);
            } catch {
                clearInterval(heartbeatTimer);
            }
        }, 25 * 1000);

        if (heartbeatTimer.unref) heartbeatTimer.unref();

        req.on("close", () => {
            clearInterval(heartbeatTimer);
            const userSockets = this.clients.get(key);
            if (userSockets) {
                userSockets.delete(res);
                if (userSockets.size === 0) {
                    this.clients.delete(key);
                }
            }
        });
    }

    publishToUser(userId, notificationPayload) {
        if (!userId) return 0;
        const key = String(userId);
        const userSockets = this.clients.get(key);
        if (!userSockets || userSockets.size === 0) return 0;

        let delivered = 0;
        const serialized = JSON.stringify(notificationPayload);

        for (const res of userSockets) {
            try {
                res.write(`event: notification\ndata: ${serialized}\n\n`);
                delivered += 1;
            } catch {
                userSockets.delete(res);
            }
        }

        if (delivered > 0) {
            this.totalEventsPublished += 1;
        }
        return delivered;
    }

    getStats() {
        let totalConnections = 0;
        for (const set of this.clients.values()) {
            totalConnections += set.size;
        }
        return {
            connectedUsers: this.clients.size,
            activeStreamConnections: totalConnections,
            activeConnections: totalConnections,
            totalEventsPublished: this.totalEventsPublished,
            totalPublishedEvents: this.totalEventsPublished
        };
    }
}

export const sseBroker = new SSENotificationBroker();
export default sseBroker;