/**
 * UsageTracker
 *
 * Tracks character usage for translation providers with monthly limits.
 * Handles DeepL (billed_characters) and Google (character counting) differently.
 */

export interface UsageStats {
    provider: string;
    month: string; // YYYY-MM format
    charactersUsed: number;
    limit: number;
    percentage: number;
    remaining: number;
}

export interface UsageLimit {
    provider: string;
    limit: number; // characters per month
}

export class UsageTracker {
    private static instance: UsageTracker;
    private usageData: Map<string, UsageStats> = new Map();
    private readonly limits: Map<string, number> = new Map();
    private readonly STORAGE_KEY = "translation_usage";

    constructor() {
        this.initializeLimits();
        this.loadUsageData();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): UsageTracker {
        if (!UsageTracker.instance) {
            UsageTracker.instance = new UsageTracker();
        }
        return UsageTracker.instance;
    }

    /**
     * Initialize provider limits
     */
    private initializeLimits(): void {
        this.limits.set("deepl", 500000); // 500k characters/month
        this.limits.set("google", 500000); // 500k characters/month
    }

    /**
     * Get current month string (YYYY-MM format)
     */
    private getCurrentMonth(): string {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    /**
     * Load usage data from localStorage
     */
    private loadUsageData(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.usageData = new Map(Object.entries(data));

                // Check if we need to reset for new month
                this.checkMonthlyReset();
            }
        } catch (error) {
            console.error("Failed to load usage data:", error);
            this.usageData = new Map();
        }
    }

    /**
     * Save usage data to localStorage
     */
    private saveUsageData(): void {
        try {
            const data = Object.fromEntries(this.usageData);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save usage data:", error);
        }
    }

    /**
     * Check if usage data needs to be reset for new month
     */
    private checkMonthlyReset(): void {
        const currentMonth = this.getCurrentMonth();

        for (const [provider, stats] of this.usageData) {
            if (stats.month !== currentMonth) {
                // Reset usage for new month
                this.usageData.set(provider, {
                    provider,
                    month: currentMonth,
                    charactersUsed: 0,
                    limit: this.limits.get(provider) || 500000,
                    percentage: 0,
                    remaining: this.limits.get(provider) || 500000,
                });
            }
        }

        this.saveUsageData();
    }

    /**
     * Track character usage for a provider
     */
    async trackUsage(provider: string, characters: number): Promise<void> {
        const currentMonth = this.getCurrentMonth();
        const limit = this.limits.get(provider) || 500000;

        let stats = this.usageData.get(provider);

        if (!stats || stats.month !== currentMonth) {
            // Initialize or reset for new month
            stats = {
                provider,
                month: currentMonth,
                charactersUsed: 0,
                limit,
                percentage: 0,
                remaining: limit,
            };
        }

        // Update usage
        stats.charactersUsed += characters;
        stats.percentage = (stats.charactersUsed / stats.limit) * 100;
        stats.remaining = Math.max(0, stats.limit - stats.charactersUsed);

        this.usageData.set(provider, stats);
        this.saveUsageData();

        console.log(`📊 Usage tracked for ${provider}:`, {
            characters: characters,
            total: stats.charactersUsed,
            limit: stats.limit,
            percentage: stats.percentage.toFixed(1) + "%",
            remaining: stats.remaining,
        });
    }

    /**
     * Get usage statistics for a provider
     */
    async getUsageStats(provider: string): Promise<UsageStats> {
        const currentMonth = this.getCurrentMonth();
        const limit = this.limits.get(provider) || 500000;

        let stats = this.usageData.get(provider);

        if (!stats || stats.month !== currentMonth) {
            // Return default stats for new month
            stats = {
                provider,
                month: currentMonth,
                charactersUsed: 0,
                limit,
                percentage: 0,
                remaining: limit,
            };
        }

        return stats;
    }

    /**
     * Get usage statistics for all providers
     */
    async getAllUsageStats(): Promise<Map<string, UsageStats>> {
        const allStats = new Map<string, UsageStats>();

        for (const provider of this.limits.keys()) {
            const stats = await this.getUsageStats(provider);
            allStats.set(provider, stats);
        }

        return allStats;
    }

    /**
     * Check if a provider has reached its usage limit
     */
    async isLimitReached(provider: string): Promise<boolean> {
        const stats = await this.getUsageStats(provider);
        return stats.charactersUsed >= stats.limit;
    }

    /**
     * Check if a provider is approaching its limit (90%+)
     */
    async isLimitApproaching(provider: string): Promise<boolean> {
        const stats = await this.getUsageStats(provider);
        return stats.percentage >= 90;
    }

    /**
     * Get available providers (not at limit)
     */
    async getAvailableProviders(): Promise<string[]> {
        const available: string[] = [];

        for (const provider of this.limits.keys()) {
            if (!(await this.isLimitReached(provider))) {
                available.push(provider);
            }
        }

        return available;
    }

    /**
     * Reset usage for a specific provider or all providers
     */
    async resetUsage(provider?: string): Promise<void> {
        if (provider) {
            this.usageData.delete(provider);
        } else {
            this.usageData.clear();
        }

        this.saveUsageData();
        console.log(`🔄 Usage reset for ${provider || "all providers"}`);
    }

    /**
     * Count characters in text (for Google usage tracking)
     */
    countCharacters(text: string): number {
        // Count Unicode code points as per Google's billing rules
        return Array.from(text).length;
    }

    /**
     * Get usage summary for display
     */
    async getUsageSummary(): Promise<{
        deepl: UsageStats;
        google: UsageStats;
        hasAvailableProviders: boolean;
    }> {
        const deepl = await this.getUsageStats("deepl");
        const google = await this.getUsageStats("google");
        const available = await this.getAvailableProviders();

        return {
            deepl,
            google,
            hasAvailableProviders: available.length > 0,
        };
    }
}
