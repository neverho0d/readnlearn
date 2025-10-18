/**
 * Language Detection Hook
 *
 * This hook manages automatic language detection state and provides
 * methods to detect language and update the L2 setting accordingly.
 */

import { useState, useCallback, useRef } from "react";
import {
    detectLanguage,
    getLanguageNameInUI,
    LanguageDetectionResult,
} from "../utils/languageDetection";
import { useSettings } from "../settings/SettingsContext";
import { useI18n } from "../i18n/I18nContext";
import { sha256Base64 } from "../utils/hash";
import { getFileInfoByHash, upsertFileInfo } from "../db/fileInfo";

export interface LanguageDetectionState {
    isDetecting: boolean;
    detectedLanguage: string | null;
    detectionError: string | null;
    lastDetection: LanguageDetectionResult | null;
    isDetectionInProgress: boolean; // Prevent multiple simultaneous detections
}

export function useLanguageDetection() {
    const { settings, updateSettings } = useSettings();
    const { t } = useI18n();
    const lastDetectionTimeRef = useRef<number>(0);
    const [state, setState] = useState<LanguageDetectionState>({
        isDetecting: false,
        detectedLanguage: null,
        detectionError: null,
        lastDetection: null,
        isDetectionInProgress: false,
    });

    /**
     * Detect language of the provided text
     */
    const detectTextLanguage = useCallback(
        async (text: string, opts?: { sourceFile?: string; fileFormat?: "text" | "markdown" }) => {
            if (!text.trim()) {
                setState((prev) => ({ ...prev, detectionError: "No text provided for detection" }));
                return null;
            }

            // Compute content hash and consult cache
            const contentHash = await sha256Base64(text);
            try {
                const cached = await getFileInfoByHash(contentHash);
                if (cached?.language) {
                    const languageNameInUI = getLanguageNameInUI(cached.language, settings.l1);
                    const displayName = `${languageNameInUI} (${t.auto})`;
                    updateSettings({ l2: cached.language, l2AutoDetect: true });
                    setState((prev) => ({
                        ...prev,
                        isDetecting: false,
                        isDetectionInProgress: false,
                        detectedLanguage: displayName,
                        lastDetection: {
                            language: languageNameInUI,
                            languageCode: cached.language ?? "",
                            confidence: 0.99,
                            method: "google",
                        },
                    }));
                    console.info("[LangDetect] cache hit (Supabase)", {
                        language: cached.language,
                    });
                    return {
                        language: languageNameInUI,
                        languageCode: cached.language ?? "",
                        confidence: 0.99,
                        method: "google",
                    };
                }
            } catch {
                // ignore cache miss / storage errors
            }

            // Debounce: prevent detection if called within 2 seconds of last detection
            const now = Date.now();
            if (now - lastDetectionTimeRef.current < 2000) {
                return null;
            }

            // Prevent multiple simultaneous detections
            if (state.isDetectionInProgress) {
                return null;
            }

            lastDetectionTimeRef.current = now;

            setState((prev) => ({
                ...prev,
                isDetecting: true,
                isDetectionInProgress: true,
                detectionError: null,
                detectedLanguage: null,
            }));

            // Visible log for troubleshooting
            console.info("[LangDetect] starting", {
                sample: text.slice(0, 60),
                length: text.length,
            });

            try {
                // Use detection with configured providers; will fall back internally
                const result = await detectLanguage({
                    text,
                    sampleSize: 1000,
                });

                // Get the language name in the UI language (L1)
                const languageNameInUI = getLanguageNameInUI(result.languageCode, settings.l1);
                const displayName =
                    result.method === "fallback" && result.languageCode === "en"
                        ? "English (Fallback)"
                        : `${languageNameInUI} (${t.auto})`;

                setState((prev) => ({
                    ...prev,
                    isDetecting: false,
                    isDetectionInProgress: false,
                    detectedLanguage: displayName,
                    lastDetection: result,
                }));

                // Update L2 setting to the detected language
                updateSettings({
                    l2: result.languageCode,
                    l2AutoDetect: true,
                });

                // Save file info to Supabase for future runs
                try {
                    await upsertFileInfo({
                        source_file: opts?.sourceFile || "",
                        content_hash: contentHash,
                        file_format: opts?.fileFormat,
                        language: result.languageCode,
                        bytes: text.length,
                    });
                } catch (e) {
                    console.warn("[LangDetect] upsert file_info failed", e);
                }

                console.info("[LangDetect] done", result);
                return result;
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Language detection failed";
                setState((prev) => ({
                    ...prev,
                    isDetecting: false,
                    isDetectionInProgress: false,
                    detectionError: errorMessage,
                }));
                console.warn("[LangDetect] error", error);
                return null;
            }
        },
        [settings.l1, updateSettings, t, state.isDetectionInProgress],
    );

    /**
     * Clear detection state
     */
    const clearDetection = useCallback(() => {
        setState({
            isDetecting: false,
            detectedLanguage: null,
            detectionError: null,
            lastDetection: null,
            isDetectionInProgress: false,
        });
    }, []);

    /**
     * Get the current L2 display name
     */
    const getL2DisplayName = useCallback(() => {
        if (settings.l2AutoDetect && state.detectedLanguage) {
            return state.detectedLanguage;
        }

        if (settings.l2AutoDetect) {
            return t.auto;
        }

        // Get language name in UI language
        return getLanguageNameInUI(settings.l2, settings.l1);
    }, [settings.l2AutoDetect, settings.l2, settings.l1, state.detectedLanguage, t]);

    /**
     * Check if language detection is available
     */
    const isDetectionAvailable = useCallback(() => {
        return true; // For now, assume available
    }, []);

    return {
        ...state,
        detectTextLanguage,
        clearDetection,
        getL2DisplayName,
        isDetectionAvailable,
    };
}
