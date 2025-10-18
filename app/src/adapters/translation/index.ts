/**
 * Translation Adapters Index
 *
 * Exports all translation-related adapters and utilities.
 */

export { TranslationAdapter } from "./TranslationAdapter";
export type { TranslationResult, TranslationRequest, ProviderConfig } from "./TranslationAdapter";

export {
    createOpenAIAdapter,
    createAdapterFromSettings,
    getProviderInfo,
} from "./TranslationAdapterFactory";
