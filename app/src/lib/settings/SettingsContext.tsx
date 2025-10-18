/**
 * Settings Context
 *
 * This module provides global settings management for the ReadNLearn application.
 * It handles:
 * - Language settings (L1 for UI, L2 for content)
 * - Typography settings (font family and size)
 * - Auto-detection preferences
 * - Persistent storage in Supabase with localStorage fallback
 *
 * Architecture:
 * - Uses React Context for global state management
 * - Implements Supabase persistence with localStorage fallback
 * - Provides type-safe settings interface
 * - Includes language name resolution utilities
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/client";
import { costController } from "./costControls";

/**
 * Settings State Interface
 *
 * Defines the structure of application settings.
 * All settings are persisted to localStorage and restored on startup.
 */
interface SettingsState {
    l1: string; // UI language (user's native language)
    l2: string; // target language (language of content being read)
    l2AutoDetect: boolean; // Whether to auto-detect L2 language
    font: string; // UI and reading font family
    fontSize: number; // Base font size in pixels
    theme: string; // Theme preference (dark/light)
    // Learning preferences
    userLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"; // User's comprehension level
    userDifficulties: string[]; // Selected difficulties for explanation
    // Provider API keys and optional base URLs
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    deeplApiKey?: string;
    deeplBaseUrl?: string;
    googleApiKey?: string;
    googleBaseUrl?: string;
    // Daily spending caps (USD) - local-only (saved in localStorage)
    dailyCapOpenAI?: number;
    dailyCapDeepL?: number;
    dailyCapGoogle?: number;
}

/**
 * Settings Context Type
 *
 * Defines the interface for the settings context.
 * Provides access to settings state and update functions.
 */
interface SettingsContextType {
    settings: SettingsState;
    // eslint-disable-next-line no-unused-vars
    updateSettings: (partial: Partial<SettingsState>) => void;
    // eslint-disable-next-line no-unused-vars
    getLanguageName: (code: string) => string;
}

/**
 * Default Settings
 *
 * Fallback values used when no settings are stored or when localStorage is unavailable.
 * These values provide a sensible default experience for new users.
 */
const DEFAULT_SETTINGS: SettingsState = {
    l1: "en", // Default to English UI
    l2: "es", // Default to Spanish content
    l2AutoDetect: false, // Manual language selection by default
    font: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, sans-serif",
    fontSize: 16, // 16px base font size
    theme: "dark", // Default to dark theme
    userLevel: "A2", // Default to A2 level
    userDifficulties: ["Tense and Aspect", "Prepositions", "Gender and Agreement"], // Default difficulties
    dailyCapOpenAI: 5,
    dailyCapDeepL: 2,
    dailyCapGoogle: 2,
};

/**
 * Supported Languages
 *
 * List of languages supported by the application.
 * Each language includes:
 * - code: ISO language code for internal use
 * - name: English name of the language
 * - nativeName: Native name of the language for display
 */
const LANGUAGES: { code: string; name: string; nativeName: string }[] = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "es", name: "Spanish", nativeName: "Español" },
    { code: "fr", name: "French", nativeName: "Français" },
    { code: "de", name: "German", nativeName: "Deutsch" },
    { code: "it", name: "Italian", nativeName: "Italiano" },
    { code: "pt", name: "Portuguese", nativeName: "Português" },
];

/**
 * Available Learning Difficulties
 *
 * List of difficulties that users can select to help with explanations.
 * Based on the translation_prompt rule.
 */
export const LEARNING_DIFFICULTIES: Array<{ label: string; note: string }> = [
    // Phonology and Pronunciation
    { label: "Producing New Sounds", note: "Sounds not present in L1 (e.g., rolled R, tones)." },
    { label: "Intonation and Rhythm", note: "Stress patterns and musicality feel unnatural." },
    {
        label: "Minimal Pairs Discrimination",
        note: "Hard to distinguish words differing by one sound.",
    },
    // Grammar and Syntax
    {
        label: "Tense and Aspect",
        note: "Choosing correct verb forms (e.g., ser/estar; perfect vs simple past).",
    },
    {
        label: "Gender and Agreement",
        note: "Remembering noun gender and adjective/article agreement.",
    },
    { label: "Word Order (Syntax)", note: "Applying L1 word order causing awkward phrasing." },
    { label: "Prepositions", note: "Selecting correct preposition where mapping isn't 1:1." },
    // Vocabulary and Semantics
    { label: "Limited Lexicon", note: "Insufficient vocabulary for precise expression." },
    {
        label: "False Cognates (False Friends)",
        note: "Similar-looking words with different meanings (e.g., embarazada).",
    },
    {
        label: "Idioms and Slang",
        note: "Understanding non-literal, culturally specific expressions.",
    },
    { label: "Collocations", note: "Knowing natural word pairings (e.g., make a decision)." },
    // Listening and Comprehension
    { label: "Speed of Speech", note: "Processing native-speed speech; missing info." },
    {
        label: "Connected Speech",
        note: "Segmenting words when speech runs together (e.g., gonna).",
    },
    { label: "Regional Accents", note: "Understanding varied dialects and accents." },
];

/**
 * Settings Context
 *
 * React context for providing settings to child components.
 * Undefined when used outside of SettingsProvider.
 */
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Settings Provider Component
 *
 * React context provider that manages application settings.
 * Features:
 * - Initializes settings from localStorage with fallback to defaults
 * - Persists settings changes to localStorage automatically
 * - Provides type-safe settings updates
 * - Includes language name resolution utilities
 *
 * @param children - React children components
 */
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    /**
     * Load settings from Supabase with localStorage fallback
     */
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Try to load from Supabase first (if table exists)
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                    try {
                        const { data: kvRow, error } = await supabase
                            .from("user_settings")
                            .select("value")
                            .eq("user_id", user.id)
                            .eq("key", "settings")
                            .single();

                        // Merge any locally stored provider keys (keys, caps) regardless of KV state
                        let localProviderKeys: Partial<SettingsState> = {};
                        try {
                            const rawLocal = localStorage.getItem("readnlearn-settings");
                            if (rawLocal) {
                                const parsed = JSON.parse(rawLocal);
                                localProviderKeys = {
                                    openaiApiKey: parsed.openaiApiKey,
                                    openaiBaseUrl: parsed.openaiBaseUrl,
                                    deeplApiKey: parsed.deeplApiKey,
                                    deeplBaseUrl: parsed.deeplBaseUrl,
                                    googleApiKey: parsed.googleApiKey,
                                    googleBaseUrl: parsed.googleBaseUrl,
                                    dailyCapOpenAI: parsed.dailyCapOpenAI,
                                    dailyCapDeepL: parsed.dailyCapDeepL,
                                    dailyCapGoogle: parsed.dailyCapGoogle,
                                };
                            }
                        } catch (error) {
                            console.log("Error parsing local settings:", error);
                        }

                        if (!error && kvRow && kvRow.value) {
                            const remote = kvRow.value as Partial<SettingsState>;
                            setSettings({ ...DEFAULT_SETTINGS, ...remote, ...localProviderKeys });
                            setLoading(false);
                            return;
                        } else if (error) {
                            console.log(
                                "Supabase settings KV error (row may not exist yet):",
                                error,
                            );
                        }
                    } catch (supabaseError) {
                        console.log(
                            "Supabase settings KV error (row may not exist yet):",
                            supabaseError,
                        );
                    }
                }

                // Fallback to localStorage
                try {
                    const raw = localStorage.getItem("readnlearn-settings");
                    if (raw) {
                        const localSettings = JSON.parse(raw);
                        setSettings({ ...DEFAULT_SETTINGS, ...localSettings });
                    }
                } catch (error) {
                    console.log("Error parsing local settings:", error);
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    /**
     * Persist settings to Supabase and localStorage
     */
    useEffect(() => {
        if (loading) return;

        const saveSettings = async () => {
            try {
                // Save to localStorage as backup (includes caps and provider keys)
                localStorage.setItem("readnlearn-settings", JSON.stringify(settings));

                // Save core UI settings to Supabase KV (no caps or provider keys)
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                    try {
                        const value = {
                            l1: settings.l1,
                            l2: settings.l2,
                            l2AutoDetect: settings.l2AutoDetect,
                            font: settings.font,
                            fontSize: settings.fontSize,
                            theme: settings.theme,
                            userLevel: settings.userLevel,
                            userDifficulties: settings.userDifficulties,
                        };
                        await supabase.from("user_settings").upsert({
                            user_id: user.id,
                            key: "settings",
                            value,
                            updated_at: new Date().toISOString(),
                        });
                    } catch (supabaseError) {
                        console.log("Supabase save error (table may not exist):", supabaseError);
                    }
                }

                // Apply daily caps to cost controller limits
                costController.updateLimits([
                    {
                        provider: "openai",
                        dailyLimit: settings.dailyCapOpenAI ?? 5,
                        monthlyLimit: 50,
                        requestLimit: 200,
                        tokenLimit: 200000,
                    },
                    {
                        provider: "deepl",
                        dailyLimit: settings.dailyCapDeepL ?? 2,
                        monthlyLimit: 20,
                        requestLimit: 500,
                        tokenLimit: 0,
                    },
                    {
                        provider: "google",
                        dailyLimit: settings.dailyCapGoogle ?? 2,
                        monthlyLimit: 20,
                        requestLimit: 500,
                        tokenLimit: 0,
                    },
                    {
                        provider: "polly",
                        dailyLimit: 1,
                        monthlyLimit: 10,
                        requestLimit: 50,
                        tokenLimit: 10000,
                    },
                ]);
            } catch (error) {
                console.error("Failed to save settings:", error);
            }
        };

        saveSettings();
    }, [settings, loading]);

    /**
     * Update settings with partial state
     *
     * Merges partial settings with existing state.
     * Triggers localStorage persistence automatically.
     *
     * @param partial - Partial settings object to merge
     */
    const updateSettings = (partial: Partial<SettingsState>) => {
        setSettings((prev) => ({ ...prev, ...partial }));
    };

    /**
     * Get native language name by code
     *
     * Resolves language codes to their native names for display.
     * Falls back to the code itself if language is not found.
     *
     * @param code - ISO language code
     * @returns Native language name or code if not found
     */
    const getLanguageName = (code: string) => {
        return LANGUAGES.find((l) => l.code === code)?.nativeName || code;
    };

    /**
     * Memoized context value
     *
     * Prevents unnecessary re-renders by memoizing the context value.
     * Only changes when settings state changes.
     */
    const value = useMemo<SettingsContextType>(
        () => ({ settings, updateSettings, getLanguageName }),
        [settings],
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

/**
 * useSettings Hook
 *
 * Custom hook for accessing settings context.
 * Provides type-safe access to settings state and update functions.
 *
 * @returns Settings context with state and update functions
 * @throws Error if used outside of SettingsProvider
 */
export const useSettings = () => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
    return ctx;
};

export { LANGUAGES };
