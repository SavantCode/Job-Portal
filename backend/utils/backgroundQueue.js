import { logAuditEvent } from "../models/auditLog.model.js";

/**
 * ============================================================================
 * ASYNCHRONOUS BACKGROUND TASK QUEUE WITH EXPONENTIAL BACKOFF & DEAD-LETTER QUEUE
 * ============================================================================
 * PROBLEM SOLVED:
 * - Sending SMTP emails (Offer letters, interview invites) directly inside the
 *   HTTP request cycle blocks the response for 1-3 seconds and fails permanently
 *   if the SMTP server has a momentary hiccup.
 * - This producer-consumer background worker processes tasks asynchronously with
 *   up to 3 exponential-backoff + jitter retries and moves exhausted tasks to an
 *   inspectable Dead-Letter Queue (DLQ) that admins can replay in 1 click.
 * ============================================================================
 */
class BackgroundTaskQueue {
    constructor({ concurrency = 2, baseDelayMs = 1500, maxDlqSize = 100 } = {}) {
        this.concurrency = concurrency;
        this.baseDelayMs = baseDelayMs;
        this.maxDlqSize = maxDlqSize;

        this.queue = [];
        this.deadLetterQueue = [];
        this.activeWorkers = 0;

        this.stats = {
            enqueued: 0,
            completed: 0,
            retried: 0,
            failedToDlq: 0,
            replayedFromDlq: 0
        };

        // Periodic tick to wake up delayed retry tasks
        this.timer = setInterval(() => this._processNext(), 500);
        if (this.timer.unref) this.timer.unref();
    }

    /**
     * Enqueues an async task function `handler(payload)`
     */
    enqueue({ type = "GENERIC_TASK", meta = {}, handler }) {
        const task = {
            id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type,
            meta,
            handler,
            attempts: 0,
            maxAttempts: 3,
            status: "QUEUED",
            createdAt: new Date().toISOString(),
            nextRunAt: Date.now(),
            lastError: null
        };

        this.queue.push(task);
        this.stats.enqueued += 1;
        setImmediate(() => this._processNext());
        return task.id;
    }

    async _processNext() {
        if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
            return;
        }

        const now = Date.now();
        const readyIndex = this.queue.findIndex((t) => t.nextRunAt <= now);
        if (readyIndex === -1) return;

        const [task] = this.queue.splice(readyIndex, 1);
        this.activeWorkers += 1;
        task.status = "RUNNING";
        task.attempts += 1;

        try {
            await task.handler();
            task.status = "COMPLETED";
            task.completedAt = new Date().toISOString();
            this.stats.completed += 1;
        } catch (error) {
            task.lastError = error?.message || String(error);

            if (task.attempts < task.maxAttempts) {
                // Exponential Backoff + Jitter
                const jitter = Math.floor(Math.random() * 400);
                const backoffDelay = this.baseDelayMs * Math.pow(2, task.attempts - 1) + jitter;
                task.status = "RETRY_SCHEDULED";
                task.nextRunAt = Date.now() + backoffDelay;
                this.stats.retried += 1;
                this.queue.push(task);
            } else {
                // Exhausted retries -> Move to Dead-Letter Queue (DLQ)
                task.status = "DEAD_LETTER";
                task.failedAt = new Date().toISOString();
                this.stats.failedToDlq += 1;

                this.deadLetterQueue.unshift({
                    id: task.id,
                    type: task.type,
                    meta: task.meta,
                    attempts: task.attempts,
                    lastError: task.lastError,
                    createdAt: task.createdAt,
                    failedAt: task.failedAt,
                    handler: task.handler
                });

                if (this.deadLetterQueue.length > this.maxDlqSize) {
                    this.deadLetterQueue.pop();
                }

                logAuditEvent({
                    actorRole: "system",
                    action: "TASK_MOVED_TO_DLQ",
                    entityType: "System",
                    entityId: task.id,
                    status: "FAILURE",
                    metadata: {
                        type: task.type,
                        attempts: task.attempts,
                        error: task.lastError,
                        meta: task.meta
                    }
                });
            }
        } finally {
            this.activeWorkers -= 1;
            if (this.queue.length > 0) {
                setImmediate(() => this._processNext());
            }
        }
    }

    /**
     * Returns serialized Dead-Letter Queue items (stripping internal function closures)
     */
    getDeadLetterItems() {
        return this.deadLetterQueue.map(({ handler, ...rest }) => rest);
    }

    /**
     * Replays a Dead-Letter Queue item by ID
     */
    replayDeadLetter(taskId) {
        const idx = this.deadLetterQueue.findIndex((item) => item.id === taskId);
        if (idx === -1) return null;

        const [dlqItem] = this.deadLetterQueue.splice(idx, 1);
        this.stats.replayedFromDlq += 1;

        if (typeof dlqItem.handler === "function") {
            return this.enqueue({
                type: dlqItem.type,
                meta: { ...dlqItem.meta, replayedFromDlq: true },
                handler: dlqItem.handler
            });
        }
        return dlqItem.id;
    }

    getStats() {
        return {
            pendingInQueue: this.queue.length,
            activeWorkers: this.activeWorkers,
            concurrency: this.concurrency,
            enqueued: this.stats.enqueued,
            totalEnqueued: this.stats.enqueued,
            completed: this.stats.completed,
            totalProcessed: this.stats.completed,
            retried: this.stats.retried,
            totalRetried: this.stats.retried,
            failedToDlq: this.stats.failedToDlq,
            replayedFromDlq: this.stats.replayedFromDlq,
            deadLetterCount: this.deadLetterQueue.length,
            deadLetterItems: this.getDeadLetterItems()
        };
    }
}

export const backgroundQueue = new BackgroundTaskQueue();
export default backgroundQueue;