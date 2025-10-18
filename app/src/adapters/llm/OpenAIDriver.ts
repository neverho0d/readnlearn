/**
 * OpenAI LLM Adapter
 *
 * Implements the LLM driver interface for OpenAI's GPT models.
 * Provides story generation, cloze exercises, and content validation.
 */

import OpenAI from "openai";
import { invoke as tauriInvoke, isTauri as tauriIsTauri } from "@tauri-apps/api/core";
import {
    ProviderConfig,
    ProviderResponse,
    ProviderError,
    BaseAdapter,
    UsageStats,
    DEFAULT_RETRY_OPTIONS,
    calculateBackoffDelay,
    isRetryableError,
    createCacheKey,
} from "../base/types";
import { providerCache } from "../base/cache";
import {
    LearningContext,
    Phrase,
    StoryPrompt,
    ClozePrompt,
    createStoryPrompt,
    createClozePrompt,
    createValidationPrompt,
    createFallbackStory,
    createExplanationPrompt,
} from "./prompts";

export interface StoryResult {
    story: string;
    usedPhrases: Array<{
        phrase: string;
        position: number;
        gloss: string;
    }>;
    metadata: {
        wordCount: number;
        difficulty: string;
        topics: string[];
    };
}

export interface ClozeResult {
    id: string;
    text: string;
    blanks: Array<{
        position: number;
        answer: string;
        alternatives: string[];
    }>;
    difficulty: number;
    explanation: string;
}

export interface LlmDriver extends BaseAdapter {
    generateStory(
        phrases: Phrase[],
        context: LearningContext,
    ): Promise<ProviderResponse<StoryResult>>;
    generateCloze(
        phrases: Phrase[],
        context: LearningContext,
        count?: number,
    ): Promise<ProviderResponse<ClozeResult[]>>;
    validateStory(
        story: string,
        phrases: Phrase[],
    ): Promise<ProviderResponse<{ valid: boolean; issues: string[]; coverage: number }>>;
    explainPhrase(
        phrase: Phrase,
        context: LearningContext,
        verbosity?: "brief" | "normal" | "detailed",
    ): Promise<
        ProviderResponse<{
            explanation: string;
            examples: string[];
            grammar?: string;
            tips: string[];
        }>
    >;
}

export class OpenAIDriver implements LlmDriver {
    public readonly provider = "openai";
    public readonly config: ProviderConfig;
    private client: OpenAI;
    private model: string;

    constructor(config: ProviderConfig, model: string = "gpt-4") {
        this.config = config;
        this.model = model;
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
            timeout: config.timeout || 30000,
        });
    }

    /**
     * Test the connection to OpenAI
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.client.models.list();
            return response.data.length > 0;
        } catch (error) {
            console.error("OpenAI connection test failed:", error);
            return false;
        }
    }

    /**
     * Get usage statistics
     */
    async getUsage(): Promise<UsageStats> {
        // OpenAI doesn't provide usage stats via API, so we track locally
        // This would need to be implemented with local tracking
        return {
            provider: this.provider,
            period: "daily",
            tokensUsed: 0,
            costUsd: 0,
            requestsCount: 0,
            lastUpdated: new Date(),
        };
    }

    /**
     * Generate a story including all provided phrases
     */
    async generateStory(
        phrases: Phrase[],
        context: LearningContext,
    ): Promise<ProviderResponse<StoryResult>> {
        const startTime = Date.now();
        const cacheKey = createCacheKey(this.provider, "generateStory", { phrases, context });

        // Check cache first
        if (this.config.cache !== false) {
            const cached = await providerCache.get<StoryResult>(cacheKey);
            if (cached) {
                return {
                    data: cached,
                    metadata: {
                        provider: this.provider,
                        model: this.model,
                        tokens: 0,
                        cost: 0,
                        latency: Date.now() - startTime,
                        cached: true,
                        timestamp: new Date(),
                    },
                };
            }
        }

        try {
            const prompt = createStoryPrompt({
                phrases,
                context,
                wordCount: 120, // Target word count
                includeGlosses: true,
            });

            let result: StoryResult;
            let tokens = 0;
            if (tauriIsTauri()) {
                const body = JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are an expert language learning tutor. Always respond with valid JSON in the exact format requested.",
                        },
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                });
                const raw = await tauriInvoke<string>("openai_proxy", {
                    apiKey: this.config.apiKey,
                    baseUrl: this.config.baseUrl,
                    method: "POST",
                    path: "/v1/chat/completions",
                    body,
                });
                const json = JSON.parse(raw);
                const content = json?.choices?.[0]?.message?.content as string | undefined;
                if (!content) throw new Error("No content in OpenAI response");
                result = this.parseJsonResponse<StoryResult>(content);
                tokens = json?.usage?.total_tokens || 0;
            } else {
                const response = await this.callWithRetry(async () => {
                    return await this.client.chat.completions.create({
                        model: this.model,
                        messages: [
                            {
                                role: "system",
                                content:
                                    "You are an expert language learning tutor. Always respond with valid JSON in the exact format requested.",
                            },
                            { role: "user", content: prompt },
                        ],
                        temperature: 0.7,
                        max_tokens: 1000,
                    });
                });
                const content = response.choices[0]?.message?.content;
                if (!content) throw new Error("No content in OpenAI response");
                result = this.parseJsonResponse<StoryResult>(content);
                tokens = response.usage?.total_tokens || 0;
            }

            // Cache the result
            if (this.config.cache !== false) {
                await providerCache.set(cacheKey, result, this.provider, "generateStory");
            }

            const latency = Date.now() - startTime;
            const cost = this.calculateCost(tokens);

            return {
                data: result,
                metadata: {
                    provider: this.provider,
                    model: this.model,
                    tokens,
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
     * Generate cloze exercises
     */
    async generateCloze(
        phrases: Phrase[],
        context: LearningContext,
        count: number = 5,
    ): Promise<ProviderResponse<ClozeResult[]>> {
        const startTime = Date.now();
        const cacheKey = createCacheKey(this.provider, "generateCloze", {
            phrases,
            context,
            count,
        });

        // Check cache first
        if (this.config.cache !== false) {
            const cached = await providerCache.get<ClozeResult[]>(cacheKey);
            if (cached) {
                return {
                    data: cached,
                    metadata: {
                        provider: this.provider,
                        model: this.model,
                        tokens: 0,
                        cost: 0,
                        latency: Date.now() - startTime,
                        cached: true,
                        timestamp: new Date(),
                    },
                };
            }
        }

        try {
            const prompt = createClozePrompt({
                phrases,
                context,
                exerciseCount: count,
            });

            let result: ClozeResult[];
            let tokens = 0;
            if (tauriIsTauri()) {
                const body = JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are an expert language learning tutor. Always respond with valid JSON in the exact format requested.",
                        },
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.7,
                    max_tokens: 800,
                });
                const raw = await tauriInvoke<string>("openai_proxy", {
                    apiKey: this.config.apiKey,
                    baseUrl: this.config.baseUrl,
                    method: "POST",
                    path: "/v1/chat/completions",
                    body,
                });
                const json = JSON.parse(raw);
                const content = json?.choices?.[0]?.message?.content as string | undefined;
                if (!content) throw new Error("No content in OpenAI response");
                result = this.parseJsonResponse<ClozeResult[]>(content);
                tokens = json?.usage?.total_tokens || 0;
            } else {
                const response = await this.callWithRetry(async () => {
                    return await this.client.chat.completions.create({
                        model: this.model,
                        messages: [
                            {
                                role: "system",
                                content:
                                    "You are an expert language learning tutor. Always respond with valid JSON in the exact format requested.",
                            },
                            { role: "user", content: prompt },
                        ],
                        temperature: 0.7,
                        max_tokens: 800,
                    });
                });
                const content = response.choices[0]?.message?.content;
                if (!content) throw new Error("No content in OpenAI response");
                result = this.parseJsonResponse<ClozeResult[]>(content);
                tokens = response.usage?.total_tokens || 0;
            }

            // Cache the result
            if (this.config.cache !== false) {
                await providerCache.set(cacheKey, result, this.provider, "generateCloze");
            }

            const latency = Date.now() - startTime;
            const cost = this.calculateCost(tokens);

            return {
                data: result,
                metadata: {
                    provider: this.provider,
                    model: this.model,
                    tokens,
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
     * Validate a generated story
     */
    async validateStory(
        story: string,
        phrases: Phrase[],
    ): Promise<ProviderResponse<{ valid: boolean; issues: string[]; coverage: number }>> {
        const startTime = Date.now();

        try {
            const prompt = createValidationPrompt(story, phrases);

            const response = await this.callWithRetry(async () => {
                return await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are an expert content validator. Always respond with valid JSON in the exact format requested.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.3,
                    max_tokens: 500,
                });
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No content in OpenAI response");
            }

            const result = this.parseJsonResponse<{
                valid: boolean;
                issues: string[];
                coverage: number;
            }>(content);
            const latency = Date.now() - startTime;
            const tokens = response.usage?.total_tokens || 0;
            const cost = this.calculateCost(tokens);

            return {
                data: result,
                metadata: {
                    provider: this.provider,
                    model: this.model,
                    tokens,
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
     * Explain a phrase (for L1==L2 case)
     */
    async explainPhrase(
        phrase: Phrase,
        context: LearningContext,
        verbosity: "brief" | "normal" | "detailed" = "normal",
    ): Promise<
        ProviderResponse<{
            explanation: string;
            examples: string[];
            grammar?: string;
            tips: string[];
        }>
    > {
        const startTime = Date.now();
        const cacheKey = createCacheKey(this.provider, "explainPhrase", {
            phrase,
            context,
            verbosity,
        });

        // Check cache first
        if (this.config.cache !== false) {
            const cached = await providerCache.get<{
                explanation: string;
                examples: string[];
                grammar?: string;
                tips: string[];
            }>(cacheKey);
            if (cached) {
                return {
                    data: cached,
                    metadata: {
                        provider: this.provider,
                        model: this.model,
                        tokens: 0,
                        cost: 0,
                        latency: Date.now() - startTime,
                        cached: true,
                        timestamp: new Date(),
                    },
                };
            }
        }

        try {
            const prompt = createExplanationPrompt(phrase, context, verbosity);

            const response = await this.callWithRetry(async () => {
                return await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are an expert language tutor. Always respond with valid JSON in the exact format requested.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.5,
                    max_tokens: 600,
                });
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No content in OpenAI response");
            }

            const result = this.parseJsonResponse<{
                explanation: string;
                examples: string[];
                grammar?: string;
                tips: string[];
            }>(content);

            // Cache the result
            if (this.config.cache !== false) {
                await providerCache.set(cacheKey, result, this.provider, "explainPhrase");
            }

            const latency = Date.now() - startTime;
            const tokens = response.usage?.total_tokens || 0;
            const cost = this.calculateCost(tokens);

            return {
                data: result,
                metadata: {
                    provider: this.provider,
                    model: this.model,
                    tokens,
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
     * Call OpenAI API with retry logic
     */
    private async callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: any;

        for (let attempt = 0; attempt <= DEFAULT_RETRY_OPTIONS.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (attempt === DEFAULT_RETRY_OPTIONS.maxRetries || !isRetryableError(error)) {
                    throw error;
                }

                const delay = calculateBackoffDelay(attempt, DEFAULT_RETRY_OPTIONS);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    }

    /**
     * Parse JSON response from OpenAI
     */
    private parseJsonResponse<T>(content: string): T {
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("No JSON found in response");
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            throw new Error(`Failed to parse JSON response: ${error}`);
        }
    }

    /**
     * Calculate cost based on tokens and model
     */
    private calculateCost(tokens: number): number {
        // Rough cost estimates (as of 2024)
        const costs = {
            "gpt-4": 0.03 / 1000, // $0.03 per 1K tokens
            "gpt-4-turbo": 0.01 / 1000,
            "gpt-3.5-turbo": 0.002 / 1000,
        };

        const rate = costs[this.model as keyof typeof costs] || costs["gpt-3.5-turbo"];
        return tokens * rate;
    }

    /**
     * Create a provider error
     */
    private createProviderError(error: any): ProviderError {
        return {
            name: "OpenAIError",
            message: error.message || "OpenAI API error",
            code: error.code || "UNKNOWN_ERROR",
            provider: this.provider,
            statusCode: error.status,
            retryable: isRetryableError(error),
            metadata: {
                model: this.model,
                timestamp: new Date().toISOString(),
            },
        };
    }
}
