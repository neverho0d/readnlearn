import React, { useRef } from "react";
import { useSettings, LANGUAGES } from "../../lib/settings/SettingsContext";
import { useI18n } from "../../lib/i18n/I18nContext";
import "./LanguageSettings.css";
import { useTheme } from "../../lib/settings/ThemeContext";
import { useAppMode, AppMode } from "../../lib/state/appMode";

interface LanguageSettingsProps {
    isLoading?: boolean;
    // eslint-disable-next-line no-unused-vars
    onLoadFile?: (text: string, filename?: string) => void;
}

export const LanguageSettings: React.FC<LanguageSettingsProps> = ({
    isLoading = false,
    onLoadFile,
}) => {
    const { settings, updateSettings, getLanguageName } = useSettings();
    const { t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { theme, toggleTheme } = useTheme();
    const { mode, setMode } = useAppMode();

    const handlePickFile = () => {
        if (onLoadFile && fileInputRef.current) {
            // Reset to ensure selecting the same file triggers onChange
            fileInputRef.current.value = "";
            // Prefer showPicker if supported (more reliable in some environments)
            const anyInput = fileInputRef.current as unknown as {
                showPicker?: () => void;
            };
            if (typeof anyInput.showPicker === "function") {
                anyInput.showPicker();
            } else {
                fileInputRef.current.click();
            }
        }
    };

    const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        if (!onLoadFile) return;
        const file = e.target.files?.[0];
        console.log("file", file);
        if (!file) return;
        const reader = new FileReader();
        console.log("file", file.name);
        reader.onload = () => {
            const text = typeof reader.result === "string" ? reader.result : "";
            console.log("file", file.name);
            console.log("text", text.length);
            onLoadFile(text, file.name);

            // Persist last opened file path and name (for Tauri restore); no content
            try {
                const anyFile = file as unknown as { path?: string };
                if (anyFile.path) {
                    localStorage.setItem("readnlearn-last-file-path", anyFile.path);
                } else {
                    console.error("No path found for file", file, anyFile);
                }
                localStorage.setItem("readnlearn-last-file-name", file.name);
                // Also keep last content as a fallback for environments where path is unavailable
                localStorage.setItem("readnlearn-last-file-content", text);
            } catch (e) {
                console.error(e);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div
            className="language-settings"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: "var(--topbar-bg)",
                color: "var(--topbar-text)",
                padding: "8px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "14px",
            }}
        >
            {/* Language Selectors */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* L1 (Native Language) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ color: "#a0aec0", fontSize: "12px", fontWeight: 500 }}>
                        {t.l1Label}
                    </label>
                    <select
                        value={settings.l1}
                        onChange={(e) => updateSettings({ l1: e.target.value })}
                        style={{
                            backgroundColor: "#2d3748",
                            color: "white",
                            border: "1px solid #4a5568",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "12px",
                            minWidth: "120px",
                            appearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a0aec0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: "right 8px center",
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "16px",
                            paddingRight: "32px",
                        }}
                    >
                        {LANGUAGES.map((lang) => (
                            <option
                                key={lang.code}
                                value={lang.code}
                                style={{ backgroundColor: "#2d3748", color: "white" }}
                            >
                                {lang.nativeName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* L2 (Target Language) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ color: "#a0aec0", fontSize: "12px", fontWeight: 500 }}>
                        {t.l2Label}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                            type="checkbox"
                            id="l2-autodetect"
                            checked={settings.l2AutoDetect}
                            onChange={(e) => updateSettings({ l2AutoDetect: e.target.checked })}
                            style={{ margin: 0 }}
                        />
                        <label
                            htmlFor="l2-autodetect"
                            style={{ fontSize: "12px", color: "#a0aec0" }}
                        >
                            {t.autoDetect}
                        </label>
                    </div>
                    <select
                        value={settings.l2}
                        onChange={(e) => updateSettings({ l2: e.target.value })}
                        disabled={settings.l2AutoDetect}
                        style={{
                            backgroundColor: settings.l2AutoDetect ? "#1a202c" : "#2d3748",
                            color: settings.l2AutoDetect ? "#718096" : "white",
                            border: "1px solid #4a5568",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "12px",
                            minWidth: "120px",
                            cursor: settings.l2AutoDetect ? "not-allowed" : "pointer",
                            appearance: "none",
                            backgroundImage: settings.l2AutoDetect
                                ? "none"
                                : `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a0aec0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: "right 8px center",
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "16px",
                            paddingRight: "32px",
                        }}
                    >
                        {LANGUAGES.map((lang) => (
                            <option
                                key={lang.code}
                                value={lang.code}
                                style={{ backgroundColor: "#2d3748", color: "white" }}
                            >
                                {lang.nativeName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Mode switch, current language, and Load */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Mode switch */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as AppMode)}
                        style={{
                            backgroundColor: "#2d3748",
                            color: "white",
                            border: "1px solid #4a5568",
                            borderRadius: 4,
                            padding: "4px 8px",
                            fontSize: 12,
                        }}
                    >
                        <option value="reading">Reading</option>
                        <option value="dictionary">Dictionary</option>
                        <option value="learning">Learning</option>
                    </select>
                </div>

                <span style={{ color: "#a0aec0", fontSize: "12px" }}>
                    {getLanguageName(settings.l1)} →{" "}
                    {settings.l2AutoDetect ? "Auto" : getLanguageName(settings.l2)}
                </span>
                {onLoadFile && (
                    <button
                        onClick={handlePickFile}
                        disabled={isLoading}
                        style={{
                            backgroundColor: isLoading ? "#4a5568" : "var(--primary)",
                            color: "var(--primary-contrast)",
                            border: "none",
                            borderRadius: "4px",
                            padding: "6px 12px",
                            cursor: isLoading ? "not-allowed" : "pointer",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            opacity: isLoading ? 0.7 : 1,
                        }}
                        title={t.loadButton}
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10,9 9,9 8,9" />
                        </svg>
                        {t.loadButton}
                    </button>
                )}

                {/* Theme switch */}
                <button
                    onClick={toggleTheme}
                    style={{
                        backgroundColor: "transparent",
                        color: "var(--topbar-text)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        borderRadius: "4px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: "12px",
                    }}
                    title={theme === "dark" ? "Switch to light" : "Switch to dark"}
                >
                    {theme === "dark" ? "Light" : "Dark"}
                </button>
            </div>
            {/* hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                onChange={handleFileChange}
                style={{ display: "none" }}
            />
        </div>
    );
};
