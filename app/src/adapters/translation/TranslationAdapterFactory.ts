/**
 * TranslationAdapterFactory
 *
 * Factory for creating TranslationAdapter instances with proper configuration
 * from user settings and provider preferences.
 */

import { TranslationAdapter } from "./TranslationAdapter";

export interface TranslationAdapterFactory {
    createAdapter(): TranslationAdapter;
    getProviderInfo(): { name: string; hasApiKey: boolean; dailyCap?: number };
}

/**
 * Create a TranslationAdapter with OpenAI configuration
 */
// eslint-disable-next-line no-unused-vars
export function createOpenAIAdapter(_apiKey: string, _dailyCap?: number): TranslationAdapter {
    // For now, return a mock adapter since we don't have the actual implementation
    // This should be replaced with actual OpenAI driver integration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockDrivers: any[] = [];
    return new TranslationAdapter(mockDrivers);
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
