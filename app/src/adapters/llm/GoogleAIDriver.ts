/**
 * Google AI LLM Adapter
 *
 * Implements the LlmBaseAdapter interface for Google's Gemini models.
 * Provides unified LLM functionality with usage tracking and cost estimation.
 */

import { invoke as tauriInvoke, isTauri as tauriIsTauri } from "@tauri-apps/api/core";
import {
    ProviderResponse,
    ProviderError,
    LlmBaseAdapter,
    UsageStats,
    isRetryableError,
    createCacheKey,
} from "../base/types";
import { usageTracker } from "../base/usageTracker";
import { providerCache } from "../base/cache";

// Cost in USD per 1M tokens for different models (as of October 2025)
const MODEL_COST: Record<string, { input: number; output: number }> = {
    "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
};

export class GoogleAIDriver implements LlmBaseAdapter {
    public readonly provider = "google";
    private model: string;
    private apiKey: string;
    private baseUrl: string;
    private cache: boolean;
    public dailyCap: number;
    public readonly modelCost: { input: number; output: number };

    constructor(model: string = "gemini-2.5-flash-lite") {
        this.model = model;
        this.modelCost = MODEL_COST[model];
        this.apiKey = ""; // Will be loaded from settings
        this.baseUrl = "https://generativelanguage.googleapis.com";
        this.cache = true;
        this.dailyCap = 50; // Default $50 daily cap (reasonable for 1M token pricing)
        this.loadSettings();
    }

    /**
     * Load settings from localStorage
     */
    private loadSettings(): void {
        try {
            const settingsData = localStorage.getItem("readnlearn-settings");
            if (settingsData) {
                const settings = JSON.parse(settingsData);
                this.dailyCap = settings.dailyCapGoogle || 50;
                this.apiKey = settings.googleApiKey || "";
            }
        } catch (error) {
            console.warn("Failed to load Google AI settings:", error);
        }
    }

    /**
     * Test the connection to Google AI
     */
    async testConnection(): Promise<boolean> {
        try {
            // Simple test request to verify connection
            const testPrompt = "Hello";
            await this.callGoogleAI(testPrompt);
            return true;
        } catch (error) {
            console.error("Google AI connection test failed:", error);
            return false;
        }
    }

    /**
     * Get usage statistics
     */
    async getUsage(): Promise<UsageStats> {
        return await usageTracker.getUsageStats(this.provider);
    }

    /**
     * Send a prompt to the LLM and get a response
     */
    async response(prompt: string): Promise<ProviderResponse<string>> {
        const startTime = Date.now();
        const cacheKey = createCacheKey(this.provider, "response", { prompt });

        // Check cache first
        if (this.cache !== false) {
            const cached = await providerCache.get<string>(cacheKey);
            if (cached) {
                return {
                    data: cached,
                    metadata: {
                        provider: this.provider,
                        model: this.model,
                        inputTokens: 0,
                        outputTokens: 0,
                        cost: 0,
                        latency: Date.now() - startTime,
                        cached: true,
                        timestamp: new Date(),
                    },
                };
            }
        }

        try {
            const result = await this.callGoogleAI(prompt);
            const latency = Date.now() - startTime;

            // Estimate tokens (rough approximation)
            const inputTokens = Math.ceil(prompt.length / 4);
            const outputTokens = Math.ceil(result.length / 4);
            const cost = this.calculateCost(inputTokens, outputTokens);

            // Update usage tracking
            await usageTracker.updateUsage(this.provider, inputTokens, outputTokens, cost);

            // Cache the result
            if (this.cache !== false) {
                await providerCache.set(cacheKey, result, this.provider, "response");
            }

            return {
                data: result,
                metadata: {
                    provider: this.provider,
                    model: this.model,
                    inputTokens,
                    outputTokens,
                    cost,
                    latency,
                    cached: false,
                    timestamp: new Date(),
                },
            };
        } catch (error) {
            throw this.createProviderError(error);
        }
    }

    /**
     * Estimate the cost for a given prompt
     */
    async getCostEstimate(prompt: string): Promise<number> {
        // Rough estimation based on prompt length
        const inputTokens = Math.ceil(prompt.length / 4);
        const estimatedOutputTokens = Math.ceil(prompt.length / 8); // Assume response is ~half the input length
        return this.calculateCost(inputTokens, estimatedOutputTokens);
    }

    /**
     * Check if the provider is within daily limits
     */
    async isWithinDailyLimit(): Promise<boolean> {
        return await usageTracker.isWithinDailyLimit(this.provider, this.dailyCap);
    }

    /**
     * Get remaining quota for the current period
     */
    async getRemainingQuota(): Promise<number> {
        return await usageTracker.getRemainingQuota(this.provider, this.dailyCap);
    }

    /**
     * Update daily cap from settings
     */
    updateDailyCap(newCap: number): void {
        this.dailyCap = newCap;
    }

    /**
     * Call Google AI API via Tauri proxy
     */
    private async callGoogleAI(prompt: string): Promise<string> {
        if (!tauriIsTauri()) {
            throw new Error("Google AI API requires Tauri environment");
        }

        const body = JSON.stringify({
            contents: [
                {
                    parts: [{ text: prompt }],
                },
            ],
        });

        const raw = await tauriInvoke<string>("google_ai_proxy", {
            apiKey: this.apiKey,
            baseUrl: this.baseUrl,
            method: "POST",
            path: "/v1beta/models/gemini-2.5-flash-lite:generateContent",
            body,
        });
        console.log("Google AI response:", raw);

        const json = JSON.parse(raw);

        // Check for errors first
        if (json.error) {
            throw new Error(`Google AI API error: ${json.error.message || "Unknown error"}`);
        }

        // Parse Google AI response format
        if (json?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return json.candidates[0].content.parts[0].text;
        } else {
            console.error("Google AI response structure:", json);
            throw new Error("No valid content found in Google AI response");
        }
    }

    /**
     * Calculate cost based on input and output tokens
     */
    private calculateCost(inputTokens: number, outputTokens: number): number {
        const inputCost = (inputTokens * this.modelCost.input) / 1000000;
        const outputCost = (outputTokens * this.modelCost.output) / 1000000;

        return inputCost + outputCost;
    }

    /**
     * Create a provider error
     */
    private createProviderError(error: unknown): ProviderError {
        const errorObj = error as { message?: string; code?: string; status?: number };
        return {
            name: "GoogleAIError",
            message: errorObj.message || "Google AI API error",
            code: errorObj.code || "UNKNOWN_ERROR",
            provider: this.provider,
            statusCode: errorObj.status,
            retryable: isRetryableError(error),
            metadata: {
                model: this.model,
                timestamp: new Date().toISOString(),
            },
        };
    }
}
