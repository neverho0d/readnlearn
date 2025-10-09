import React, { useEffect, useState, useRef, useCallback } from "react";
import { SettingsProvider } from "./lib/settings/SettingsContext";
import { I18nProvider } from "./lib/i18n/I18nContext";
import { ThemeProvider } from "./lib/settings/ThemeContext";
import { LanguageSettings } from "./features/settings/LanguageSettings";
import { TextReader } from "./features/reader/TextReader";
import "./App.css";
import { useAppMode } from "./lib/state/appMode";
import { DictionaryView } from "./features/phrases/DictionaryView";
import { PHRASES_UPDATED_EVENT } from "./lib/db/phraseStore";

function App() {
    const [isLoading, setIsLoading] = useState(false);
    const [externalText, setExternalText] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<string | null>(null);
    const [restored, setRestored] = useState(false);

    useEffect(() => {
        document.title = "Read-n-Learn";
    }, []);

    // Attempt to restore last opened file on startup
    useEffect(() => {
        if (restored) return;
        setRestored(true);
        try {
            const lastName = localStorage.getItem("readnlearn-last-file-name");
            const lastPath = localStorage.getItem("readnlearn-last-file-path");
            const lastContent = localStorage.getItem("readnlearn-last-file-content");
            if (!lastName) return;

            const trySet = (text: string | null) => {
                if (text && text.length > 0) {
                    setExternalText(text);
                    setSourceFile(lastName);
                    localStorage.setItem("readnlearn-instructions-dismissed", "true");
                }
            };

            // If running under Tauri, try reading the file again from disk without importing
            const tauri = (window as unknown as { __TAURI__?: { fs?: { readTextFile?: unknown } } })
                .__TAURI__;
            const readTextFile = tauri?.fs?.readTextFile;
            if (lastPath && typeof readTextFile === "function") {
                // Defer to promise chain to avoid async in effect body
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (readTextFile as any)(lastPath)
                    .then((text: string) => {
                        trySet(text);
                    })
                    .catch(() => {
                        // ignore and do not restore
                    });
            } else if (lastContent && lastContent.length > 0) {
                // Fallback to stored content when path is unavailable
                trySet(lastContent);
            }
        } catch {
            // ignore
        }
    }, [restored]);

    const handlePhraseSelect = (phrase: string, context: string) => {
        // Placeholder for future DB save
        console.log("Selected phrase:", phrase);
        console.log("Context:", context);
    };

    const handleLoadSampleText = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 800);
    };

    const handleLoadFile = (text: string, filename?: string) => {
        setExternalText(text);
        setSourceFile(filename || null);
        // Also dismiss instructions so the new text shows without sample/intro
        localStorage.setItem("readnlearn-instructions-dismissed", "true");
        // Save last opened metadata for future restore (no stored content)
        try {
            if (filename) localStorage.setItem("readnlearn-last-file-name", filename);
        } catch {
            // ignore
        }
    };

    return (
        <SettingsProvider>
            <ThemeProvider>
                <I18nProvider>
                    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
                        <LanguageSettings isLoading={isLoading} onLoadFile={handleLoadFile} />
                        <MainContent
                            isLoading={isLoading}
                            externalText={externalText}
                            onLoadSampleText={handleLoadSampleText}
                            onPhraseSelect={handlePhraseSelect}
                            sourceFile={sourceFile}
                        />
                    </div>
                </I18nProvider>
            </ThemeProvider>
        </SettingsProvider>
    );
}

export default App;

function MainContent(props: {
    isLoading: boolean;
    externalText: string | null;
    onLoadSampleText: () => void;
    // eslint-disable-next-line no-unused-vars
    onPhraseSelect: (p: string, c: string) => void;
    sourceFile?: string | null;
}) {
    const { mode } = useAppMode();
    const { isLoading, externalText, onLoadSampleText, onPhraseSelect, sourceFile } = props;
    const [currentText, setCurrentText] = useState("");
    const [showAllPhrases, setShowAllPhrases] = useState(false);
    const [savedPhrases, setSavedPhrases] = useState<
        Array<{ id: string; text: string; position: number }>
    >([]);
    const [allPhrases, setAllPhrases] = useState<
        Array<{
            id: string;
            lang: string;
            text: string;
            translation?: string;
            context?: string;
            tags?: string[];
            addedAt: string;
            sourceFile?: string;
            contentHash?: string;
            lineNo?: number;
            colOffset?: number;
        }>
    >([]);

    // Load saved phrases using centralized phrase manager
    const loadSavedPhrases = React.useCallback(async () => {
        if (!currentText) {
            setSavedPhrases([]);
            return;
        }

        try {
            const { loadPhrasesForContent } = await import("./lib/phrases/phraseManager");
            const { generateContentHash } = await import("./lib/db/phraseStore");

            const phrases = await loadPhrasesForContent({
                content: currentText,
                sourceFile: sourceFile || undefined,
                contentHash: generateContentHash(currentText),
            });

            setSavedPhrases(phrases);
        } catch (error) {
            console.error("Error loading saved phrases:", error);
        }
    }, [currentText, sourceFile]);

    // Load all phrases for dictionary mode
    const loadAllPhrases = React.useCallback(async () => {
        try {
            const { loadAllPhrases: loadAllPhrasesFromStore } = await import(
                "./lib/db/phraseStore"
            );
            const phrases = await loadAllPhrasesFromStore();
            setAllPhrases(phrases);
        } catch (error) {
            console.error("Error loading all phrases:", error);
        }
    }, []);

    // One-time migration and phrase updates
    React.useEffect(() => {
        (async () => {
            try {
                const { migrateLocalStorageToSqlite } = await import("./lib/db/phraseStore");
                const res = await migrateLocalStorageToSqlite();
                if (res.moved > 0) {
                    void loadSavedPhrases();
                    void loadAllPhrases();
                }
            } catch (e) {
                console.error("Migration error:", e);
            }
        })();
        const handlePhraseUpdate = () => {
            void loadSavedPhrases();
            void loadAllPhrases();
        };

        window.addEventListener("readnlearn:phrases-updated", handlePhraseUpdate);
        return () => window.removeEventListener("readnlearn:phrases-updated", handlePhraseUpdate);
    }, [loadSavedPhrases, loadAllPhrases]);

    // Load saved phrases when currentText changes
    React.useEffect(() => {
        void loadSavedPhrases();
    }, [loadSavedPhrases]);

    // Load all phrases when switching to dictionary mode
    React.useEffect(() => {
        if (mode === "dictionary") {
            void loadAllPhrases();
        }
    }, [mode, loadAllPhrases]);

    // Listen for phrase updates
    React.useEffect(() => {
        const handler = () => {
            void loadSavedPhrases();
        };
        window.addEventListener(PHRASES_UPDATED_EVENT, handler);
        return () => window.removeEventListener(PHRASES_UPDATED_EVENT, handler);
    }, [loadSavedPhrases]);

    // Debug logging for currentText changes
    // React.useEffect(() => {
    //     if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") {
    //         console.log("Current text updated:", {
    //             length: currentText.length,
    //             preview: currentText.substring(0, 100) + (currentText.length > 100 ? "..." : ""),
    //             mode,
    //         });
    //     }
    // }, [currentText, mode]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [leftRatio, setLeftRatio] = useSplitRatio();
    const [phrasesCollapsed, setPhrasesCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem("readnlearn-phrases-collapsed") === "true";
        } catch {
            return false;
        }
    });
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            const el = containerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = Math.min(0.85, Math.max(0.25, x / rect.width));
            setLeftRatio(ratio);
        };
        const onUp = () => setDragging(false);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp, { once: true });
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [dragging, setLeftRatio]);

    // Persist collapsed state
    useEffect(() => {
        try {
            localStorage.setItem("readnlearn-phrases-collapsed", String(phrasesCollapsed));
        } catch {
            // ignore
        }
    }, [phrasesCollapsed]);

    // Ensure pane expands when a phrase jump is requested
    useEffect(() => {
        const onJump = (ev: Event) => {
            if (phrasesCollapsed) {
                setPhrasesCollapsed(false);
                // Re-dispatch after layout so the card can scroll/blink
                const original = ev as CustomEvent<any>;
                setTimeout(() => {
                    try {
                        const again = new CustomEvent("readnlearn:jump-to-phrase", {
                            detail: original.detail,
                        });
                        window.dispatchEvent(again);
                    } catch {
                        // ignore
                    }
                }, 150);
            }
        };
        window.addEventListener("readnlearn:jump-to-phrase", onJump as unknown as () => void);
        return () =>
            window.removeEventListener(
                "readnlearn:jump-to-phrase",
                onJump as unknown as () => void,
            );
    }, [phrasesCollapsed]);
    // Persist and restore scroll position of the left reader pane
    useEffect(() => {
        const el = containerRef.current?.querySelector(
            "div[style*='overflow: auto']",
        ) as HTMLElement | null;
        if (!el) return;
        const keyBase = sourceFile || (externalText ? String(externalText.length) : "");
        const key = `readnlearn-scroll-${keyBase}`;
        try {
            const raw = localStorage.getItem(key);
            const pos = raw ? parseInt(raw, 10) : NaN;
            if (!isNaN(pos)) el.scrollTop = pos;
        } catch {
            // ignore
        }
        const onScroll = () => {
            try {
                localStorage.setItem(key, String(el.scrollTop));
            } catch {
                // ignore
            }
        };
        el.addEventListener("scroll", onScroll);
        return () => el.removeEventListener("scroll", onScroll);
    }, [sourceFile, externalText]);

    return (
        <div style={{ paddingTop: "60px", padding: "80px 20px 20px 20px" }}>
            {mode === "reading" && (
                <div
                    style={{
                        display: "flex",
                        gap: "0px",
                        alignItems: "stretch",
                        maxWidth: "1400px",
                        margin: "0 auto",
                        height: "calc(100vh - 140px)",
                    }}
                    ref={containerRef}
                >
                    <div
                        style={{
                            flex: phrasesCollapsed ? 1 : leftRatio,
                            minWidth: 0,
                            height: "100%",
                            overflow: "auto",
                            paddingRight: 10,
                        }}
                    >
                        <TextReader
                            onPhraseSelect={onPhraseSelect}
                            onLoadSampleText={onLoadSampleText}
                            isLoading={isLoading}
                            content={externalText ?? ""}
                            onTextChange={setCurrentText}
                            sourceFile={sourceFile || undefined}
                            savedPhrases={savedPhrases}
                        />
                    </div>
                    <div
                        onMouseDown={() => setDragging(true)}
                        style={{
                            width: 8,
                            cursor: "col-resize",
                            backgroundColor: "transparent",
                            backgroundImage:
                                "radial-gradient(var(--border) 1px, transparent 1.5px)",
                            backgroundSize: "8px 8px",
                            backgroundRepeat: "repeat",
                            alignSelf: "stretch",
                            position: "relative",
                        }}
                        title="Drag to resize"
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setPhrasesCollapsed((s) => !s);
                            }}
                            title={phrasesCollapsed ? "Expand phrases" : "Collapse phrases"}
                            style={{
                                position: "absolute",
                                top: 6,
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: 16,
                                height: 16,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "none",
                                borderRadius: 4,
                                background: "transparent",
                                color: "var(--muted)",
                                cursor: "pointer",
                                padding: 0,
                            }}
                        >
                            {phrasesCollapsed ? "❮" : "❯"}
                        </button>
                    </div>
                    <div
                        style={{
                            flex: phrasesCollapsed ? 0 : 1 - leftRatio,
                            minWidth: phrasesCollapsed ? 0 : 280,
                            maxWidth: phrasesCollapsed ? 0 : 520,
                            background: "var(--bg)",
                            border: "none",
                            borderRadius: 0,
                            padding: phrasesCollapsed ? 0 : 12,
                            height: "100%",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                position: "sticky",
                                top: 80,
                                maxHeight: "calc(100vh - 160px)",
                                overflow: "auto",
                            }}
                        >
                            <DictionaryView
                                filterText={currentText}
                                showAllPhrases={false}
                                savedPhrases={savedPhrases}
                                forceEmptyWhenNoText
                            />
                        </div>
                    </div>
                </div>
            )}
            {mode === "dictionary" && (
                <DictionaryView
                    filterText={currentText}
                    showAllPhrases={showAllPhrases}
                    onToggleFilter={setShowAllPhrases}
                    savedPhrases={savedPhrases}
                    allPhrases={allPhrases}
                />
            )}
            {mode === "learning" && <div />}
        </div>
    );
}

function useSplitRatio() {
    const [ratioValue, setRatio] = useState<number>(() => {
        try {
            const raw = localStorage.getItem("readnlearn-split-ratio");
            const val = raw ? parseFloat(raw) : NaN;
            if (!isNaN(val) && val > 0.2 && val < 0.9) return val;
        } catch {
            // Ignore localStorage errors
        }
        return 0.66;
    });
    const set = useCallback((ratio: number) => {
        setRatio(ratio);
        try {
            localStorage.setItem("readnlearn-split-ratio", String(ratio));
        } catch {
            // Ignore localStorage errors
        }
    }, []);
    return [ratioValue, set] as const;
}
