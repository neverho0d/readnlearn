/**
 * OpenAI LLM Adapter
 *
 * Implements the LlmBaseAdapter interface for OpenAI's GPT models.
 * Uses OpenAI Responses API with Tauri proxy for unified LLM functionality.
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
    "gpt-5": { input: 1.25, output: 10 },
    "gpt-5-mini": { input: 0.25, output: 2 },
    "gpt-5-nano": { input: 0.05, output: 0.4 },
    "gpt-5-chat-latest": { input: 1.25, output: 10 },
    "gpt-5-codex": { input: 1.25, output: 10 },
    "gpt-5-pro": { input: 15, output: 120 },
    "gpt-4.1": { input: 2, output: 8 },
    "gpt-4.1-mini": { input: 0.4, output: 1.6 },
    "gpt-4.1-nano": { input: 0.1, output: 0.4 },
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4o-2024-05-13": { input: 5, output: 15 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-realtime": { input: 4, output: 16 },
    "gpt-realtime-mini": { input: 0.6, output: 2.4 },
    "gpt-4o-realtime-preview": { input: 5, output: 20 },
    "gpt-4o-mini-realtime-preview": { input: 0.6, output: 2.4 },
    "gpt-audio": { input: 2.5, output: 10 },
    "gpt-audio-mini": { input: 0.6, output: 2.4 },
    "gpt-4o-audio-preview": { input: 2.5, output: 10 },
    "gpt-4o-mini-audio-preview": { input: 0.15, output: 0.6 },
    o1: { input: 15, output: 60 },
    "o1-pro": { input: 150, output: 600 },
    "o3-pro": { input: 20, output: 80 },
    o3: { input: 2, output: 8 },
    "o3-deep-research": { input: 10, output: 40 },
    "o4-mini": { input: 1.1, output: 4.4 },
    "o4-mini-deep-research": { input: 2, output: 8 },
    "o3-mini": { input: 1.1, output: 4.4 },
    "o1-mini": { input: 1.1, output: 4.4 },
    "codex-mini-latest": { input: 1.5, output: 6 },
    "gpt-5-search-api": { input: 1.25, output: 10 },
    "gpt-4o-mini-search-preview": { input: 0.15, output: 0.6 },
    "gpt-4o-search-preview": { input: 2.5, output: 10 },
    "computer-use-preview": { input: 3, output: 12 },
};

export class OpenAIDriver implements LlmBaseAdapter {
    public readonly provider = "openai";
    private model: string;
    private apiKey: string;
    private baseUrl: string;
    private cache: boolean;
    public dailyCap: number;
    public readonly modelCost: { input: number; output: number };

    constructor(model: string = "gpt-5-nano") {
        this.model = model;
        this.apiKey = ""; // Will be loaded from settings
        this.baseUrl = "https://api.openai.com";
        this.cache = true;
        this.dailyCap = 50; // Default $50 daily cap (reasonable for 1M token pricing)
        this.modelCost = MODEL_COST[model];
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
                this.dailyCap = settings.dailyCapOpenAI || 50;
                this.apiKey = settings.openaiApiKey || "";
            }
        } catch (error) {
            console.warn("Failed to load OpenAI settings:", error);
        }
    }

    /**
     * Test the connection to OpenAI
     */
    async testConnection(): Promise<boolean> {
        try {
            // Simple test request to verify connection
            const testPrompt = "Hello";
            await this.callOpenAIResponsesAPI(testPrompt);
            return true;
        } catch (error) {
            console.error("OpenAI connection test failed:", error);
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
            const { content, inputTokens, outputTokens } =
                await this.callOpenAIResponsesAPI(prompt);
            const latency = Date.now() - startTime;
            const cost = this.calculateCost(inputTokens, outputTokens);

            // Update usage tracking with real token counts
            await usageTracker.updateUsage(this.provider, inputTokens, outputTokens, cost);

            // Cache the result
            if (this.cache !== false) {
                await providerCache.set(cacheKey, content, this.provider, "response");
            }

            return {
                data: content,
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
     * Call OpenAI Responses API via Tauri proxy
     */
    private async callOpenAIResponsesAPI(prompt: string): Promise<{
        content: string;
        inputTokens: number;
        outputTokens: number;
    }> {
        if (!tauriIsTauri()) {
            throw new Error("OpenAI Responses API requires Tauri environment");
        }

        const body = JSON.stringify({
            model: this.model,
            input: prompt,
        });

        const raw = await tauriInvoke<string>("openai_proxy", {
            apiKey: this.apiKey,
            baseUrl: this.baseUrl,
            method: "POST",
            path: "/v1/responses",
            body,
        });

        const json = JSON.parse(raw);

        // Extract usage data from the response
        const inputTokens = json?.usage?.input_tokens || 0;
        const outputTokens = json?.usage?.output_tokens || 0;

        // Extract content from the response
        let content = null;
        let responseContent = null;
        if (json?.output && Array.isArray(json.output)) {
            // Look for message type in output array
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const messageItem = json.output.find((item: any) => item.type === "message");
            if (messageItem?.content && Array.isArray(messageItem?.content)) {
                responseContent = messageItem?.content;
                // Look for output_text type
                const outputTextItem = responseContent.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (item: any) => item.type === "output_text",
                );
                if (outputTextItem) {
                    content = outputTextItem.text;
                } else {
                    console.error(
                        "No output_text item found in response content:",
                        responseContent,
                    );
                    throw new Error("No output_text item found in response content");
                }
            } else {
                console.error("No message item found in response content:", responseContent);
                throw new Error("No message item found in response content");
            }
        }

        return {
            content,
            inputTokens,
            outputTokens,
        };
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
            name: "OpenAIError",
            message: errorObj.message || "OpenAI API error",
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
