import React, { useRef } from "react";
import { useSettings, LANGUAGES } from "../../lib/settings/SettingsContext";
import { useI18n } from "../../lib/i18n/I18nContext";
import "./LanguageSettings.css";
import { useTheme } from "../../lib/settings/ThemeContext";
import { useAppMode } from "../../lib/state/appMode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen, faBook, faGraduationCap } from "@fortawesome/free-solid-svg-icons";

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

    const [showL1Menu, setShowL1Menu] = React.useState(false);
    const [showL2Menu, setShowL2Menu] = React.useState(false);

    const closeMenus = () => {
        setShowL1Menu(false);
        setShowL2Menu(false);
    };

    React.useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target?.closest?.(".lang-indicator") && !target?.closest?.(".lang-menu")) {
                closeMenus();
            }
        };
        window.addEventListener("click", onDocClick);
        return () => window.removeEventListener("click", onDocClick);
    }, []);

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
            {/* Removed old controls; using compact indicator only */}

            {/* Left section: mode switch */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {/* Reading Mode Button */}
                    <button
                        onClick={() => setMode("reading")}
                        style={{
                            backgroundColor: mode === "reading" ? "#4a5568" : "transparent",
                            color: mode === "reading" ? "#ffffff" : "#a0aec0",
                            border: "1px solid #4a5568",
                            borderRadius: 4,
                            padding: "6px 8px",
                            fontSize: 12,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            transition: "all 0.2s ease",
                        }}
                        title="Reading Mode"
                    >
                        <FontAwesomeIcon icon={faBookOpen} />
                        <span>Reading</span>
                    </button>

                    {/* Dictionary Mode Button */}
                    <button
                        onClick={() => setMode("dictionary")}
                        style={{
                            backgroundColor: mode === "dictionary" ? "#4a5568" : "transparent",
                            color: mode === "dictionary" ? "#ffffff" : "#a0aec0",
                            border: "1px solid #4a5568",
                            borderRadius: 4,
                            padding: "6px 8px",
                            fontSize: 12,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            transition: "all 0.2s ease",
                        }}
                        title="Dictionary Mode"
                    >
                        <FontAwesomeIcon icon={faBook} />
                        <span>Dictionary</span>
                    </button>

                    {/* Learning Mode Button */}
                    <button
                        onClick={() => setMode("learning")}
                        style={{
                            backgroundColor: mode === "learning" ? "#4a5568" : "transparent",
                            color: mode === "learning" ? "#ffffff" : "#a0aec0",
                            border: "1px solid #4a5568",
                            borderRadius: 4,
                            padding: "6px 8px",
                            fontSize: 12,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            transition: "all 0.2s ease",
                        }}
                        title="Learning Mode"
                    >
                        <FontAwesomeIcon icon={faGraduationCap} />
                        <span>Learning</span>
                    </button>
                </div>
            </div>

            {/* Right section: languages + font + actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Font selector */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ color: "#a0aec0", fontSize: 12 }}>Font</label>
                    <select
                        value={settings.font}
                        onChange={(e) => updateSettings({ font: e.target.value })}
                        style={{
                            background: "#1f2937",
                            color: "#e5e7eb",
                            border: "1px solid #374151",
                            borderRadius: 4,
                            padding: "4px 8px",
                            fontSize: 12,
                        }}
                        title="Reader font"
                    >
                        <option value="InterVarLocal, Inter, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, sans-serif">
                            Inter
                        </option>
                        <option value="NotoSansLocal, Noto Sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif">
                            Noto Sans
                        </option>
                        <option value="SourceSerifLocal, Source Serif Pro, Georgia, Cambria, Times New Roman, Times, serif">
                            Source Serif Pro
                        </option>
                        <option value="MerriweatherLocal, Merriweather, Georgia, Cambria, Times New Roman, Times, serif">
                            Merriweather
                        </option>
                    </select>
                </div>

                {/* Font size control */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                        title="Smaller (A-)"
                        onClick={() =>
                            updateSettings({ fontSize: Math.max(12, settings.fontSize - 1) })
                        }
                        style={{
                            background: "transparent",
                            color: "var(--topbar-text)",
                            border: "none",
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontSize: 12,
                            cursor: "pointer",
                        }}
                    >
                        A-
                    </button>
                    <button
                        title="Larger (A+)"
                        onClick={() =>
                            updateSettings({ fontSize: Math.min(22, settings.fontSize + 1) })
                        }
                        style={{
                            background: "transparent",
                            color: "var(--topbar-text)",
                            border: "none",
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontSize: 12,
                            cursor: "pointer",
                        }}
                    >
                        A+
                    </button>
                </div>
                {/* Compact clickable indicator */}
                <div className="lang-indicator" style={{ position: "relative" }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowL1Menu((s) => !s);
                            setShowL2Menu(false);
                        }}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--topbar-text)",
                            cursor: "pointer",
                            padding: "4px 8px",
                            fontSize: 12,
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "transparent")
                        }
                        title={t.l1Label}
                    >
                        {getLanguageName(settings.l1)}
                    </button>
                    <span style={{ color: "#a0aec0", marginRight: 6, marginLeft: 2 }}>→</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowL2Menu((s) => !s);
                            setShowL1Menu(false);
                        }}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--topbar-text)",
                            cursor: "pointer",
                            padding: "4px 8px",
                            fontSize: 12,
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "transparent")
                        }
                        title={t.l2Label}
                    >
                        {settings.l2AutoDetect ? "Auto" : getLanguageName(settings.l2)}
                    </button>

                    {showL1Menu && (
                        <div
                            className="lang-menu"
                            style={{
                                position: "absolute",
                                top: 30,
                                left: 0,
                                background: "#1f2937",
                                border: "1px solid #374151",
                                borderRadius: 6,
                                padding: 6,
                                maxHeight: 260,
                                overflow: "auto",
                                boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                                zIndex: 2000,
                                minWidth: 180,
                            }}
                        >
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={`l1-${lang.code}`}
                                    onClick={() => {
                                        updateSettings({ l1: lang.code });
                                        closeMenus();
                                    }}
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        textAlign: "left",
                                        background: "transparent",
                                        border: "none",
                                        color: "#e5e7eb",
                                        padding: "6px 8px",
                                        cursor: "pointer",
                                    }}
                                >
                                    {lang.nativeName}
                                </button>
                            ))}
                        </div>
                    )}

                    {showL2Menu && (
                        <div
                            className="lang-menu"
                            style={{
                                position: "absolute",
                                top: 30,
                                left: 120,
                                background: "#1f2937",
                                border: "1px solid #374151",
                                borderRadius: 6,
                                padding: 6,
                                maxHeight: 260,
                                overflow: "auto",
                                boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                                zIndex: 2000,
                                minWidth: 200,
                            }}
                        >
                            <button
                                onClick={() => {
                                    updateSettings({ l2AutoDetect: true });
                                    closeMenus();
                                }}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    background: "transparent",
                                    border: "none",
                                    color: "#e5e7eb",
                                    padding: "6px 8px",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                }}
                            >
                                Auto
                            </button>
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={`l2-${lang.code}`}
                                    onClick={() => {
                                        updateSettings({ l2AutoDetect: false, l2: lang.code });
                                        closeMenus();
                                    }}
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        textAlign: "left",
                                        background: "transparent",
                                        border: "none",
                                        color: "#e5e7eb",
                                        padding: "6px 8px",
                                        cursor: "pointer",
                                    }}
                                >
                                    {lang.nativeName}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
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
