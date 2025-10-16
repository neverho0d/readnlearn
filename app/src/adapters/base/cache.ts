/**
 * Caching layer for provider responses
 *
 * Implements a unified caching strategy for all provider adapters using IndexedDB
 * with TTL support and automatic cleanup of expired entries.
 */

import { CacheEntry, createCacheKey } from "./types";

export interface CacheOptions {
    ttl: number; // Time to live in milliseconds
    maxSize: number; // Maximum number of entries
    cleanupInterval: number; // Cleanup interval in milliseconds
}

export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 1000,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
};

export class ProviderCache {
    private db: IDBDatabase | null = null;
    private options: CacheOptions;
    private cleanupTimer: number | null = null;

    constructor(options: Partial<CacheOptions> = {}) {
        this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
    }

    /**
     * Initialize the cache database
     */
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("readnlearn-provider-cache", 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.startCleanupTimer();
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains("cache")) {
                    const store = db.createObjectStore("cache", { keyPath: "key" });
                    store.createIndex("expiresAt", "expiresAt");
                    store.createIndex("provider", "provider");
                }
            };
        });
    }

    /**
     * Get a cached response
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(["cache"], "readonly");
            const store = transaction.objectStore("cache");
            const request = store.get(key);

            request.onsuccess = () => {
                const entry = request.result;
                if (!entry) {
                    resolve(null);
                    return;
                }

                // Check if expired
                if (new Date() > new Date(entry.expiresAt)) {
                    this.delete(key);
                    resolve(null);
                    return;
                }

                resolve(entry.data);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Set a cached response
     */
    async set<T>(key: string, data: T, provider: string, method: string): Promise<void> {
        if (!this.db) {
            await this.init();
        }

        const entry: CacheEntry<T> = {
            data,
            expiresAt: new Date(Date.now() + this.options.ttl),
            provider,
            method,
            hash: key,
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(["cache"], "readwrite");
            const store = transaction.objectStore("cache");
            const request = store.put({ key, ...entry });

            request.onsuccess = () => {
                this.enforceMaxSize();
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a cached entry
     */
    async delete(key: string): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(["cache"], "readwrite");
            const store = transaction.objectStore("cache");
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all cached entries
     */
    async clear(): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(["cache"], "readwrite");
            const store = transaction.objectStore("cache");
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear entries for a specific provider
     */
    async clearProvider(provider: string): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(["cache"], "readwrite");
            const store = transaction.objectStore("cache");
            const index = store.index("provider");
            const request = index.openCursor(IDBKeyRange.only(provider));

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{ totalEntries: number; expiredEntries: number; sizeBytes: number }> {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(["cache"], "readonly");
            const store = transaction.objectStore("cache");
            const request = store.count();

            request.onsuccess = () => {
                const totalEntries = request.result;

                // Count expired entries
                const index = store.index("expiresAt");
                const expiredRequest = index.count(IDBKeyRange.upperBound(new Date()));

                expiredRequest.onsuccess = () => {
                    resolve({
                        totalEntries,
                        expiredEntries: expiredRequest.result,
                        sizeBytes: 0, // Would need to estimate based on entry size
                    });
                };

                expiredRequest.onerror = () => reject(expiredRequest.error);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clean up expired entries
     */
    private async cleanup(): Promise<void> {
        if (!this.db) return;

        const transaction = this.db.transaction(["cache"], "readwrite");
        const store = transaction.objectStore("cache");
        const index = store.index("expiresAt");
        const now = new Date();
        const request = index.openCursor(IDBKeyRange.upperBound(now));

        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Enforce maximum cache size
     */
    private async enforceMaxSize(): Promise<void> {
        if (!this.db) return;

        const transaction = this.db.transaction(["cache"], "readonly");
        const store = transaction.objectStore("cache");
        const request = store.count();

        request.onsuccess = () => {
            const count = request.result;
            if (count > this.options.maxSize) {
                // Delete oldest entries
                const deleteCount = count - this.options.maxSize;
                this.deleteOldestEntries(deleteCount);
            }
        };
    }

    /**
     * Delete oldest entries
     */
    private async deleteOldestEntries(count: number): Promise<void> {
        if (!this.db || count <= 0) return;

        const transaction = this.db.transaction(["cache"], "readwrite");
        const store = transaction.objectStore("cache");
        const index = store.index("expiresAt");
        const request = index.openCursor();

        let deleted = 0;
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor && deleted < count) {
                cursor.delete();
                deleted++;
                cursor.continue();
            }
        };
    }

    /**
     * Start the cleanup timer
     */
    private startCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = window.setInterval(() => {
            this.cleanup().catch(console.error);
        }, this.options.cleanupInterval);
    }

    /**
     * Stop the cleanup timer
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
}

// Global cache instance
export const providerCache = new ProviderCache();
