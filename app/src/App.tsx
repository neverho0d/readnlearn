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
import { LanguageSettings } from "./features/settings/LanguageSettings";
import { TextReader } from "./features/reader/TextReader";
import "./App.css";
import { useAppMode } from "./lib/state/appMode";
import { DictionaryView } from "./features/phrases/DictionaryView";
import { PHRASES_UPDATED_EVENT } from "./lib/db/phraseStore";

/**
 * Main App Component
 *
 * State Management:
 * - isLoading: Controls loading states for file operations
 * - externalText: Content of the currently loaded file
 * - sourceFile: Name/path of the currently loaded file
 * - restored: Prevents multiple restoration attempts on startup
 */
function App() {
    // Application state for file loading and content management
    const [isLoading, setIsLoading] = useState(false);
    const [externalText, setExternalText] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<string | null>(null);
    const [restored, setRestored] = useState(false);

    // Scroll-following state for phrase pane
    const [followText, setFollowText] = useState(() => {
        return localStorage.getItem("readnlearn-follow-text") === "true";
    });
    const [visiblePhrases, setVisiblePhrases] = useState<Set<string>>(new Set());

    // Saved phrases for the current content (reading mode)
    const [savedPhrases, setSavedPhrases] = useState<
        Array<{ id: string; text: string; position: number }>
    >([]);

    // Set application title on mount
    useEffect(() => {
        document.title = "Read-n-Learn";
    }, []);

    /**
     * Loads saved phrases for the current content
     * This function loads phrases that are associated with the current text content
     */
    const loadSavedPhrases = useCallback(async () => {
        if (!externalText) {
            setSavedPhrases([]);
            return;
        }

        try {
            const { loadPhrasesForContent } = await import("./lib/phrases/phraseManager");
            const phrases = await loadPhrasesForContent({
                content: externalText,
                sourceFile: sourceFile || undefined,
            });
            console.log(
                "Loaded phrases:",
                phrases.map((p) => ({ id: p.id, text: p.text })),
            );
            setSavedPhrases(phrases);
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
            loadSavedPhrases();
        };

        window.addEventListener(PHRASES_UPDATED_EVENT, handlePhrasesUpdated);
        return () => {
            window.removeEventListener(PHRASES_UPDATED_EVENT, handlePhrasesUpdated);
        };
    }, [loadSavedPhrases]);

    /**
     * Detects which phrases are currently visible in the main text area
     * This function scans for phrase anchors and checks if they're in the viewport
     */
    const detectVisiblePhrases = useCallback(() => {
        console.log("🔍 detectVisiblePhrases called", { followText, externalText: !!externalText });

        if (!followText || !externalText) {
            console.log("❌ Early return: followText or externalText missing");
            setVisiblePhrases(new Set());
            return;
        }

        const mainPane = document.querySelector(".main-pane");
        if (!mainPane) {
            console.log("❌ Main pane not found");
            return;
        }

        // Find the actual scrollable parent container (the one with overflow: auto)
        const scrollContainer =
            mainPane.closest('div[style*="overflow: auto"]') || mainPane.parentElement;
        if (!scrollContainer) {
            console.log("❌ Scroll container not found");
            return;
        }

        // Get the scroll container's dimensions and position
        const rect = scrollContainer.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;
        const clientHeight = scrollContainer.clientHeight;

        // Use the scroll container's actual position in the viewport
        const viewportTop = rect.top;
        const viewportBottom = rect.bottom;

        console.log("📐 Viewport bounds:", {
            scrollContainer: scrollContainer.tagName,
            scrollContainerClass: scrollContainer.className,
            scrollTop,
            clientHeight,
            viewportTop,
            viewportBottom,
            scrollContainerRect: rect,
        });

        const phraseAnchors = document.querySelectorAll(".phrase-anchor");
        console.log("🎯 Found phrase anchors:", phraseAnchors.length);

        const visible = new Set<string>();

        phraseAnchors.forEach((anchor, index) => {
            const anchorRect = anchor.getBoundingClientRect();

            // Check if the anchor is visible within the main pane's scrollable area
            // Both anchorRect and viewport are relative to browser viewport
            const isVisible = anchorRect.bottom > viewportTop && anchorRect.top < viewportBottom;
            const phraseId = anchor.getAttribute("data-phrase-id");

            console.log(`📍 Anchor ${index}:`, {
                phraseId,
                isVisible,
                anchorTop: anchorRect.top,
                anchorBottom: anchorRect.bottom,
                viewportTop,
                viewportBottom,
                // Show the actual calculation
                bottomCheck: `${anchorRect.bottom} > ${viewportTop} = ${anchorRect.bottom > viewportTop}`,
                topCheck: `${anchorRect.top} < ${viewportBottom} = ${anchorRect.top < viewportBottom}`,
            });

            if (isVisible) {
                if (phraseId) {
                    visible.add(phraseId);
                    console.log("✅ Added to visible:", phraseId);
                } else {
                    console.log("❌ No phrase ID found for visible anchor");
                }
            } else {
                console.log("❌ Not visible:", phraseId);
            }
        });

        setVisiblePhrases(visible);

        // Debug logging
        if (
            typeof process !== "undefined" &&
            process.env &&
            process.env.NODE_ENV === "development"
        ) {
            console.log("Scroll detection:", {
                followText,
                visiblePhrasesCount: visible.size,
                visiblePhrases: Array.from(visible),
                phraseAnchorsCount: phraseAnchors.length,
                viewportTop,
                viewportBottom,
                phraseAnchors: Array.from(phraseAnchors).map((anchor) => ({
                    id: anchor.getAttribute("data-phrase-id"),
                    rect: anchor.getBoundingClientRect(),
                    isVisible:
                        anchor.getBoundingClientRect().top < viewportBottom &&
                        anchor.getBoundingClientRect().bottom > viewportTop,
                })),
            });
        }
    }, [followText, externalText]);

    // Set up scroll event listeners for phrase visibility detection
    useEffect(() => {
        if (!followText || !externalText) return;

        const mainPane = document.querySelector(".main-pane");
        if (!mainPane) return;

        // Find the actual scrollable parent container (the one with overflow: auto)
        const scrollContainer =
            mainPane.closest('div[style*="overflow: auto"]') || mainPane.parentElement;
        if (!scrollContainer) return;

        console.log(
            "🎯 Setting up scroll listeners on:",
            scrollContainer.tagName,
            scrollContainer.className,
        );

        // Throttle scroll events for better performance
        let timeoutId: NodeJS.Timeout;
        const handleScroll = () => {
            console.log("📜 Scroll event triggered");
            clearTimeout(timeoutId);
            timeoutId = setTimeout(detectVisiblePhrases, 50);
        };

        scrollContainer.addEventListener("scroll", handleScroll);

        // Also detect on resize
        window.addEventListener("resize", handleScroll);

        // Initial detection with a small delay to ensure DOM is ready
        setTimeout(detectVisiblePhrases, 100);

        return () => {
            console.log("🧹 Cleaning up scroll listeners");
            scrollContainer.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleScroll);
            clearTimeout(timeoutId);
        };
    }, [followText, detectVisiblePhrases, savedPhrases]);

    // Update visible phrases when followText changes
    useEffect(() => {
        if (followText) {
            detectVisiblePhrases();
        } else {
            setVisiblePhrases(new Set());
        }
    }, [followText, detectVisiblePhrases]);

    // Update visible phrases when savedPhrases change (phrases are loaded/updated)
    useEffect(() => {
        if (followText && savedPhrases.length > 0) {
            // Small delay to ensure DOM is updated with new phrases
            setTimeout(detectVisiblePhrases, 200);
        }
    }, [savedPhrases, followText, detectVisiblePhrases]);

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
                            followText={followText}
                            visiblePhrases={visiblePhrases}
                            onFollowTextToggle={handleFollowTextToggle}
                            savedPhrases={savedPhrases}
                            setSavedPhrases={setSavedPhrases}
                        />
                    </div>
                </I18nProvider>
            </ThemeProvider>
        </SettingsProvider>
    );
}

export default App;

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
    followText: boolean;
    visiblePhrases: Set<string>;
    onFollowTextToggle: (checked: boolean) => void;
    savedPhrases: Array<{ id: string; text: string; position: number }>;
    setSavedPhrases: React.Dispatch<
        React.SetStateAction<Array<{ id: string; text: string; position: number }>>
    >;
}) {
    const { mode } = useAppMode();
    const {
        isLoading,
        externalText,
        onLoadSampleText,
        onPhraseSelect,
        sourceFile,
        followText,
        visiblePhrases,
        onFollowTextToggle,
        savedPhrases,
        setSavedPhrases,
    } = props;

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

    // State for text content and phrase management
    const [currentText, setCurrentText] = useState("");
    const [showAllPhrases, setShowAllPhrases] = useState(false);

    // All phrases across all files (dictionary mode)
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
                                followText={followText}
                                visiblePhrases={visiblePhrases}
                                onFollowTextToggle={handleFollowTextToggle}
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
