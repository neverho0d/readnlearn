/**
 * Usage tracking utility for LLM providers
 *
 * Tracks daily usage per provider and persists to IndexedDB
 */

import { UsageStats } from "./types";

interface DailyUsage {
    provider: string;
    date: string; // YYYY-MM-DD
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    requestsCount: number;
    lastUpdated: string;
}

export class UsageTracker {
    private dbName = "readnlearn-usage";
    private dbVersion = 1;
    private storeName = "dailyUsage";

    /**
     * Initialize IndexedDB for usage tracking
     */
    private async initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, {
                        keyPath: ["provider", "date"],
                    });
                    store.createIndex("provider", "provider", { unique: false });
                    store.createIndex("date", "date", { unique: false });
                }
            };
        });
    }

    /**
     * Get today's usage for a provider
     */
    async getTodayUsage(provider: string): Promise<DailyUsage> {
        const db = await this.initDB();
        const today = new Date().toISOString().split("T")[0];

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.get([provider, today]);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    resolve(result);
                } else {
                    // Return empty usage for new day
                    resolve({
                        provider,
                        date: today,
                        inputTokens: 0,
                        outputTokens: 0,
                        costUsd: 0,
                        requestsCount: 0,
                        lastUpdated: new Date().toISOString(),
                    });
                }
            };
        });
    }

    /**
     * Update usage for a provider
     */
    async updateUsage(
        provider: string,
        inputTokens: number,
        outputTokens: number,
        costUsd: number,
    ): Promise<void> {
        const db = await this.initDB();
        const today = new Date().toISOString().split("T")[0];

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);

            // Get current usage
            const getRequest = store.get([provider, today]);
            getRequest.onsuccess = () => {
                const current = getRequest.result || {
                    provider,
                    date: today,
                    inputTokens: 0,
                    outputTokens: 0,
                    costUsd: 0,
                    requestsCount: 0,
                    lastUpdated: new Date().toISOString(),
                };

                // Update usage
                const updated: DailyUsage = {
                    ...current,
                    inputTokens: current.inputTokens + inputTokens,
                    outputTokens: current.outputTokens + outputTokens,
                    costUsd: current.costUsd + costUsd,
                    requestsCount: current.requestsCount + 1,
                    lastUpdated: new Date().toISOString(),
                };

                // Save updated usage with compound key
                const putRequest = store.put(updated, [updated.provider, updated.date]);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Get usage statistics for a provider
     */
    async getUsageStats(provider: string): Promise<UsageStats> {
        const usage = await this.getTodayUsage(provider);

        return {
            provider: usage.provider,
            period: "daily",
            tokensUsed: usage.inputTokens + usage.outputTokens,
            costUsd: usage.costUsd,
            requestsCount: usage.requestsCount,
            lastUpdated: new Date(usage.lastUpdated),
        };
    }

    /**
     * Check if provider is within daily limits
     */
    async isWithinDailyLimit(provider: string, dailyCap: number): Promise<boolean> {
        const usage = await this.getTodayUsage(provider);
        return usage.costUsd < dailyCap;
    }

    /**
     * Get remaining quota for a provider
     */
    async getRemainingQuota(provider: string, dailyCap: number): Promise<number> {
        const usage = await this.getTodayUsage(provider);
        return Math.max(0, dailyCap - usage.costUsd);
    }
}

// Singleton instance
export const usageTracker = new UsageTracker();
