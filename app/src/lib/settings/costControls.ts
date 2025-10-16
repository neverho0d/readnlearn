/**
 * Cost Controls and Usage Tracking
 *
 * Manages API usage limits, spending caps, and cost tracking
 * to prevent overspending on cloud providers.
 */

import { supabase } from "../supabase/client";

// If the Supabase table is not present, we disable tracking to avoid noisy 404s
let usageTrackingAvailable = true;
let notedMissingTable = false;
// We re-check availability only when performing a usage operation (before/after provider calls)

export interface UsageLimit {
    provider: string;
    dailyLimit: number; // in USD
    monthlyLimit: number; // in USD
    requestLimit: number; // max requests per day
    tokenLimit: number; // max tokens per day
}

export interface UsageStats {
    provider: string;
    period: "daily" | "monthly";
    costUsd: number;
    tokensUsed: number;
    requestCount: number;
    lastUpdated: Date;
    limitExceeded: boolean;
    remainingBudget: number;
}

export interface CostAlert {
    id: string;
    type: "warning" | "error" | "info";
    message: string;
    provider: string;
    cost: number;
    limit: number;
    timestamp: Date;
}

export const DEFAULT_USAGE_LIMITS: UsageLimit[] = [
    {
        provider: "openai",
        dailyLimit: 5.0,
        monthlyLimit: 50.0,
        requestLimit: 200,
        tokenLimit: 200000, // tokens per day (prompt + completion)
    },
    {
        provider: "deepl",
        dailyLimit: 2.0,
        monthlyLimit: 20.0,
        requestLimit: 500,
        tokenLimit: 0, // not applicable; uses per-character billing
    },
    {
        provider: "google",
        dailyLimit: 2.0,
        monthlyLimit: 20.0,
        requestLimit: 500,
        tokenLimit: 0,
    },
    {
        provider: "polly",
        dailyLimit: 1.0,
        monthlyLimit: 10.0,
        requestLimit: 50,
        tokenLimit: 10000,
    },
];

// Pricing maps (USD). If provider updates prices, you can override via localStorage key "pricing_overrides".
// OpenAI defaults (approx). gpt-5-nano is assumed ~3x cheaper than gpt-4o-mini for detection use.
const OPENAI_MODEL_RATES: Record<string, { inputPer1K: number; outputPer1K: number }> = {
    "gpt-5-nano": { inputPer1K: 0.00005, outputPer1K: 0.0002 },
    "gpt-4o-mini": { inputPer1K: 0.00015, outputPer1K: 0.0006 },
};

// Google Cloud Translation: ~$20 / 1M characters => $0.02 / 1K chars
const GOOGLE_PER_1K_CHARS = 0.02;
// DeepL API Pro: ~$20 / 1M characters (subscription excluded) => $0.02 / 1K chars
const DEEPL_PER_1K_CHARS = 0.02;

function loadPricingOverrides(): Partial<{
    openai: Record<string, { inputPer1K: number; outputPer1K: number }>;
    googlePer1KChars: number;
    deeplPer1KChars: number;
}> {
    try {
        const raw = localStorage.getItem("pricing_overrides");
        if (!raw) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

const PRICING_OVERRIDES = loadPricingOverrides();

export class CostController {
    private limits: Map<string, UsageLimit> = new Map();
    private alerts: CostAlert[] = [];

    constructor(limits: UsageLimit[] = DEFAULT_USAGE_LIMITS) {
        limits.forEach((limit) => {
            this.limits.set(limit.provider, limit);
        });
    }

    // Helper to mark table missing once
    private static noteTableMissingOnce(): void {
        if (!notedMissingTable) {
            console.warn(
                "Supabase usage_tracking table not found. Usage stats will be disabled. Run scripts/setup-usage-tracking.sql to enable.",
            );
            notedMissingTable = true;
        }
        usageTrackingAvailable = false;
    }

    private static async ensureTrackingAvailable(): Promise<boolean> {
        if (usageTrackingAvailable) return true;
        try {
            const { error } = await supabase.from("usage_tracking").select("id").limit(1);
            if (error && ((error as any).status === 404 || (error as any).code === "PGRST116")) {
                return false;
            }
            // If no error, table exists now
            usageTrackingAvailable = true;
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Model-aware OpenAI rate lookup
     */
    getOpenAIModelRates(model: string): { inputPer1K: number; outputPer1K: number } {
        const overrides = PRICING_OVERRIDES.openai?.[model];
        if (overrides) return overrides;
        return OPENAI_MODEL_RATES[model] || OPENAI_MODEL_RATES["gpt-4o-mini"];
    }

    /**
     * Check if usage is within limits
     */
    async checkUsage(
        provider: string,
        estimatedCost: number,
        tokens: number,
    ): Promise<{
        allowed: boolean;
        reason?: string;
        remainingBudget: number;
    }> {
        try {
            const limit = this.limits.get(provider);
            if (!limit) {
                return { allowed: true, remainingBudget: Infinity };
            }

            const stats = await this.getUsageStats(provider);

            if (stats.costUsd + estimatedCost > limit.dailyLimit) {
                return {
                    allowed: false,
                    reason: `Daily cost limit exceeded. Limit: $${limit.dailyLimit}, Used: $${stats.costUsd.toFixed(2)}`,
                    remainingBudget: Math.max(0, limit.dailyLimit - stats.costUsd),
                };
            }

            if (stats.period === "monthly" && stats.costUsd + estimatedCost > limit.monthlyLimit) {
                return {
                    allowed: false,
                    reason: `Monthly cost limit exceeded. Limit: $${limit.monthlyLimit}, Used: $${stats.costUsd.toFixed(2)}`,
                    remainingBudget: Math.max(0, limit.monthlyLimit - stats.costUsd),
                };
            }

            if (stats.requestCount >= limit.requestLimit) {
                return {
                    allowed: false,
                    reason: `Daily request limit exceeded. Limit: ${limit.requestLimit}, Used: ${stats.requestCount}`,
                    remainingBudget: 0,
                };
            }

            if (limit.tokenLimit > 0 && stats.tokensUsed + tokens > limit.tokenLimit) {
                return {
                    allowed: false,
                    reason: `Daily token limit exceeded. Limit: ${limit.tokenLimit}, Used: ${stats.tokensUsed}`,
                    remainingBudget: 0,
                };
            }

            return {
                allowed: true,
                remainingBudget: Math.max(0, limit.dailyLimit - stats.costUsd - estimatedCost),
            };
        } catch (error) {
            console.error("Failed to check usage:", error);
            return { allowed: true, remainingBudget: Infinity };
        }
    }

    /**
     * Record usage
     */
    async recordUsage(
        provider: string,
        method: string,
        tokens: number,
        cost: number,
    ): Promise<void> {
        if (!usageTrackingAvailable) {
            await CostController.ensureTrackingAvailable();
            if (!usageTrackingAvailable) return;
        }
        try {
            const { error } = await supabase.from("usage_tracking").insert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                provider,
                method,
                tokens_used: tokens,
                cost_usd: cost,
                request_count: 1,
                tracked_at: new Date().toISOString().split("T")[0],
            });

            if (error) {
                // PostgREST 404 indicates table not present in this project
                if (
                    (error as unknown as { code?: string; status?: number }).code === "PGRST116" ||
                    (error as unknown as { status?: number }).status === 404
                ) {
                    CostController.noteTableMissingOnce();
                    return;
                }
                console.error("Failed to record usage:", error);
            }

            await this.checkAlerts(provider, cost);
        } catch (error: any) {
            if (error?.status === 404) {
                CostController.noteTableMissingOnce();
                return;
            }
            console.error("Failed to record usage:", error);
        }
    }

    /**
     * Calculate estimated cost (legacy tokens-only API)
     */
    calculateEstimatedCost(provider: string, tokens: number, model?: string): number {
        if (provider === "openai") {
            const rates = this.getOpenAIModelRates(model || "gpt-4o-mini");
            const input = tokens * 0.75;
            const output = tokens * 0.25;
            return (input / 1000) * rates.inputPer1K + (output / 1000) * rates.outputPer1K;
        }
        if (provider === "google") {
            const chars = Math.round(tokens * 4);
            const per1K = PRICING_OVERRIDES.googlePer1KChars ?? GOOGLE_PER_1K_CHARS;
            return (chars / 1000) * per1K;
        }
        if (provider === "deepl") {
            const chars = Math.round(tokens * 4);
            const per1K = PRICING_OVERRIDES.deeplPer1KChars ?? DEEPL_PER_1K_CHARS;
            return (chars / 1000) * per1K;
        }
        return (tokens / 1000) * 0.01;
    }

    /**
     * Detailed cost calculator supporting token-in/out and character-based pricing
     */
    calculateCostDetailed(params: {
        provider: "openai" | "google" | "deepl" | string;
        model?: string;
        tokensIn?: number;
        tokensOut?: number;
        characters?: number;
    }): number {
        const { provider, model, tokensIn = 0, tokensOut = 0, characters = 0 } = params;
        if (provider === "openai") {
            const rates = this.getOpenAIModelRates(model || "gpt-4o-mini");
            return (tokensIn / 1000) * rates.inputPer1K + (tokensOut / 1000) * rates.outputPer1K;
        }
        if (provider === "google") {
            const per1K = PRICING_OVERRIDES.googlePer1KChars ?? GOOGLE_PER_1K_CHARS;
            return (characters / 1000) * per1K;
        }
        if (provider === "deepl") {
            const per1K = PRICING_OVERRIDES.deeplPer1KChars ?? DEEPL_PER_1K_CHARS;
            return (characters / 1000) * per1K;
        }
        return 0;
    }

    /**
     * Get usage statistics
     */
    async getUsageStats(
        provider: string,
        period: "daily" | "monthly" = "daily",
    ): Promise<UsageStats> {
        if (!usageTrackingAvailable) {
            await CostController.ensureTrackingAvailable();
            if (!usageTrackingAvailable) return this.getEmptyStats(provider, period);
        }
        try {
            const { data, error } = await supabase
                .from("usage_tracking")
                .select("*")
                .eq("provider", provider)
                .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

            if (error) {
                if (
                    (error as unknown as { code?: string; status?: number }).code === "PGRST116" ||
                    (error as unknown as { status?: number }).status === 404
                ) {
                    CostController.noteTableMissingOnce();
                    return this.getEmptyStats(provider, period);
                }
                console.error("Failed to get usage stats:", error);
                return this.getEmptyStats(provider, period);
            }

            const today = new Date().toISOString().split("T")[0];
            const filteredData =
                period === "daily" ? data.filter((record) => record.tracked_at === today) : data;

            const costUsd = filteredData.reduce((sum, record) => sum + (record.cost_usd || 0), 0);
            const tokensUsed = filteredData.reduce(
                (sum, record) => sum + (record.tokens_used || 0),
                0,
            );
            const requestCount = filteredData.reduce(
                (sum, record) => sum + (record.request_count || 0),
                0,
            );

            const limit = this.limits.get(provider);
            const limitExceeded = limit ? costUsd > limit.dailyLimit : false;
            const remainingBudget = limit ? Math.max(0, limit.dailyLimit - costUsd) : 0;

            return {
                provider,
                period,
                costUsd,
                tokensUsed,
                requestCount,
                lastUpdated: new Date(),
                limitExceeded,
                remainingBudget,
            };
        } catch (error: any) {
            if (error?.status === 404) {
                CostController.noteTableMissingOnce();
                return this.getEmptyStats(provider, period);
            }
            console.error("Failed to get usage stats:", error);
            return this.getEmptyStats(provider, period);
        }
    }

    /**
     * Get all usage statistics
     */
    async getAllUsageStats(): Promise<UsageStats[]> {
        const providers = Array.from(this.limits.keys());
        const stats = await Promise.all(providers.map((provider) => this.getUsageStats(provider)));
        return stats;
    }

    /**
     * Check for cost alerts
     */
    private async checkAlerts(provider: string, cost: number): Promise<void> {
        const limit = this.limits.get(provider);
        if (!limit) return;

        const stats = await this.getUsageStats(provider);
        const usagePercentage = limit.dailyLimit > 0 ? (stats.costUsd / limit.dailyLimit) * 100 : 0;

        // 80% warning
        if (usagePercentage >= 80 && usagePercentage < 100) {
            this.addAlert({
                type: "warning",
                message: `You've used ${usagePercentage.toFixed(1)}% of your daily ${provider} budget`,
                provider,
                cost: stats.costUsd,
                limit: limit.dailyLimit,
            });
        }

        // 100% limit reached
        if (usagePercentage >= 100) {
            this.addAlert({
                type: "error",
                message: `Daily ${provider} budget exceeded! Further requests will be blocked.`,
                provider,
                cost: stats.costUsd,
                limit: limit.dailyLimit,
            });
        }
    }

    /**
     * Add cost alert
     */
    private addAlert(alert: Omit<CostAlert, "id" | "timestamp">): void {
        const newAlert: CostAlert = {
            ...alert,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
        };

        this.alerts.push(newAlert);

        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(-50);
        }
    }

    /**
     * Get cost alerts
     */
    getAlerts(): CostAlert[] {
        return [...this.alerts];
    }

    /**
     * Clear alerts
     */
    clearAlerts(): void {
        this.alerts = [];
    }

    /**
     * Update usage limits
     */
    updateLimits(limits: UsageLimit[]): void {
        limits.forEach((limit) => {
            this.limits.set(limit.provider, limit);
        });
    }

    /**
     * Get usage limits
     */
    getLimits(): UsageLimit[] {
        return Array.from(this.limits.values());
    }

    /**
     * Get empty stats
     */
    private getEmptyStats(provider: string, period: "daily" | "monthly"): UsageStats {
        return {
            provider,
            period,
            costUsd: 0,
            tokensUsed: 0,
            requestCount: 0,
            lastUpdated: new Date(),
            limitExceeded: false,
            remainingBudget: this.limits.get(provider)?.dailyLimit || 0,
        };
    }

    /**
     * Get cost breakdown
     */
    async getCostBreakdown(): Promise<{
        totalCost: number;
        byProvider: Record<string, number>;
        byMethod: Record<string, number>;
        dailyTrend: Array<{ date: string; cost: number }>;
    }> {
        try {
            const { data, error } = await supabase
                .from("usage_tracking")
                .select("*")
                .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
                .gte(
                    "tracked_at",
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                );

            if (error) {
                console.error("Failed to get cost breakdown:", error);
                return { totalCost: 0, byProvider: {}, byMethod: {}, dailyTrend: [] };
            }

            const totalCost = data.reduce((sum, record) => sum + (record.cost_usd || 0), 0);

            const byProvider: Record<string, number> = {};
            const byMethod: Record<string, number> = {};
            const dailyCosts: Record<string, number> = {};

            data.forEach((record) => {
                // By provider
                byProvider[record.provider] =
                    (byProvider[record.provider] || 0) + (record.cost_usd || 0);

                // By method
                byMethod[record.method] = (byMethod[record.method] || 0) + (record.cost_usd || 0);

                // Daily trend
                dailyCosts[record.tracked_at] =
                    (dailyCosts[record.tracked_at] || 0) + (record.cost_usd || 0);
            });

            const dailyTrend = Object.entries(dailyCosts)
                .map(([date, cost]) => ({ date, cost }))
                .sort((a, b) => a.date.localeCompare(b.date));

            return { totalCost, byProvider, byMethod, dailyTrend };
        } catch (error) {
            console.error("Failed to get cost breakdown:", error);
            return { totalCost: 0, byProvider: {}, byMethod: {}, dailyTrend: [] };
        }
    }
}

// Global cost controller instance
export const costController = new CostController();
