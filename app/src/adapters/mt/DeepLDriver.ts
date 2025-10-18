/**
 * DeepL MT Adapter
 *
 * Implements the MT driver interface for DeepL translation service.
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
    N;
}

export interface ExplanationResult {
    explanation: string;
    examples: string[];
    grammar?: string;
    tips: string[];
    level: "brief" | "normal" | "detailed";
}

export interface MtDriver extends BaseAdapter {
    translate(text: string, from: string, to: string): Promise<ProviderResponse<TranslationResult>>;
    explain(
        text: string,
        language: string,
        verbosity?: "brief" | "normal" | "detailed",
    ): Promise<ProviderResponse<ExplanationResult>>;
    getSupportedLanguages(): Promise<string[]>;
}

export class DeepLDriver implements MtDriver {
    public readonly provider = "deepl";
    public readonly config: ProviderConfig;
    private baseUrl: string;

    constructor(config: ProviderConfig) {
        this.config = config;
        this.baseUrl = config.baseUrl || "https://api-free.deepl.com/v2";
    }

    /**
     * Test the connection to DeepL
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/languages?type=target`, {
                headers: {
                    Authorization: `DeepL-Auth-Key ${this.config.apiKey}`,
                },
            });
            return response.ok;
        } catch (error) {
            console.error("DeepL connection test failed:", error);
            return false;
        }
    }

    /**
     * Get usage statistics
     */
    async getUsage(): Promise<UsageStats> {
        try {
            const response = await fetch(`${this.baseUrl}/usage`, {
                headers: {
                    Authorization: `DeepL-Auth-Key ${this.config.apiKey}`,
                },
            });

            if (!response.ok) {
                throw new Error(`DeepL usage API error: ${response.status}`);
            }

            const data = await response.json();

            return {
                provider: this.provider,
                period: "monthly",
                tokensUsed: data.character_count || 0,
                costUsd: 0, // DeepL doesn't provide cost info in usage API
                requestsCount: 0, // Not provided by DeepL
                lastUpdated: new Date(),
            };
        } catch (error) {
            console.error("Failed to get DeepL usage:", error);
            return {
                provider: this.provider,
                period: "monthly",
                tokensUsed: 0,
                costUsd: 0,
                requestsCount: 0,
                lastUpdated: new Date(),
            };
        }
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
                        tokens: text.length,
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

            if (tauriIsTauri()) {
                const payload = {
                    text: [text],
                    source_lang: this.mapLanguageCode(from),
                    target_lang: this.mapLanguageCode(to),
                    preserve_formatting: 1,
                } as Record<string, unknown>;

                const raw = await tauriInvoke<string>("deepl_proxy", {
                    apiKey: this.config.apiKey,
                    baseUrl: this.config.baseUrl,
                    method: "POST",
                    path: "/v2/translate",
                    body: JSON.stringify(payload),
                });
                const data = JSON.parse(raw);
                result = {
                    translation: data?.translations?.[0]?.text || "",
                    detectedLanguage: data?.translations?.[0]?.detected_source_language,
                    confidence: 1.0,
                };
            } else {
                const response = await this.callWithRetry(async () => {
                    const formData = new FormData();
                    formData.append("text", text);
                    formData.append("source_lang", this.mapLanguageCode(from));
                    formData.append("target_lang", this.mapLanguageCode(to));
                    formData.append("preserve_formatting", "1");

                    return await fetch(`${this.baseUrl}/translate`, {
                        method: "POST",
                        headers: {
                            Authorization: `DeepL-Auth-Key ${this.config.apiKey}`,
                        },
                        body: formData,
                    });
                });

                if (!response.ok) {
                    throw new Error(
                        `DeepL translation failed: ${response.status} ${response.statusText}`,
                    );
                }

                const data = await response.json();
                result = {
                    translation: data.translations[0]?.text || "",
                    detectedLanguage: data.translations[0]?.detected_source_language,
                    confidence: 1.0,
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
                    tokens: text.length,
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
                        tokens: text.length,
                        cost: 0,
                        latency: Date.now() - startTime,
                        cached: true,
                        timestamp: new Date(),
                    },
                };
            }
        }

        try {
            // For L1==L2 case, we need to use a different approach since DeepL doesn't provide explanations
            // We'll use a simple explanation based on the text
            const result: ExplanationResult = {
                explanation: this.generateExplanation(text, verbosity),
                examples: this.generateExamples(text),
                grammar: this.analyzeGrammar(text),
                tips: this.generateTips(text),
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
                    tokens: text.length,
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
            const response = await fetch(`${this.baseUrl}/languages?type=target`, {
                headers: {
                    Authorization: `DeepL-Auth-Key ${this.config.apiKey}`,
                },
            });

            if (!response.ok) {
                throw new Error(`DeepL languages API error: ${response.status}`);
            }

            const data = await response.json();
            return data.map((lang: any) => lang.language);
        } catch (error) {
            console.error("Failed to get DeepL supported languages:", error);
            return ["EN", "ES", "FR", "DE", "IT", "PT", "RU", "JA", "ZH"]; // Fallback
        }
    }

    /**
     * Map language codes to DeepL format
     */
    private mapLanguageCode(lang: string): string {
        const mapping: Record<string, string> = {
            en: "EN",
            es: "ES",
            fr: "FR",
            de: "DE",
            it: "IT",
            pt: "PT",
            ru: "RU",
            ja: "JA",
            zh: "ZH",
            "zh-cn": "ZH",
            "zh-tw": "ZH",
        };

        return mapping[lang.toLowerCase()] || lang.toUpperCase();
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
    private generateTips(text: string): string[] {
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
     * Call DeepL API with retry logic
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
     * Create a provider error
     */
    private createProviderError(error: any): ProviderError {
        return {
            name: "DeepLError",
            message: error.message || "DeepL API error",
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
