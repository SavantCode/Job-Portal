import crypto from "crypto";

/**
 * ============================================================================
 * READ-THROUGH O(1) LRU CACHE WITH ETAG & AUTOMATIC WRITE INVALIDATION
 * ============================================================================
 */
class ReadThroughLRUCache {
    constructor({ name = "default", maxEntries = 250, defaultTtlMs = 60 * 1000 } = {}) {
        this.name = name;
        this.maxEntries = maxEntries;
        this.defaultTtlMs = defaultTtlMs;
        this.store = new Map();
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            invalidations: 0,
            lastInvalidatedAt: null
        };
    }

    computeETag(payload) {
        try {
            const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
            const hash = crypto.createHash("sha1").update(raw).digest("hex").slice(0, 16);
            return `W/"${hash}"`;
        } catch {
            return `W/"${Date.now().toString(16)}"`;
        }
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            this.metrics.misses += 1;
            return null;
        }

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            this.metrics.misses += 1;
            return null;
        }

        // Refresh LRU order: delete and re-insert to move to Most-Recently-Used tail
        this.store.delete(key);
        this.store.set(key, entry);
        this.metrics.hits += 1;
        return entry;
    }

    set(key, value, ttlMs = this.defaultTtlMs) {
        if (this.store.has(key)) {
            this.store.delete(key);
        } else if (this.store.size >= this.maxEntries) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey !== undefined) {
                this.store.delete(oldestKey);
                this.metrics.evictions += 1;
            }
        }

        const etag = this.computeETag(value);
        const entry = {
            value,
            etag,
            cachedAt: Date.now(),
            expiresAt: Date.now() + ttlMs
        };

        this.store.set(key, entry);
        this.metrics.sets += 1;
        return entry;
    }

    invalidateByPrefix(prefix = "") {
        let removed = 0;
        for (const key of this.store.keys()) {
            if (!prefix || key.startsWith(prefix)) {
                this.store.delete(key);
                removed += 1;
            }
        }
        if (removed > 0) {
            this.metrics.invalidations += removed;
            this.metrics.lastInvalidatedAt = new Date().toISOString();
        }
        return removed;
    }

    clear() {
        const count = this.store.size;
        this.store.clear();
        this.metrics.invalidations += count;
        this.metrics.lastInvalidatedAt = new Date().toISOString();
        return count;
    }

    getStats() {
        const totalLookups = this.metrics.hits + this.metrics.misses;
        const hitRatioPercent =
            totalLookups > 0 ? Number(((this.metrics.hits / totalLookups) * 100).toFixed(1)) : 0;

        return {
            cacheName: this.name,
            activeKeys: this.store.size,
            maxEntries: this.maxEntries,
            defaultTtlSeconds: Math.round(this.defaultTtlMs / 1000),
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            hitRatioPercent,
            hitRatePercent: hitRatioPercent,
            sets: this.metrics.sets,
            evictions: this.metrics.evictions,
            invalidations: this.metrics.invalidations,
            lastInvalidatedAt: this.metrics.lastInvalidatedAt,
            sampleKeys: Array.from(this.store.keys()).slice(0, 10)
        };
    }
}

export const jobCache = new ReadThroughLRUCache({
    name: "JobPortal_ReadThrough_LRU",
    maxEntries: 250,
    defaultTtlMs: 60 * 1000
});

export default jobCache;