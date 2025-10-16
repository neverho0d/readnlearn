/**
 * Main Application Component
 *
 * This is the root component of the ReadNLearn application, responsible for:
 * - Managing global application state and context providers
 * - Coordinating between different application modes (reading, dictionary, learning)
 * - Handling file loading and persistence
 * - Managing the two-pane layout with resizable splitter
 * - Coordinating phrase data flow between components
 *
 * Architecture:
 * - Uses React Context for global state management (settings, i18n, theme)
 * - Implements a provider pattern for dependency injection
 * - Manages application lifecycle and data persistence
 * - Coordinates cross-component communication via custom events
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { SettingsProvider } from "./lib/settings/SettingsContext";
import { I18nProvider } from "./lib/i18n/I18nContext";
import { ThemeProvider } from "./lib/settings/ThemeContext";
import { AuthProvider, useAuth } from "./lib/auth/AuthContext";
import { LanguageSettings } from "./features/settings/LanguageSettings";
import { TextReader } from "./features/reader/TextReader";
import "./App.css";
import { DictionaryView } from "./features/phrases/DictionaryView";
import { EnhancedDictionaryView } from "./features/phrases/EnhancedDictionaryView";
import { PHRASES_UPDATED_EVENT } from "./lib/db/phraseStore";
import { useAppMode } from "./lib/state/appMode";
import { generateContentHash } from "./lib/db/phraseStore";
import { AuthScreen } from "./features/auth/AuthScreen";
import { OAuthCallback } from "./features/auth/OAuthCallback";
import { detectFileFormat } from "./lib/utils/fileFormat";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";

/**
 * Main App Component
 *
 * State Management:
 * - isLoading: Controls loading states for file operations
 * - externalText: Content of the currently loaded file
 * - sourceFile: Name/path of the currently loaded file
 * - restored: Prevents multiple restoration attempts on startup
 */
function AppContent() {
    const { session, loading } = useAuth();

    // Show loading screen while checking authentication
    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100vh",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                }}
            >
                <div style={{ textAlign: "center" }}>
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            border: "4px solid var(--border)",
                            borderTop: "4px solid var(--primary)",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            margin: "0 auto 1rem",
                        }}
                    ></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    // Show authentication screen if not logged in
    if (!session) {
        return <AuthScreen />;
    }

    return <MainAppContent />;
}

function MainAppContent() {
    const mode = useAppMode((s) => s.mode);

    // Application state for file loading and content management
    const [isLoading, setIsLoading] = useState(false);
    const [externalText, setExternalText] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<string | null>(null);
    const [fileFormat, setFileFormat] = useState<"text" | "markdown">("text");
    const [restored, setRestored] = useState(false);

    // Startup overlay state to cover all UI preparations
    const [isStartupComplete, setIsStartupComplete] = useState(false);

    // Scroll-following state for phrase pane
    const [followText, setFollowText] = useState(() => {
        return localStorage.getItem("readnlearn-follow-text") === "true";
    });
    const [visiblePhrases, setVisiblePhrases] = useState<Set<string>>(new Set());

    // Saved phrases for the current content (reading mode)
    const [savedPhrases, setSavedPhrases] = useState<
        Array<{ id: string; text: string; position: number; formulaPosition?: number }>
    >([]);

    // Set application title on mount
    useEffect(() => {
        document.title = "Read-n-Learn";
    }, []);

    // Comprehensive startup sequence to cover all UI preparations
    useEffect(() => {
        let uiReadyCount = 0;
        const expectedEvents = 2; // TextReader + DictionaryView
        let startupTimeout: ReturnType<typeof setTimeout>;

        const handleUIReady = () => {
            uiReadyCount++;
            console.log(`UI Ready event received (${uiReadyCount}/${expectedEvents})`);

            if (uiReadyCount >= expectedEvents) {
                // All components are ready, but wait a bit more for final transformations
                setTimeout(() => {
                    // Final check: ensure all UI elements are properly rendered
                    const mainPane = document.querySelector(".main-pane");
                    const phrasePane = document.getElementById("phrase-pane-root");
                    const isMainPaneReady = mainPane && getComputedStyle(mainPane).opacity === "1";
                    const isPhrasePaneReady = phrasePane && phrasePane.children.length > 0;

                    if (isMainPaneReady && isPhrasePaneReady) {
                        console.log("All UI components ready, completing startup");
                        // Add 2 second delay before hiding overlay
                        setTimeout(() => {
                            clearTimeout(startupTimeout);
                            setIsStartupComplete(true);
                        }, 2000);
                    } else {
                        // If not ready, wait a bit more
                        setTimeout(() => {
                            console.log("Final UI check passed, completing startup");
                            // Add 2 second delay before hiding overlay
                            setTimeout(() => {
                                clearTimeout(startupTimeout);
                                setIsStartupComplete(true);
                            }, 2000);
                        }, 200);
                    }
                }, 100);
            }
        };

        // Listen for UI ready events
        window.addEventListener("readnlearn:ui-ready", handleUIReady);

        const startupSequence = async () => {
            // Step 1: Wait for initial app setup
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Step 2: Wait for content to be loaded and prepared
            if (externalText) {
                // Wait for phrases to be loaded
                await new Promise((resolve) => setTimeout(resolve, 200));

                // Wait for TextReader to prepare content
                await new Promise((resolve) => setTimeout(resolve, 300));
            }

            // Step 3: Wait for any follow text detection
            if (followText && savedPhrases.length > 0) {
                await new Promise((resolve) => setTimeout(resolve, 200));
            }

            // Step 4: Set a fallback timeout in case events don't fire
            startupTimeout = setTimeout(() => {
                console.log("Startup timeout reached, completing startup");
                setIsStartupComplete(true);
            }, 7000); // 7 second fallback (5 + 2) to allow for all transformations
        };

        startupSequence();

        // Cleanup event listener
        return () => {
            window.removeEventListener("readnlearn:ui-ready", handleUIReady);
            if (startupTimeout) {
                clearTimeout(startupTimeout);
            }
        };
    }, [externalText, followText, savedPhrases]);

    /**
     * Loads saved phrases for the current content
     * This function loads phrases that are associated with the current text content
     */
    const loadSavedPhrases = useCallback(async () => {
        console.log("🔄 loadSavedPhrases called", { externalTextLength: externalText?.length });
        if (!externalText) {
            console.log("❌ No external text, clearing phrases");
            setSavedPhrases([]);
            return;
        }

        try {
            const { loadPhrasesForContent } = await import("./lib/phrases/phraseManager");

            const contentHash = generateContentHash(externalText);
            console.log("🔍 Loading phrases for content:", {
                contentLength: externalText.length,
                sourceFile: sourceFile || "undefined",
                contentHash,
                contentPreview: externalText.substring(0, 100) + "...",
            });

            const phrases = await loadPhrasesForContent({
                content: externalText,
                sourceFile: sourceFile || undefined,
                contentHash,
            });

            console.log("📋 Loaded phrases for content:", phrases.length, "phrases");

            // Transform to expected format for TextReader
            const transformedPhrases = phrases.map((p) => ({
                id: p.id,
                text: p.text,
                position: p.position,
            }));

            console.log("🔄 Setting saved phrases:", transformedPhrases.length, "phrases");
            console.log(
                "📋 Phrases being passed to TextReader:",
                transformedPhrases.map((p) => ({
                    id: p.id,
                    text: p.text.substring(0, 50) + "...",
                    position: p.position,
                })),
            );
            setSavedPhrases(transformedPhrases);
        } catch (error) {
            console.error("Error loading saved phrases:", error);
            setSavedPhrases([]);
        }
    }, [externalText, sourceFile]);

    // Load saved phrases when content changes
    useEffect(() => {
        loadSavedPhrases();
    }, [loadSavedPhrases]);

    // Listen for phrase updates to refresh the phrase list
    useEffect(() => {
        const handlePhrasesUpdated = () => {
            console.log("🔄 PHRASES_UPDATED_EVENT received, reloading phrases...");
            // Add a small delay to ensure the database has been updated
            setTimeout(() => {
                loadSavedPhrases();
            }, 100);
        };

        console.log("🎧 Setting up PHRASES_UPDATED_EVENT listener");
        window.addEventListener(PHRASES_UPDATED_EVENT, handlePhrasesUpdated);
        return () => {
            console.log("🧹 Cleaning up PHRASES_UPDATED_EVENT listener");
            window.removeEventListener(PHRASES_UPDATED_EVENT, handlePhrasesUpdated);
        };
    }, [loadSavedPhrases]);

    /**
     * Detects which phrases are currently visible in the main text area
     * This function scans for phrase anchors and checks if they're in the viewport
     */
    // detectVisiblePhrases function moved to TextReader component

    // Phrase visibility detection is now handled by TextReader component

    // Update visible phrases when savedPhrases change (phrases are loaded/updated)
    // This is now handled by TextReader component

    // Re-establish detection after mode switches into reading
    useEffect(() => {
        if (mode !== "reading") {
            // Clear when leaving reading mode
            setVisiblePhrases(new Set());
        }
    }, [mode]);

    /**
     * Handles the follow text toggle
     * Persists the setting to localStorage and updates the state
     */
    const handleFollowTextToggle = useCallback((checked: boolean) => {
        setFollowText(checked);
        localStorage.setItem("readnlearn-follow-text", checked.toString());
    }, []);

    /**
     * File Restoration on Startup
     *
     * Attempts to restore the last opened file when the application starts.
     * Uses a multi-tier approach:
     * 1. Try to read the file from disk using Tauri's file system API
     * 2. Fall back to stored content if file path is unavailable
     * 3. Gracefully handle errors and continue without restoration
     *
     * This ensures users can continue where they left off, improving UX.
     */
    useEffect(() => {
        if (restored) return;
        setRestored(true);
        try {
            const lastName = localStorage.getItem("readnlearn-last-file-name");
            const lastPath = localStorage.getItem("readnlearn-last-file-path");
            const lastContent = localStorage.getItem("readnlearn-last-file-content");
            const lastFormat = localStorage.getItem("readnlearn-last-file-format") as
                | "text"
                | "markdown"
                | null;

            if (!lastName) {
                // Check if we have content but no filename - this might be a restoration issue
                if (lastContent && lastContent.length > 0) {
                    const fallbackName = "restored-file.txt";
                    setExternalText(lastContent);
                    setSourceFile(fallbackName);
                    setFileFormat("text");
                    localStorage.setItem("readnlearn-instructions-dismissed", "true");
                }
                return;
            }

            const trySet = (text: string | null) => {
                if (text && text.length > 0) {
                    setExternalText(text);
                    setSourceFile(lastName);
                    setFileFormat(lastFormat || "text");
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

    /**
     * Event Handlers
     *
     * These functions handle user interactions and file operations.
     * They coordinate between the UI components and the application state.
     */

    /**
     * Handles phrase selection from the text reader
     * Currently a placeholder for future phrase saving functionality
     * @param phrase - The selected text phrase
     * @param context - The surrounding context of the phrase
     */
    const handlePhraseSelect = (phrase: string, context: string) => {
        // Placeholder for future DB save
        console.log("Selected phrase:", phrase);
        console.log("Context:", context);
    };

    /**
     * Handles loading sample text with a loading state
     * Simulates async operation with a timeout
     */
    const handleLoadSampleText = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 800);
    };

    /**
     * Handles loading external files
     * Updates application state and persists file information for restoration
     * @param text - The content of the loaded file
     * @param filename - Optional filename for the loaded file
     */
    const handleLoadFile = (text: string, filename?: string) => {
        setExternalText(text);
        setSourceFile(filename || null);

        // Detect file format
        if (filename) {
            const format = detectFileFormat(filename, text);
            setFileFormat(format);
            localStorage.setItem("readnlearn-last-file-format", format);
        } else {
            setFileFormat("text");
        }

        // Also dismiss instructions so the new text shows without sample/intro
        localStorage.setItem("readnlearn-instructions-dismissed", "true");
        // Save last opened metadata for future restore (no stored content)
        try {
            if (filename) localStorage.setItem("readnlearn-last-file-name", filename);
        } catch {
            // ignore
        }
    };

    /**
     * Handles closing the current file
     * Clears the loaded file and resets to initial state
     */
    const handleCloseFile = () => {
        setExternalText(null);
        setSourceFile(null);
        setFileFormat("text");
        // Clear saved phrases for the closed file
        setSavedPhrases([]);
        // Clear scroll position
        localStorage.removeItem("readnlearn-scroll-position");
        // Clear last file name and format
        localStorage.removeItem("readnlearn-last-file-name");
        localStorage.removeItem("readnlearn-last-file-format");
    };

    return (
        <SettingsProvider>
            <ThemeProvider>
                <I18nProvider>
                    <div
                        style={{
                            minHeight: "100vh",
                            backgroundColor: "var(--bg)",
                            position: "relative",
                        }}
                    >
                        {/* Top-right settings (provider keys) */}
                        <ProviderSettingsButton />
                        {/* Startup Overlay */}
                        {!isStartupComplete && (
                            <div
                                style={{
                                    position: "fixed",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: "var(--overlay-bg)",
                                    zIndex: 99999,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "16px",
                                    width: "100vw",
                                    height: "100vh",
                                    margin: 0,
                                    padding: 0,
                                    border: "none",
                                    outline: "none",
                                }}
                            >
                                <style>
                                    {`
                                        @keyframes spin {
                                            0% { transform: rotate(0deg); }
                                            100% { transform: rotate(360deg); }
                                        }
                                    `}
                                </style>
                                <div
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        border: "4px solid var(--border)",
                                        borderTop: "4px solid var(--primary)",
                                        borderRadius: "50%",
                                        animation: "spin 1s linear infinite",
                                    }}
                                />
                                <div
                                    style={{
                                        color: "var(--overlay-text)",
                                        fontSize: "14px",
                                        textAlign: "center",
                                    }}
                                >
                                    Preparing application...
                                </div>
                            </div>
                        )}
                        <LanguageSettings
                            isLoading={isLoading}
                            onLoadFile={handleLoadFile}
                            sourceFile={sourceFile || undefined}
                            currentText={externalText || ""}
                        />
                        <MainContent
                            isLoading={isLoading}
                            externalText={externalText}
                            onLoadSampleText={handleLoadSampleText}
                            onPhraseSelect={handlePhraseSelect}
                            sourceFile={sourceFile || undefined}
                            fileFormat={fileFormat}
                            followText={followText}
                            visiblePhrases={visiblePhrases}
                            onFollowTextToggle={handleFollowTextToggle}
                            setVisiblePhrases={setVisiblePhrases}
                            savedPhrases={savedPhrases}
                            setSavedPhrases={setSavedPhrases}
                        />
                    </div>
                </I18nProvider>
            </ThemeProvider>
        </SettingsProvider>
    );
}

/**
 * MainContent Component
 *
 * This component manages the main application content and layout.
 * It handles:
 * - Application mode switching (reading, dictionary, learning)
 * - Two-pane layout with resizable splitter
 * - Phrase data management and synchronization
 * - Scroll position persistence
 * - Collapsible phrase pane functionality
 *
 * Props:
 * - isLoading: Loading state for file operations
 * - externalText: Content of the currently loaded file
 * - onLoadSampleText: Handler for loading sample text
 * - onPhraseSelect: Handler for phrase selection events
 * - sourceFile: Name/path of the currently loaded file
 */
function MainContent(props: {
    isLoading: boolean;
    externalText: string | null;
    onLoadSampleText: () => void;
    // eslint-disable-next-line no-unused-vars
    onPhraseSelect: (p: string, c: string) => void;
    sourceFile?: string | null;
    fileFormat: "text" | "markdown";
    followText: boolean;
    visiblePhrases: Set<string>;
    // eslint-disable-next-line no-unused-vars
    onFollowTextToggle: (enabled: boolean) => void;

    setVisiblePhrases: React.Dispatch<React.SetStateAction<Set<string>>>;
    savedPhrases: Array<{ id: string; text: string; position: number; formulaPosition?: number }>;
    setSavedPhrases: React.Dispatch<
        React.SetStateAction<
            Array<{ id: string; text: string; position: number; formulaPosition?: number }>
        >
    >;
}) {
    const mode = useAppMode((s) => s.mode);
    const {
        isLoading,
        externalText,
        onLoadSampleText,
        onPhraseSelect,
        sourceFile,
        fileFormat,
        followText,
        visiblePhrases,
        onFollowTextToggle,
        setVisiblePhrases,
        savedPhrases,
        setSavedPhrases,
    } = props;

    // State for text content and phrase management
    const [currentText, setCurrentText] = useState("");

    // Split pane state
    const [phrasesCollapsed, setPhrasesCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem("readnlearn-phrases-collapsed") === "true";
        } catch {
            return false;
        }
    });
    const [dragging, setDragging] = useState(false);

    /**
     * Handles the follow text toggle
     * Persists the setting to localStorage and updates the state
     */
    const handleFollowTextToggle = useCallback(
        (checked: boolean) => {
            onFollowTextToggle(checked);
        },
        [onFollowTextToggle],
    );

    /**
     * Phrase Loading Functions
     *
     * These functions handle loading phrases from the database.
     * They use dynamic imports to avoid circular dependencies and
     * implement proper error handling for database operations.
     */

    /**
     * Loads phrases for the current content (reading mode)
     * Uses content hash to match phrases to the current text
     * Clears phrases when no text is loaded
     */
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

    /**
     * Loads all phrases across all files (dictionary mode)
     * Used when switching to dictionary mode to show all saved phrases
     */
    const loadAllPhrases = React.useCallback(async () => {
        try {
            // Load all phrases for dictionary mode
            const { loadAllPhrases: loadAllPhrasesFromStore } = await import(
                "./lib/db/phraseStore"
            );
            await loadAllPhrasesFromStore();
        } catch (error) {
            console.error("Error loading all phrases:", error);
        }
    }, []);

    // One-time migration and phrase updates
    React.useEffect(() => {
        // Migration removed - using pure SQLite database
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
                const original = ev as CustomEvent<{ marker: string }>;
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
    // Scroll position is now handled by TextReader component

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
                            fileFormat={fileFormat}
                            savedPhrases={savedPhrases}
                            followText={followText}
                            onVisiblePhrasesChange={setVisiblePhrases}
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
                            className="icon-button"
                        >
                            <svg
                                aria-hidden="true"
                                focusable="false"
                                width="12"
                                height="12"
                                viewBox="0 0 320 512"
                                style={{ display: phrasesCollapsed ? "none" : "block" }}
                            >Diego turned off the highway onto the road that led between the fields of almond trees
                                <path
                                    fill="currentColor"
                                    d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"
                                />
                            </svg>
                            <svg
                                aria-hidden="true"
                                focusable="false"
                                width="12"
                                height="12"
                                viewBox="0 0 320 512"
                                style={{ display: phrasesCollapsed ? "block" : "none" }}
                            >
                                <path
                                    fill="currentColor"
                                    d="M41.4 278.6c-12.5-12.5-12.5-32.8 0-45.3l160-160c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3L109.3 256 246.6 393.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0l-160-160z"
                                />
                            </svg>
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
                                followText={followText}
                                visiblePhrases={visiblePhrases}
                                onFollowTextToggle={handleFollowTextToggle}
                            />
                        </div>
                    </div>
                </div>
            )}
            {mode === "dictionary" && (
                <EnhancedDictionaryView
                    sourceFile={sourceFile}
                    hasCurrentFile={!!currentText}
                    cachedPhrases={savedPhrases}
                />
            )}
            {mode === "learning" && <div />}
        </div>
    );
}

/**
 * useSplitRatio Hook
 *
 * Custom hook for managing the split ratio between the main pane and phrase pane.
 *
 * Features:
 * - Persists ratio to localStorage for restoration across sessions
 * - Validates ratio values to prevent invalid layouts
 * - Gracefully handles localStorage errors
 * - Returns a tuple of [currentRatio, setRatio] for easy destructuring
 *
 * @returns [ratioValue, setRatio] - Current ratio and setter function
 */
function useSplitRatio() {
    // Initialize ratio from localStorage with validation
    const [ratioValue, setRatio] = useState<number>(() => {
        try {
            const raw = localStorage.getItem("readnlearn-split-ratio");
            const val = raw ? parseFloat(raw) : NaN;
            if (!isNaN(val) && val > 0.2 && val < 0.9) return val;
        } catch {
            // Ignore localStorage errors
        }
        return 0.66; // Default ratio (66% main pane, 34% phrase pane)
    });

    // Setter function that persists to localStorage
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

/**
 * Main App Component with Providers
 *
 * Wraps the application with all necessary context providers.
 */
function App() {
    // Check if we're on the OAuth callback route before rendering providers
    const isOAuthCallback = window.location.pathname === "/auth/callback";

    if (isOAuthCallback) {
        return <OAuthCallback />;
    }

    return (
        <AuthProvider>
            <SettingsProvider>
                <ThemeProvider>
                    <I18nProvider>
                        <AppContent />
                    </I18nProvider>
                </ThemeProvider>
            </SettingsProvider>
        </AuthProvider>
    );
}

/** Provider Settings Button and Dialog **/
function ProviderSettingsButton() {
    const [open, setOpen] = React.useState(false);
    return (
        <div style={{ position: "fixed", top: 8, right: 8, zIndex: 1000 }} title="Settings">
            <button
                className="icon-button"
                onClick={() => setOpen(true)}
                aria-label="Open settings"
                style={{ color: "var(--topbar-text)" }}
            >
                <FontAwesomeIcon icon={faCog} size="lg" />
            </button>
            {open && <ProviderSettingsDialog onClose={() => setOpen(false)} />}
        </div>
    );
}

function ProviderSettingsDialog({ onClose }: { onClose: () => void }) {
    const { settings, updateSettings } = require("./lib/settings/SettingsContext").useSettings();
    const [form, setForm] = React.useState({
        openaiApiKey: settings.openaiApiKey || "",
        openaiBaseUrl: settings.openaiBaseUrl || "",
        deeplApiKey: settings.deeplApiKey || "",
        deeplBaseUrl: settings.deeplBaseUrl || "",
        googleApiKey: settings.googleApiKey || "",
        googleBaseUrl: settings.googleBaseUrl || "",
    });

    const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((p) => ({ ...p, [k]: e.target.value }));

    const onSave = () => {
        updateSettings({
            openaiApiKey: form.openaiApiKey || undefined,
            openaiBaseUrl: form.openaiBaseUrl || undefined,
            deeplApiKey: form.deeplApiKey || undefined,
            deeplBaseUrl: form.deeplBaseUrl || undefined,
            googleApiKey: form.googleApiKey || undefined,
            googleBaseUrl: form.googleBaseUrl || undefined,
        });
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
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1001,
            }}
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "var(--panel)",
                    color: "var(--text)",
                    padding: 16,
                    borderRadius: 8,
                    minWidth: 420,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
                }}
            >
                <h3 style={{ margin: "0 0 12px 0" }}>Provider Settings</h3>
                <div style={{ display: "grid", gap: 8 }}>
                    <label>
                        OpenAI API Key
                        <input
                            type="password"
                            value={form.openaiApiKey}
                            onChange={update("openaiApiKey")}
                            style={{ width: "100%" }}
                        />
                    </label>
                    <label>
                        OpenAI Base URL (optional)
                        <input
                            type="text"
                            value={form.openaiBaseUrl}
                            onChange={update("openaiBaseUrl")}
                            style={{ width: "100%" }}
                        />
                    </label>
                    <label>
                        DeepL API Key
                        <input
                            type="password"
                            value={form.deeplApiKey}
                            onChange={update("deeplApiKey")}
                            style={{ width: "100%" }}
                        />
                    </label>
                    <label>
                        DeepL Base URL (optional)
                        <input
                            type="text"
                            value={form.deeplBaseUrl}
                            onChange={update("deeplBaseUrl")}
                            style={{ width: "100%" }}
                        />
                    </label>
                    <label>
                        Google API Key
                        <input
                            type="password"
                            value={form.googleApiKey}
                            onChange={update("googleApiKey")}
                            style={{ width: "100%" }}
                        />
                    </label>
                    <label>
                        Google Base URL (optional)
                        <input
                            type="text"
                            value={form.googleBaseUrl}
                            onChange={update("googleBaseUrl")}
                            style={{ width: "100%" }}
                        />
                    </label>
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={onSave}>Save</button>
                </div>
            </div>
        </div>
    );
}

export default App;
