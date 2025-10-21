import React, { useRef } from "react";
import { useSettings, LANGUAGES, LEARNING_DIFFICULTIES } from "../../lib/settings/SettingsContext";
import { useI18n } from "../../lib/i18n/I18nContext";
import "./LanguageSettings.css";
import { useTheme } from "../../lib/settings/ThemeContext";
import { useAppMode } from "../../lib/state/appMode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen, faBook, faGraduationCap, faCog } from "@fortawesome/free-solid-svg-icons";
import { useLanguageDetection } from "../../lib/hooks/useLanguageDetection";
import { ProviderSettingsDialog } from "./ProviderSettingsDialog";
import ThemedSelect from "../../components/ui/Select";

interface LanguageSettingsProps {
    isLoading?: boolean;
    // eslint-disable-next-line no-unused-vars
    onLoadFile?: (text: string, filename?: string) => void;
    sourceFile?: string;
    currentText?: string; // Current text content for language detection
}

export const LanguageSettings: React.FC<LanguageSettingsProps> = ({
    isLoading = false,
    onLoadFile,
    sourceFile,
    currentText,
}) => {
    const { settings, updateSettings, getLanguageName } = useSettings();
    const { t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { theme, toggleTheme } = useTheme();
    const { mode, setMode } = useAppMode();
    const {
        isDetecting,
        detectedLanguage,
        detectionError,
        detectTextLanguage,
        getL2DisplayName,
        isDetectionAvailable,
    } = useLanguageDetection();

    const [showProviderSettings, setShowProviderSettings] = React.useState(false);
    const [showDifficultiesDialog, setShowDifficultiesDialog] = React.useState(false);

    // Trigger language detection for existing text when component mounts
    React.useEffect(() => {
        if (currentText && settings.l2AutoDetect && isDetectionAvailable()) {
            detectTextLanguage(currentText);
        }
    }, [currentText, settings.l2AutoDetect]); // Removed detectTextLanguage and isDetectionAvailable from dependencies

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

            // Trigger language detection if L2 is set to auto
            if (settings.l2AutoDetect && text.trim() && isDetectionAvailable()) {
                // Use setTimeout to avoid blocking the UI
                setTimeout(() => {
                    detectTextLanguage(text);
                }, 100);
            }

            // Persist last opened file path and name (for Tauri restore); no content
            try {
                const anyFile = file as unknown as { path?: string };
                if (anyFile.path) {
                    localStorage.setItem("readnlearn-last-file-path", anyFile.path);
                } else {
                    console.warn("No file system path available (browser environment)", {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                    });
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
                borderBottom: "1px solid var(--border-color)",
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
                            backgroundColor:
                                mode === "reading" ? "var(--tab-active-bg)" : "transparent",
                            color:
                                mode === "reading"
                                    ? "var(--tab-active-text)"
                                    : "var(--topbar-text)",
                            border: "1px solid var(--tab-active-bg)",
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
                        <span>{t.reading}</span>
                    </button>

                    {/* Dictionary Mode Button */}
                    <button
                        onClick={() => setMode("dictionary")}
                        style={{
                            backgroundColor:
                                mode === "dictionary" ? "var(--tab-active-bg)" : "transparent",
                            color:
                                mode === "dictionary"
                                    ? "var(--tab-active-text)"
                                    : "var(--topbar-text)",
                            border: "1px solid var(--tab-active-bg)",
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
                        <span>{t.dictionary}</span>
                    </button>

                    {/* Learning Mode Button */}
                    <button
                        onClick={() => setMode("learning")}
                        style={{
                            backgroundColor:
                                mode === "learning" ? "var(--tab-active-bg)" : "transparent",
                            color:
                                mode === "learning"
                                    ? "var(--tab-active-text)"
                                    : "var(--topbar-text)",
                            border: "1px solid var(--tab-active-bg)",
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
                        <span>{t.learning}</span>
                    </button>
                </div>
            </div>

            {/* Right section: languages + font + actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Font selector */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ color: "var(--text-secondary)", fontSize: 12 }}>Font</label>
                    <ThemedSelect
                        value={settings.font}
                        onChange={(v) => updateSettings({ font: v })}
                        options={[
                            {
                                label: "Inter",
                                value: "InterVarLocal, Inter, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, sans-serif",
                            },
                            {
                                label: "Noto Sans",
                                value: "NotoSansLocal, Noto Sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
                            },
                            {
                                label: "Source Serif Pro",
                                value: "SourceSerifLocal, Source Serif Pro, Georgia, Cambria, Times New Roman, Times, serif",
                            },
                            {
                                label: "Merriweather",
                                value: "MerriweatherLocal, Merriweather, Georgia, Cambria, Times New Roman, Times, serif",
                            },
                        ]}
                        buttonWidthPx={170}
                        title="Reader font"
                    />
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
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "transparent",
                            padding: "4px 8px",
                            cursor: "pointer",
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowL2Menu((s) => !s);
                            setShowL1Menu(false);
                        }}
                        title={`${t.l1Label} → ${t.l2Label}`}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowL1Menu((s) => !s);
                                setShowL2Menu(false);
                            }}
                            className="lang-indicator-button"
                            title={t.l1Label}
                        >
                            {getLanguageName(settings.l1)}
                        </button>
                        <span style={{ color: "var(--text-secondary)" }}>→</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowL2Menu((s) => !s);
                                setShowL1Menu(false);
                            }}
                            className="lang-indicator-button"
                            title={t.l2Label}
                        >
                            {isDetecting ? (
                                <>
                                    <div
                                        style={{
                                            width: "8px",
                                            height: "8px",
                                            border: "1px solid currentColor",
                                            borderTop: "1px solid transparent",
                                            borderRadius: "50%",
                                            animation: "spin 1s linear infinite",
                                        }}
                                    />
                                    {t.detecting}
                                </>
                            ) : (
                                getL2DisplayName()
                            )}
                        </button>
                    </div>

                    {showL1Menu && (
                        <div
                            className="lang-menu"
                            style={{
                                position: "absolute",
                                top: 30,
                                left: 0,
                                background: "var(--dropdown-bg)",
                                border: "1px solid var(--dropdown-border)",
                                borderRadius: 6,
                                padding: 6,
                                maxHeight: 260,
                                overflow: "auto",
                                boxShadow: `0 6px 18px var(--dropdown-shadow)`,
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
                                    className="lang-menu-option"
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        textAlign: "left",
                                        background: "transparent",
                                        color: "var(--text-primary)",
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
                                left: 0,
                                background: "var(--dropdown-bg)",
                                border: "1px solid var(--dropdown-border)",
                                borderRadius: 6,
                                padding: 6,
                                maxHeight: 260,
                                overflow: "auto",
                                boxShadow: `0 6px 18px var(--dropdown-shadow)`,
                                zIndex: 2000,
                                minWidth: 200,
                            }}
                        >
                            <button
                                onClick={() => {
                                    updateSettings({ l2AutoDetect: true });
                                    closeMenus();
                                }}
                                className="lang-menu-option"
                                style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    background: "transparent",
                                    color: "var(--text-primary)",
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
                                    className="lang-menu-option"
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        textAlign: "left",
                                        background: "transparent",
                                        color: "var(--text-primary)",
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
                            backgroundColor: isLoading ? "var(--tab-active-bg)" : "var(--primary)",
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

                {/* Learning preferences */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ color: "var(--text-secondary)", fontSize: 12 }}>Level</label>
                    <ThemedSelect
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        value={settings.userLevel as any}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onChange={(v) => updateSettings({ userLevel: v as any })}
                        options={[
                            { label: "A1 (Beginner)", value: "A1" },
                            { label: "A2 (Elementary)", value: "A2" },
                            { label: "B1 (Intermediate)", value: "B1" },
                            { label: "B2 (Upper Intermediate)", value: "B2" },
                            { label: "C1 (Advanced)", value: "C1" },
                            { label: "C2 (Proficient)", value: "C2" },
                        ]}
                        buttonWidthPx={160}
                        title="Your comprehension level"
                    />
                </div>

                {/* Theme switch */}
                <button
                    onClick={toggleTheme}
                    style={{
                        backgroundColor: "transparent",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: "12px",
                        transition: "background-color 0.2s ease",
                    }}
                    title={theme === "dark" ? "Switch to light" : "Switch to dark"}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                >
                    {theme === "dark" ? t.light : t.dark}
                </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Difficulties button */}
                <button
                    onClick={() => setShowDifficultiesDialog(true)}
                    style={{
                        backgroundColor: "transparent",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: "12px",
                        transition: "background-color 0.2s ease",
                    }}
                    title="Learning difficulties"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                >
                    Difficulties
                </button>

                <button
                    className="icon-button"
                    title="Provider settings"
                    onClick={() => setShowProviderSettings(true)}
                    aria-label="Provider settings"
                >
                    <FontAwesomeIcon icon={faCog} />
                </button>
                {showProviderSettings && (
                    <ProviderSettingsDialog onClose={() => setShowProviderSettings(false)} />
                )}
                {showDifficultiesDialog && (
                    <DifficultiesDialog
                        onClose={() => setShowDifficultiesDialog(false)}
                        difficulties={settings.userDifficulties}
                        onUpdate={(difficulties) =>
                            updateSettings({ userDifficulties: difficulties })
                        }
                    />
                )}
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

// Difficulties Dialog Component
interface DifficultiesDialogProps {
    onClose: () => void;
    difficulties: string[];
    // eslint-disable-next-line no-unused-vars
    onUpdate: (difficulties: string[]) => void;
}

const DifficultiesDialog: React.FC<DifficultiesDialogProps> = ({
    onClose,
    difficulties,
    onUpdate,
}) => {
    const [selectedDifficulties, setSelectedDifficulties] = React.useState<string[]>(difficulties);

    const handleToggle = (difficulty: string) => {
        setSelectedDifficulties((prev) =>
            prev.includes(difficulty)
                ? prev.filter((d) => d !== difficulty)
                : [...prev, difficulty],
        );
    };

    const handleSave = () => {
        onUpdate(selectedDifficulties);
        onClose();
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "var(--overlay-bg)",
                zIndex: 3000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: "var(--panel)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "24px",
                    maxWidth: "600px",
                    maxHeight: "80vh",
                    overflow: "auto",
                    boxShadow: `0 10px 25px var(--dropdown-shadow)`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ margin: "0 0 16px 0", color: "var(--text)" }}>
                    Learning Difficulties
                </h3>
                <p
                    style={{
                        margin: "0 0 20px 0",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                    }}
                >
                    Select the areas where you typically have difficulties. This helps provide more
                    targeted explanations.
                </p>

                <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
                    {LEARNING_DIFFICULTIES.map((difficulty) => (
                        <label
                            key={difficulty.label}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                padding: "8px",
                                borderRadius: "4px",
                                backgroundColor: selectedDifficulties.includes(difficulty.label)
                                    ? "var(--primary-light)"
                                    : "transparent",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selectedDifficulties.includes(difficulty.label)}
                                onChange={() => handleToggle(difficulty.label)}
                                style={{ margin: 0 }}
                            />
                            <span style={{ color: "var(--text)", fontSize: "14px" }}>
                                {difficulty.label}
                                <div
                                    style={{
                                        color: "var(--muted)",
                                        fontSize: "12px",
                                        marginTop: 2,
                                    }}
                                >
                                    {difficulty.note}
                                </div>
                            </span>
                        </label>
                    ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "transparent",
                            color: "var(--text)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-contrast)",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
