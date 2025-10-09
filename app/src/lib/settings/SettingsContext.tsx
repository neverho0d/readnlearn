import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

interface SettingsState {
    l1: string; // UI language
    l2: string; // target language
    l2AutoDetect: boolean;
    font: string; // UI reading font family
    fontSize: number; // base font size in px
}

interface SettingsContextType {
    settings: SettingsState;
    // eslint-disable-next-line no-unused-vars
    updateSettings: (partial: Partial<SettingsState>) => void;
    // eslint-disable-next-line no-unused-vars
    getLanguageName: (code: string) => string;
}

const DEFAULT_SETTINGS: SettingsState = {
    l1: "en",
    l2: "es",
    l2AutoDetect: false,
    font: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, sans-serif",
    fontSize: 16,
};

const LANGUAGES: { code: string; name: string; nativeName: string }[] = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "es", name: "Spanish", nativeName: "Español" },
    { code: "fr", name: "French", nativeName: "Français" },
    { code: "de", name: "German", nativeName: "Deutsch" },
    { code: "it", name: "Italian", nativeName: "Italiano" },
    { code: "pt", name: "Portuguese", nativeName: "Português" },
];

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SettingsState>(() => {
        try {
            const raw = localStorage.getItem("readnlearn-settings");
            return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    });

    useEffect(() => {
        localStorage.setItem("readnlearn-settings", JSON.stringify(settings));
    }, [settings]);

    const updateSettings = (partial: Partial<SettingsState>) => {
        setSettings((prev) => ({ ...prev, ...partial }));
    };

    const getLanguageName = (code: string) => {
        return LANGUAGES.find((l) => l.code === code)?.nativeName || code;
    };

    const value = useMemo<SettingsContextType>(
        () => ({ settings, updateSettings, getLanguageName }),
        [settings],
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
    return ctx;
};

export { LANGUAGES };
