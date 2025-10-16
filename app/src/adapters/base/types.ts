/**
 * Base types and interfaces for all provider adapters
 *
 * This module defines the common contracts that all provider adapters must implement,
 * ensuring consistent behavior across different cloud services (LLM, MT, TTS).
 */

export interface ProviderConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
    cache?: boolean;
}

export interface ProviderResponse<T = any> {
    data: T;
    metadata: {
        provider: string;
        model?: string;
        tokens?: number;
        cost?: number;
        latency: number;
        cached: boolean;
        timestamp: Date;
    };
}

export interface ProviderError extends Error {
    code: string;
    provider: string;
    statusCode?: number;
    retryable: boolean;
    metadata?: Record<string, any>;
}

export interface CacheEntry<T = any> {
    data: T;
    expiresAt: Date;
    provider: string;
    method: string;
    hash: string;
}

export interface RetryOptions {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
};

export interface BaseAdapter {
    readonly provider: string;
    readonly config: ProviderConfig;

    /**
     * Test the connection to the provider
     */
    testConnection(): Promise<boolean>;

    /**
     * Get usage statistics for the current period
     */
    getUsage(): Promise<UsageStats>;
}

export interface UsageStats {
    provider: string;
    period: "daily" | "monthly";
    tokensUsed: number;
    costUsd: number;
    requestsCount: number;
    lastUpdated: Date;
}

/**
 * Utility function to create a cache key from parameters
 */
export function createCacheKey(
    provider: string,
    method: string,
    params: Record<string, any>,
): string {
    const sortedParams = Object.keys(params)
        .sort()
        .reduce(
            (result, key) => {
                result[key] = params[key];
                return result;
            },
            {} as Record<string, any>,
        );

    const paramString = JSON.stringify(sortedParams);
    const hash = btoa(paramString).replace(/[^a-zA-Z0-9]/g, "");
    return `${provider}:${method}:${hash}`;
}

/**
 * Utility function to calculate exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number, options: RetryOptions): number {
    const delay = Math.min(
        options.baseDelay * Math.pow(options.backoffMultiplier, attempt),
        options.maxDelay,
    );

    if (options.jitter) {
        // Add jitter to prevent thundering herd
        const jitterAmount = delay * 0.1;
        return delay + (Math.random() * jitterAmount * 2 - jitterAmount);
    }

    return delay;
}

/**
 * Utility function to determine if an error is retryable
 */
export function isRetryableError(error: any): boolean {
    if (error?.retryable === false) return false;

    // Network errors
    if (error?.code === "NETWORK_ERROR") return true;
    if (error?.code === "TIMEOUT") return true;

    // HTTP status codes
    const statusCode = error?.statusCode || error?.status;
    if (statusCode >= 500) return true; // Server errors
    if (statusCode === 429) return true; // Rate limiting
    if (statusCode === 408) return true; // Request timeout

    return false;
}
