/**
 * QuickTranslationService
 *
 * Provides fast, direct translations without context for immediate user feedback.
 * Uses random provider selection between DeepL and Google, with fallback support.
 */

import { DeepLDriver } from "../mt/DeepLDriver";
import { GoogleDriver } from "../mt/GoogleDriver";
import { ProviderCache } from "../base/cache";
import { createCacheKey } from "../base/types";
import { UsageTracker, UsageStats } from "../../lib/usage/UsageTracker";

export interface QuickTranslationResult {
    translation: string;
    provider: string;
    responseTime: number;
    cached: boolean;
}

export interface QuickTranslationRequest {
    text: string;
    from: string;
    to: string;
}

export interface ProviderStats {
    provider: string;
    responseTimes: number[];
    successCount: number;
    failureCount: number;
    emaResponseTime: number; // Exponential Moving Average
    successRate: number;
    combinedScore: number; // (successRate * 0.6) + (speedScore * 0.4)
    weight: number; // 0.0 to 1.0
}

export class QuickTranslationService {
    private deeplDriver: DeepLDriver;
    private googleDriver: GoogleDriver;
    private cache: Map<string, QuickTranslationResult> = new Map();

    // Static cache shared across all instances
    private static globalCache: Map<string, QuickTranslationResult> = new Map();

    // Long-term persistent cache for quick translations (30 days TTL)
    private static longTermCache: ProviderCache = new ProviderCache({
        ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxSize: 5000, // Allow more entries for translations
        cleanupInterval: 7 * 24 * 60 * 60 * 1000, // Cleanup weekly
    });

    // Provider performance tracking
    private providerStats: Map<string, ProviderStats> = new Map();
    private readonly MIN_SAMPLES_FOR_WEIGHTING = 15;
    private readonly EMA_ALPHA = 0.3; // Weight for new measurements
    private readonly SUCCESS_RATE_WEIGHT = 0.6;
    private readonly SPEED_WEIGHT = 0.4;

    // Usage tracking
    private usageTracker!: UsageTracker;

    constructor(deeplDriver: DeepLDriver, googleDriver: GoogleDriver) {
        this.deeplDriver = deeplDriver;
        this.googleDriver = googleDriver;

        console.log("🔧 Initializing QuickTranslationService...");
        try {
            this.usageTracker = UsageTracker.getInstance();
            console.log("✅ UsageTracker initialized");
        } catch (error) {
            console.error("❌ Failed to initialize UsageTracker:", error);
            // Continue without usage tracking
        }

        // Initialize provider stats
        this.initializeProviderStats();
    }

    /**
     * Get quick translation with random provider selection and fallback
     */
    async translate(request: QuickTranslationRequest): Promise<QuickTranslationResult> {
        const { text, from, to } = request;

        // Check if L1 == L2 (explanation mode) - disable service
        if (from === to) {
            throw new Error("Quick translation is disabled for explanation mode (L1 == L2)");
        }

        // Check cache first (use static cache)
        const cacheKey = this.createCacheKey(text, from, to);
        console.log("🔍 Checking cache for key:", cacheKey);
        console.log("🔍 Global cache size:", QuickTranslationService.globalCache.size);
        console.log(
            "🔍 Global cache keys:",
            Array.from(QuickTranslationService.globalCache.keys()),
        );

        // Check in-memory cache first
        let cached = QuickTranslationService.globalCache.get(cacheKey);
        if (cached) {
            console.log("🚀 Quick translation cache hit (in-memory):", cacheKey);
            return { ...cached, cached: true };
        }

        // Check persistent cache
        console.log("🔍 Checking persistent cache...");
        const providerCacheKey = createCacheKey("quick-translation", "translate", {
            text,
            from,
            to,
        });

        try {
            const persistentCached = (await QuickTranslationService.longTermCache.get(
                providerCacheKey,
            )) as QuickTranslationResult;
            if (persistentCached) {
                console.log("🚀 Quick translation cache hit (persistent):", cacheKey);
                // Store in in-memory cache for faster access
                QuickTranslationService.globalCache.set(cacheKey, persistentCached);
                return { ...persistentCached, cached: true };
            }
        } catch (error) {
            console.log("🔍 Persistent cache check failed:", error);
        }

        console.log("❌ Cache miss, proceeding with translation");

        // Temporarily disable usage tracking to test
        console.log("🔍 Skipping usage limit checks for debugging...");
        const availableProviders = [this.deeplDriver, this.googleDriver];
        console.log(
            "🔍 Available providers:",
            availableProviders.map((p) => p.provider),
        );

        // Weighted provider selection from available providers
        const { primaryProvider, fallbackProvider } = this.selectProviders(availableProviders);

        console.log(`🎯 Selected primary provider: ${primaryProvider.provider}`);
        console.log(`🔄 Fallback provider: ${fallbackProvider.provider}`);

        const startTime = performance.now();
        let result: QuickTranslationResult;

        try {
            // Try primary provider
            console.log(`🚀 Attempting primary provider: ${primaryProvider.provider}`);
            result = await this.tryProvider(primaryProvider, text, from, to, startTime);
            console.log(`✅ Primary provider ${primaryProvider.provider} succeeded`);
        } catch (error) {
            console.warn(
                `⚠️ Primary provider ${primaryProvider.provider} failed, trying fallback:`,
                error,
            );

            // Track primary provider failure
            this.updateProviderStats(primaryProvider.provider, 0, false);

            try {
                // Try fallback provider
                console.log(`🔄 Attempting fallback provider: ${fallbackProvider.provider}`);
                result = await this.tryProvider(fallbackProvider, text, from, to, startTime);
                console.log(`✅ Fallback provider ${fallbackProvider.provider} succeeded`);
            } catch (fallbackError) {
                console.error("❌ Both providers failed:", {
                    primary: error,
                    fallback: fallbackError,
                });

                // Track fallback provider failure
                this.updateProviderStats(fallbackProvider.provider, 0, false);

                // Create a more user-friendly error message
                const errorMessage = error instanceof Error ? error.message : String(error);
                const fallbackErrorMessage =
                    fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

                throw new Error(
                    `Translation failed: ${errorMessage}. Fallback also failed: ${fallbackErrorMessage}. Please check your API keys and internet connection.`,
                );
            }
        }

        // Cache the result (longer TTL for simple translations)
        console.log("💾 Caching result with key:", cacheKey);
        QuickTranslationService.globalCache.set(cacheKey, { ...result, cached: false });
        console.log(
            "💾 Global cache size after setting:",
            QuickTranslationService.globalCache.size,
        );
        console.log(
            "💾 Global cache keys after setting:",
            Array.from(QuickTranslationService.globalCache.keys()),
        );

        // Also cache in long-term persistent cache
        console.log("💾 Setting long-term cache with key:", providerCacheKey);

        try {
            await QuickTranslationService.longTermCache.set(
                providerCacheKey,
                result,
                "quick-translation",
                "translate",
            );
            console.log("💾 Cached with 30-day TTL");
        } catch (error) {
            console.error("💾 Failed to cache with long TTL:", error);
        }

        return result;
    }

    /**
     * Try translation with a specific provider
     */
    private async tryProvider(
        provider: DeepLDriver | GoogleDriver,
        text: string,
        from: string,
        to: string,
        startTime: number,
    ): Promise<QuickTranslationResult> {
        console.log(`🔍 Trying ${provider.provider} with:`, { text, from, to });

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`${provider.provider} translation timeout after 30 seconds`));
            }, 30000);
        });

        const translatePromise = provider.translate(text, from, to);
        const response = await Promise.race([translatePromise, timeoutPromise]);

        if (!response.data) {
            console.error(`❌ ${provider.provider} returned no data:`, response);
            throw new Error(`Provider ${provider.provider} returned unsuccessful response`);
        }

        if (!response.data.translation) {
            console.error(`❌ ${provider.provider} returned empty translation:`, response.data);
            throw new Error(`Provider ${provider.provider} returned empty translation`);
        }

        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        const result = {
            translation: this.decodeHtmlEntities(response.data.translation),
            provider: provider.provider,
            responseTime,
            cached: false,
        };

        console.log(`✅ ${provider.provider} success:`, result);

        // Update performance stats
        this.updateProviderStats(provider.provider, responseTime, true);

        // Track usage
        if (response.data.billedCharacters) {
            await this.usageTracker.trackUsage(provider.provider, response.data.billedCharacters);

            // Dispatch event to update status bar
            try {
                window.dispatchEvent(new CustomEvent("readnlearn:translation-usage-updated"));
            } catch (error) {
                console.error("Failed to dispatch translation usage update event:", error);
            }
        }

        return result;
    }

    /**
     * Decode HTML entities in translation text
     */
    private decodeHtmlEntities(text: string): string {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
    }

    /**
     * Create cache key for quick translations
     */
    private createCacheKey(text: string, from: string, to: string): string {
        return `quick-translation-${text.toLowerCase().trim()}-${from}-${to}`;
    }

    /**
     * Clear cache (useful for testing or manual cache management)
     */
    clearCache(): void {
        this.cache.clear();
        QuickTranslationService.globalCache.clear();
    }

    /**
     * Clear global cache (static method)
     */
    static clearGlobalCache(): void {
        QuickTranslationService.globalCache.clear();
    }

    /**
     * Clear long-term cache (static method)
     */
    static async clearLongTermCache(): Promise<void> {
        try {
            // Clear all entries from the long-term cache
            await QuickTranslationService.longTermCache.clear();
            console.log("🧹 Long-term cache cleared");
        } catch (error) {
            console.error("❌ Failed to clear long-term cache:", error);
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }

    /**
     * Get global cache statistics
     */
    static getGlobalCacheStats(): { size: number; keys: string[] } {
        return {
            size: QuickTranslationService.globalCache.size,
            keys: Array.from(QuickTranslationService.globalCache.keys()),
        };
    }

    /**
     * Initialize provider statistics
     */
    private initializeProviderStats(): void {
        this.providerStats.set("deepl", {
            provider: "deepl",
            responseTimes: [],
            successCount: 0,
            failureCount: 0,
            emaResponseTime: 0,
            successRate: 0,
            combinedScore: 0,
            weight: 0.5, // Start with equal weight
        });

        this.providerStats.set("google", {
            provider: "google",
            responseTimes: [],
            successCount: 0,
            failureCount: 0,
            emaResponseTime: 0,
            successRate: 0,
            combinedScore: 0,
            weight: 0.5, // Start with equal weight
        });

        console.log("📊 Provider stats initialized");
    }

    /**
     * Select providers based on performance weights
     */
    private selectProviders(providers: (DeepLDriver | GoogleDriver)[]): {
        primaryProvider: DeepLDriver | GoogleDriver;
        fallbackProvider: DeepLDriver | GoogleDriver;
    } {
        const deeplStats = this.providerStats.get("deepl")!;
        const googleStats = this.providerStats.get("google")!;

        // Check if we have enough samples for weighting
        const totalSamples = deeplStats.responseTimes.length + googleStats.responseTimes.length;
        const hasEnoughSamples =
            deeplStats.responseTimes.length >= this.MIN_SAMPLES_FOR_WEIGHTING &&
            googleStats.responseTimes.length >= this.MIN_SAMPLES_FOR_WEIGHTING;

        if (!hasEnoughSamples) {
            console.log(
                `🎲 Random selection (samples: ${totalSamples}/${this.MIN_SAMPLES_FOR_WEIGHTING * 2})`,
            );
            // Random selection until we have enough samples
            const randomIndex = Math.floor(Math.random() * providers.length);
            return {
                primaryProvider: providers[randomIndex],
                fallbackProvider: providers[1 - randomIndex],
            };
        }

        // Weighted selection based on performance
        const deeplWeight = deeplStats.weight;
        const googleWeight = googleStats.weight;
        const totalWeight = deeplWeight + googleWeight;

        const random = Math.random() * totalWeight;

        let primaryProvider: DeepLDriver | GoogleDriver;
        let fallbackProvider: DeepLDriver | GoogleDriver;

        if (random < deeplWeight) {
            primaryProvider = this.deeplDriver;
            fallbackProvider = this.googleDriver;
        } else {
            primaryProvider = this.googleDriver;
            fallbackProvider = this.deeplDriver;
        }

        console.log(
            `⚖️ Weighted selection: DeepL ${(deeplWeight * 100).toFixed(1)}%, Google ${(googleWeight * 100).toFixed(1)}%`,
        );

        return { primaryProvider, fallbackProvider };
    }

    /**
     * Update provider performance statistics
     */
    private updateProviderStats(provider: string, responseTime: number, success: boolean): void {
        const stats = this.providerStats.get(provider);
        if (!stats) return;

        // Update counts
        if (success) {
            stats.successCount++;
            stats.responseTimes.push(responseTime);

            // Update EMA
            if (stats.emaResponseTime === 0) {
                stats.emaResponseTime = responseTime;
            } else {
                stats.emaResponseTime =
                    this.EMA_ALPHA * responseTime + (1 - this.EMA_ALPHA) * stats.emaResponseTime;
            }
        } else {
            stats.failureCount++;
        }

        // Recalculate metrics
        const totalAttempts = stats.successCount + stats.failureCount;
        stats.successRate = totalAttempts > 0 ? stats.successCount / totalAttempts : 0;

        // Recalculate weights if we have enough samples
        if (stats.responseTimes.length >= this.MIN_SAMPLES_FOR_WEIGHTING) {
            this.recalculateWeights();
        }

        console.log(`📈 Updated ${provider} stats:`, {
            successRate: (stats.successRate * 100).toFixed(1) + "%",
            emaResponseTime: Math.round(stats.emaResponseTime) + "ms",
            weight: (stats.weight * 100).toFixed(1) + "%",
            samples: stats.responseTimes.length,
        });
    }

    /**
     * Recalculate provider weights based on performance
     */
    private recalculateWeights(): void {
        const deeplStats = this.providerStats.get("deepl")!;
        const googleStats = this.providerStats.get("google")!;

        // Calculate speed scores (inverted - faster is better)
        const allEmaTimes = [deeplStats.emaResponseTime, googleStats.emaResponseTime];
        const minEma = Math.min(...allEmaTimes);
        const maxEma = Math.max(...allEmaTimes);
        const emaRange = maxEma - minEma;

        const deeplSpeedScore =
            emaRange > 0 ? 1 - (deeplStats.emaResponseTime - minEma) / emaRange : 0.5;
        const googleSpeedScore =
            emaRange > 0 ? 1 - (googleStats.emaResponseTime - minEma) / emaRange : 0.5;

        // Calculate combined scores
        deeplStats.combinedScore =
            deeplStats.successRate * this.SUCCESS_RATE_WEIGHT + deeplSpeedScore * this.SPEED_WEIGHT;
        googleStats.combinedScore =
            googleStats.successRate * this.SUCCESS_RATE_WEIGHT +
            googleSpeedScore * this.SPEED_WEIGHT;

        // Calculate weights (normalized)
        const totalScore = deeplStats.combinedScore + googleStats.combinedScore;
        if (totalScore > 0) {
            deeplStats.weight = deeplStats.combinedScore / totalScore;
            googleStats.weight = googleStats.combinedScore / totalScore;
        } else {
            deeplStats.weight = 0.5;
            googleStats.weight = 0.5;
        }

        console.log(`⚖️ Recalculated weights:`, {
            deepl: `${(deeplStats.weight * 100).toFixed(1)}% (score: ${deeplStats.combinedScore.toFixed(3)})`,
            google: `${(googleStats.weight * 100).toFixed(1)}% (score: ${googleStats.combinedScore.toFixed(3)})`,
        });
    }

    /**
     * Get current provider statistics
     */
    getProviderStats(): Map<string, ProviderStats> {
        return new Map(this.providerStats);
    }

    /**
     * Reset provider statistics (for testing or manual reset)
     */
    resetProviderStats(): void {
        this.initializeProviderStats();
        console.log("🔄 Provider stats reset");
    }

    /**
     * Get usage statistics for all providers
     */
    async getUsageStats(): Promise<Map<string, UsageStats>> {
        return await this.usageTracker.getAllUsageStats();
    }

    /**
     * Get usage summary for display
     */
    async getUsageSummary(): Promise<{
        deepl: UsageStats;
        google: UsageStats;
        hasAvailableProviders: boolean;
    }> {
        return await this.usageTracker.getUsageSummary();
    }
}
