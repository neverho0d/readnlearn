/**
 * AWS Polly TTS Adapter
 *
 * Implements the TTS driver interface for AWS Polly text-to-speech service.
 * Provides audio synthesis with multiple voices and languages.
 */

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

export interface SynthesisResult {
    audioUrl: string;
    audioData?: ArrayBuffer;
    duration: number; // in seconds
    format: string;
    voice: string;
    language: string;
}

export interface Voice {
    id: string;
    name: string;
    language: string;
    gender: "male" | "female";
    neural: boolean;
}

export interface TtsDriver extends BaseAdapter {
    synthesize(
        // eslint-disable-next-line no-unused-vars
        text: string,
        // eslint-disable-next-line no-unused-vars
        voice: string,
        // eslint-disable-next-line no-unused-vars
        language: string,
    ): Promise<ProviderResponse<SynthesisResult>>;
    getVoices(
        // eslint-disable-next-line no-unused-vars
        language?: string,
    ): Promise<Voice[]>;
    getSupportedLanguages(): Promise<string[]>;
}

export class PollyDriver implements TtsDriver {
    public readonly provider = "polly";
    public readonly config: ProviderConfig;
    private baseUrl: string;
    private region: string;

    constructor(config: ProviderConfig, region: string = "us-east-1") {
        this.config = config;
        this.region = region;
        this.baseUrl = `https://polly.${region}.amazonaws.com`;
    }

    /**
     * Test the connection to AWS Polly
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.makeRequest("GET", "/v1/voices");
            return response.ok;
        } catch (error) {
            console.error("AWS Polly connection test failed:", error);
            return false;
        }
    }

    /**
     * Get usage statistics
     */
    async getUsage(): Promise<UsageStats> {
        // AWS Polly doesn't provide usage stats via API
        return {
            provider: this.provider,
            period: "monthly",
            tokensUsed: 0,
            costUsd: 0,
            requestsCount: 0,
            lastUpdated: new Date(),
        };
    }

    /**
     * Synthesize text to speech
     */
    async synthesize(
        text: string,
        voice: string,
        language: string,
    ): Promise<ProviderResponse<SynthesisResult>> {
        const startTime = Date.now();
        const cacheKey = createCacheKey(this.provider, "synthesize", { text, voice, language });

        // Check cache first
        if (this.config.cache !== false) {
            const cached = await providerCache.get<SynthesisResult>(cacheKey);
            if (cached) {
                return {
                    data: cached,
                    metadata: {
                        provider: this.provider,
                        cost: 0,
                        latency: Date.now() - startTime,
                        cached: true,
                        timestamp: new Date(),
                    },
                };
            }
        }

        try {
            const response = await this.callWithRetry(async () => {
                return await this.makeRequest("POST", "/v1/speech", {
                    Text: text,
                    VoiceId: voice,
                    OutputFormat: "mp3",
                    Engine: "neural", // Use neural engine for better quality
                });
            });

            if (!response.ok) {
                throw new Error(
                    `AWS Polly synthesis failed: ${response.status} ${response.statusText}`,
                );
            }

            const audioData = await response.arrayBuffer();
            const audioUrl = URL.createObjectURL(new Blob([audioData], { type: "audio/mpeg" }));

            const result: SynthesisResult = {
                audioUrl,
                audioData,
                duration: this.estimateDuration(text),
                format: "mp3",
                voice,
                language,
            };

            // Cache the result
            if (this.config.cache !== false) {
                await providerCache.set(cacheKey, result, this.provider, "synthesize");
            }

            const latency = Date.now() - startTime;

            return {
                data: result,
                metadata: {
                    provider: this.provider,
                    cost: this.calculateCost(text.length),
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
     * Get available voices
     */
    async getVoices(language?: string): Promise<Voice[]> {
        try {
            const response = await this.makeRequest("GET", "/v1/voices");

            if (!response.ok) {
                throw new Error(`AWS Polly voices API error: ${response.status}`);
            }

            const data = await response.json();
            let voices = data.Voices || [];

            // Filter by language if specified
            if (language) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                voices = voices.filter((voice: any) => voice.LanguageCode === language);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return voices.map((voice: any) => ({
                id: voice.Id,
                name: voice.Name,
                language: voice.LanguageCode,
                gender: voice.Gender.toLowerCase(),
                neural: voice.SupportedEngines?.includes("neural") || false,
            }));
        } catch (error) {
            console.error("Failed to get AWS Polly voices:", error);
            return [];
        }
    }

    /**
     * Get supported languages
     */
    async getSupportedLanguages(): Promise<string[]> {
        try {
            const voices = await this.getVoices();
            const languages = new Set(voices.map((voice) => voice.language));
            return Array.from(languages);
        } catch (error) {
            console.error("Failed to get AWS Polly supported languages:", error);
            return ["en-US", "es-ES", "fr-FR", "de-DE", "it-IT", "pt-BR", "ja-JP", "zh-CN"]; // Fallback
        }
    }

    /**
     * Make authenticated request to AWS Polly
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async makeRequest(method: string, path: string, body?: any): Promise<Response> {
        const url = `${this.baseUrl}${path}`;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        // Add AWS signature (simplified - in production, use proper AWS SDK)
        if (this.config.apiKey) {
            headers["Authorization"] = `AWS4-HMAC-SHA256 Credential=${this.config.apiKey}`;
        }

        const options: {
            method: string;
            headers: Record<string, string>;
            body?: string;
        } = {
            method,
            headers,
        };

        if (body && method !== "GET") {
            options.body = JSON.stringify(body);
        }

        return await fetch(url, options);
    }

    /**
     * Estimate audio duration based on text length
     */
    private estimateDuration(text: string): number {
        // Rough estimation: 150 words per minute
        const wordCount = text.split(" ").length;
        return Math.max(1, wordCount / 2.5); // 2.5 words per second
    }

    /**
     * Calculate cost based on text length
     */
    private calculateCost(textLength: number): number {
        // AWS Polly pricing (as of 2024): $4.00 per 1M characters for standard voices
        const charactersPerMillion = 1000000;
        const costPerMillion = 4.0;
        return (textLength / charactersPerMillion) * costPerMillion;
    }

    /**
     * Call AWS Polly API with retry logic
     */
    private async callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
     * Create a provider error
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private createProviderError(error: any): ProviderError {
        return {
            name: "PollyError",
            message: error.message || "AWS Polly API error",
            code: error.code || "UNKNOWN_ERROR",
            provider: this.provider,
            statusCode: error.status,
            retryable: isRetryableError(error),
            metadata: {
                region: this.region,
                timestamp: new Date().toISOString(),
            },
        };
    }
}
