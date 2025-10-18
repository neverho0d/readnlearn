/**
 * TranslationAdapterFactory
 *
 * Factory for creating TranslationAdapter instances with proper configuration
 * from user settings and provider preferences.
 */

import { TranslationAdapter, ProviderConfig } from "./TranslationAdapter";

export interface TranslationAdapterFactory {
    createAdapter(): TranslationAdapter;
    getProviderInfo(): { name: string; hasApiKey: boolean; dailyCap?: number };
}

/**
 * Create a TranslationAdapter with OpenAI configuration
 */
export function createOpenAIAdapter(apiKey: string, dailyCap?: number): TranslationAdapter {
    const config: ProviderConfig = {
        apiKey,
        dailyCap,
        timeout: 30000, // 30 seconds
    };

    return new TranslationAdapter(config);
}

/**
 * Create adapter from user settings
 */
export function createAdapterFromSettings(settings: {
    openaiApiKey?: string;
    openaiDailyCap?: number;
}): TranslationAdapter | null {
    if (!settings.openaiApiKey) {
        return null;
    }

    return createOpenAIAdapter(settings.openaiApiKey, settings.openaiDailyCap);
}

/**
 * Get provider information for UI display
 */
export function getProviderInfo(settings: { openaiApiKey?: string; openaiDailyCap?: number }): {
    name: string;
    hasApiKey: boolean;
    dailyCap?: number;
} {
    return {
        name: "OpenAI GPT-5-nano",
        hasApiKey: !!settings.openaiApiKey,
        dailyCap: settings.openaiDailyCap,
    };
}
