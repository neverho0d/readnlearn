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
                        const { data: userSettings, error } = await supabase
                            .from("user_settings")
                            .select("*")
                            .eq("user_id", user.id)
                            .single();

                        if (!error && userSettings) {
                            setSettings({
                                l1: userSettings.l1,
                                l2: userSettings.l2,
                                l2AutoDetect: userSettings.l2_auto_detect,
                                font: userSettings.font || DEFAULT_SETTINGS.font,
                                fontSize: userSettings.font_size,
                                theme: userSettings.theme,
                            });
                            setLoading(false);
                            return;
                        } else if (error) {
                            console.log("Supabase settings error (table may not exist):", error);
                            // Continue to localStorage fallback
                        }
                    } catch (supabaseError) {
                        console.log("Supabase connection error:", supabaseError);
                        // Continue to localStorage fallback
                    }
                }

                // Fallback to localStorage
                try {
                    const raw = localStorage.getItem("readnlearn-settings");
                    if (raw) {
                        const localSettings = JSON.parse(raw);
                        setSettings({ ...DEFAULT_SETTINGS, ...localSettings });
                    }
                } catch {
                    // Use defaults if localStorage fails
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
                // Save to localStorage as backup
                localStorage.setItem("readnlearn-settings", JSON.stringify(settings));

                // Try to save to Supabase (if table exists)
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                    try {
                        await supabase.from("user_settings").upsert({
                            user_id: user.id,
                            l1: settings.l1,
                            l2: settings.l2,
                            l2_auto_detect: settings.l2AutoDetect,
                            font: settings.font,
                            font_size: settings.fontSize,
                            theme: settings.theme,
                            updated_at: new Date().toISOString(),
                        });
                    } catch (supabaseError) {
                        console.log("Supabase save error (table may not exist):", supabaseError);
                        // Settings are already saved to localStorage, so this is not critical
                    }
                }
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
