/**
 * Google Translate MT Adapter
 *
 * Implements the MT driver interface for Google Translate service.
 * Provides translation and explanation services with L1==L2 support.
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
import { invoke as tauriInvoke, isTauri as tauriIsTauri } from "@tauri-apps/api/core";

export interface TranslationResult {
    translation: string;
    detectedLanguage?: string;
    confidence?: number;
    billedCharacters?: number;
}

export interface ExplanationResult {
    explanation: string;
    examples: string[];
    grammar?: string;
    tips: string[];
    level: "brief" | "normal" | "detailed";
}

export interface MtDriver extends BaseAdapter {
    // eslint-disable-next-line no-unused-vars
    translate(text: string, from: string, to: string): Promise<ProviderResponse<TranslationResult>>;
    explain(
        // eslint-disable-next-line no-unused-vars
        text: string,
        // eslint-disable-next-line no-unused-vars
        language: string,
        // eslint-disable-next-line no-unused-vars
        verbosity?: "brief" | "normal" | "detailed",
    ): Promise<ProviderResponse<ExplanationResult>>;
    getSupportedLanguages(): Promise<string[]>;
}

export class GoogleDriver implements MtDriver {
    public readonly provider = "google";
    public readonly config: ProviderConfig;
    private baseUrl: string;

    constructor(config: ProviderConfig) {
        this.config = config;
        this.baseUrl = config.baseUrl || "https://translation.googleapis.com/language/translate/v2";
    }

    /**
     * Test the connection to Google Translate
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/languages?key=${this.config.apiKey}`);
            return response.ok;
        } catch (error) {
            console.error("Google Translate connection test failed:", error);
            return false;
        }
    }

    /**
     * Decode HTML entities in text
     */
    private decodeHtmlEntities(text: string): string {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
    }

    /**
     * Count characters in text (for usage tracking)
     */
    private countCharacters(text: string): number {
        // Count Unicode code points as per Google's billing rules
        return Array.from(text).length;
    }

    /**
     * Get usage statistics
     */
    async getUsage(): Promise<UsageStats> {
        // Google Translate doesn't provide usage stats via API
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
     * Translate text from one language to another
     */
    async translate(
        text: string,
        from: string,
        to: string,
    ): Promise<ProviderResponse<TranslationResult>> {
        const startTime = Date.now();
        const cacheKey = createCacheKey(this.provider, "translate", { text, from, to });

        // Check cache first
        if (this.config.cache !== false) {
            const cached = await providerCache.get<TranslationResult>(cacheKey);
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
            let result: TranslationResult;

            // Count characters for usage tracking
            const characterCount = this.countCharacters(text);

            if (tauriIsTauri()) {
                const body: Record<string, unknown> = { q: text, target: to };
                if (from && from !== "auto") body.source = from;

                const raw = await tauriInvoke<string>("google_proxy", {
                    // codeql[js/insecure-randomness]: apiKey is user-provided configuration, not generated with Math.random()
                    apiKey: this.config.apiKey,
                    baseUrl: this.config.baseUrl,
                    method: "POST",
                    path: "/language/translate/v2",
                    body: JSON.stringify(body),
                });
                const data = JSON.parse(raw);
                result = {
                    translation: this.decodeHtmlEntities(
                        data?.data?.translations?.[0]?.translatedText || "",
                    ),
                    detectedLanguage: data?.data?.translations?.[0]?.detectedSourceLanguage,
                    confidence: 1.0,
                    billedCharacters: characterCount,
                };
            } else {
                const response = await this.callWithRetry(async () => {
                    const params = new URLSearchParams({
                        q: text,
                        source: from,
                        target: to,
                        key: this.config.apiKey,
                        format: "text",
                    });

                    return await fetch(`${this.baseUrl}?${params}`, { method: "GET" });
                });

                if (!response.ok) {
                    throw new Error(
                        `Google Translate failed: ${response.status} ${response.statusText}`,
                    );
                }

                const data = await response.json();
                result = {
                    translation: this.decodeHtmlEntities(
                        data.data.translations[0]?.translatedText || "",
                    ),
                    detectedLanguage: data.data.translations[0]?.detectedSourceLanguage,
                    confidence: 1.0,
                    billedCharacters: characterCount,
                };
            }

            // Cache the result
            if (this.config.cache !== false) {
                await providerCache.set(cacheKey, result, this.provider, "translate");
            }

            const latency = Date.now() - startTime;

            return {
                data: result,
                metadata: {
                    provider: this.provider,
                    cost: 0,
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
     * Explain text (for L1==L2 case)
     */
    async explain(
        text: string,
        language: string,
        verbosity: "brief" | "normal" | "detailed" = "normal",
    ): Promise<ProviderResponse<ExplanationResult>> {
        const startTime = Date.now();
        const cacheKey = createCacheKey(this.provider, "explain", { text, language, verbosity });

        // Check cache first
        if (this.config.cache !== false) {
            const cached = await providerCache.get<ExplanationResult>(cacheKey);
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
            // For L1==L2 case, we need to use a different approach since Google Translate doesn't provide explanations
            // We'll use a simple explanation based on the text
            const result: ExplanationResult = {
                explanation: this.generateExplanation(text, verbosity),
                examples: this.generateExamples(text),
                grammar: this.analyzeGrammar(text),
                tips: this.generateTips(),
                level: verbosity,
            };

            // Cache the result
            if (this.config.cache !== false) {
                await providerCache.set(cacheKey, result, this.provider, "explain");
            }

            const latency = Date.now() - startTime;

            return {
                data: result,
                metadata: {
                    provider: this.provider,
                    cost: 0,
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
     * Get supported languages
     */
    async getSupportedLanguages(): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/languages?key=${this.config.apiKey}`);

            if (!response.ok) {
                throw new Error(`Google Translate languages API error: ${response.status}`);
            }

            const data = await response.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data.data.languages.map((lang: any) => lang.language);
        } catch (error) {
            console.error("Failed to get Google Translate supported languages:", error);
            return ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "zh", "ar", "hi"]; // Fallback
        }
    }

    /**
     * Generate explanation for L1==L2 case
     */
    private generateExplanation(text: string, verbosity: "brief" | "normal" | "detailed"): string {
        const wordCount = text.split(" ").length;

        switch (verbosity) {
            case "brief":
                return `This phrase contains ${wordCount} word${wordCount !== 1 ? "s" : ""} and appears to be a ${this.identifyPhraseType(text)}.`;
            case "normal":
                return `This phrase "${text}" is a ${this.identifyPhraseType(text)}. It contains ${wordCount} word${wordCount !== 1 ? "s" : ""} and can be used in various contexts.`;
            case "detailed":
                return `This phrase "${text}" is a ${this.identifyPhraseType(text)}. It contains ${wordCount} word${wordCount !== 1 ? "s" : ""} and can be used in various contexts. The phrase structure suggests it's commonly used in ${this.identifyContext(text)} situations.`;
            default:
                return `This phrase "${text}" contains ${wordCount} word${wordCount !== 1 ? "s" : ""}.`;
        }
    }

    /**
     * Generate examples
     */
    private generateExamples(text: string): string[] {
        return [`Example: "${text}"`, `Usage: You can say "${text}" when...`];
    }

    /**
     * Analyze grammar
     */
    private analyzeGrammar(text: string): string | undefined {
        if (text.includes(" ")) {
            return "This is a multi-word phrase.";
        }
        return undefined;
    }

    /**
     * Generate tips
     */
    private generateTips(): string[] {
        return [
            "Practice using this phrase in different contexts",
            "Pay attention to pronunciation",
            "Try to use it in conversation",
        ];
    }

    /**
     * Identify phrase type
     */
    private identifyPhraseType(text: string): string {
        if (text.includes("?")) return "question";
        if (text.includes("!")) return "exclamation";
        if (text.includes(".")) return "statement";
        if (text.split(" ").length === 1) return "single word";
        return "phrase";
    }

    /**
     * Identify context
     */
    private identifyContext(text: string): string {
        const lowerText = text.toLowerCase();
        if (lowerText.includes("hello") || lowerText.includes("hi")) return "greeting";
        if (lowerText.includes("thank") || lowerText.includes("please")) return "polite";
        if (lowerText.includes("?")) return "questioning";
        return "general";
    }

    /**
     * Call Google Translate API with retry logic
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
            name: "GoogleTranslateError",
            message: error.message || "Google Translate API error",
            code: error.code || "UNKNOWN_ERROR",
            provider: this.provider,
            statusCode: error.status,
            retryable: isRetryableError(error),
            metadata: {
                timestamp: new Date().toISOString(),
            },
        };
    }
}
