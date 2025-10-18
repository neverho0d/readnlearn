/**
 * PhraseListView Component
 *
 * Used in Reader mode to display phrases relevant to current text
 * with viewport-based filtering and scroll-sync functionality.
 */

import React, { useRef } from "react";
import { useSettings } from "../../../lib/settings/SettingsContext";
import { PHRASES_UPDATED_EVENT } from "../../../lib/db/phraseStore";
import { PhraseCard } from "./PhraseCard";

export interface PhraseRow {
    id: string;
    lang: string;
    text: string;
    translation?: string | null;
    explanation?: string | null;
    context?: string | null;
    tags_json?: string | null;
    tags?: string[];
    added_at?: string;
    source_file?: string | null;
    content_hash?: string | null;
}

export interface PhraseListViewProps {
    filterText?: string;
    showAllPhrases?: boolean;
    onToggleFilter?: (checked: boolean) => void;
    savedPhrases?: Array<{ id: string; text: string; position: number }>;
    forceEmptyWhenNoText?: boolean;
    allPhrases?: PhraseRow[];
    followText?: boolean;
    visiblePhrases?: Set<string>;
    onFollowTextToggle?: (enabled: boolean) => void;
}

export const PhraseListView: React.FC<PhraseListViewProps> = ({
    filterText = "",
    showAllPhrases = false,
    onToggleFilter,
    savedPhrases = [],
    forceEmptyWhenNoText = false,
    allPhrases = [],
    followText = false,
    visiblePhrases = new Set(),
    onFollowTextToggle,
}) => {
    const { settings } = useSettings();
    const [rows, setRows] = React.useState<PhraseRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [translatingPhrases, setTranslatingPhrases] = React.useState<Set<string>>(new Set());

    const refresh = React.useCallback(async () => {
        setLoading(true);
        try {
            // If allPhrases are provided (dictionary mode), use them
            if (allPhrases.length > 0) {
                setRows(allPhrases);
                setLoading(false);
                return;
            }

            // Always try to load phrases for current content when we have text
            if (filterText && !showAllPhrases) {
                const { loadPhrasesByContentHash, generateContentHash } = await import(
                    "../../../lib/db/phraseStore"
                );
                const currentContentHash = generateContentHash(filterText);
                const fullPhrases = await loadPhrasesByContentHash(currentContentHash);
                setRows(fullPhrases as unknown as PhraseRow[]);
                setLoading(false);
                return;
            }

            // Load full phrase data for current file phrases (fallback for when savedPhrases is available)
            if (savedPhrases.length > 0 && !showAllPhrases) {
                // Load full phrase data from database for saved phrases
                const { loadPhrasesByContentHash, generateContentHash } = await import(
                    "../../../lib/db/phraseStore"
                );
                const currentContentHash = generateContentHash(filterText || "");
                const fullPhrases = await loadPhrasesByContentHash(currentContentHash);

                // Filter to only include phrases that are in savedPhrases
                const savedPhraseIds = new Set(savedPhrases.map((p) => p.id));
                const filteredPhrases = fullPhrases.filter((p) => savedPhraseIds.has(p.id));

                setRows(filteredPhrases as unknown as PhraseRow[]);
                setLoading(false);
                return;
            }

            const { loadAllPhrases } = await import("../../../lib/db/phraseStore");
            const phrases = await loadAllPhrases();
            setRows(phrases as unknown as PhraseRow[]);
        } catch (error) {
            console.error("Failed to load phrases:", error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [allPhrases, savedPhrases, showAllPhrases, settings.l2, filterText]);

    // Use ref to store current refresh function to avoid stale closures
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    React.useEffect(() => {
        void refresh();
        const handler = () => {
            void refreshRef.current();
        };
        const translationStartedHandler = (event: Event) => {
            const customEvent = event as CustomEvent;
            setTranslatingPhrases((prev) => new Set([...prev, customEvent.detail.phraseId]));
        };
        const translationFinishedHandler = (event: Event) => {
            const customEvent = event as CustomEvent;
            setTranslatingPhrases((prev) => {
                const newSet = new Set(prev);
                newSet.delete(customEvent.detail.phraseId);
                return newSet;
            });
        };

        window.addEventListener(PHRASES_UPDATED_EVENT, handler);
        window.addEventListener("readnlearn:phrases-updated", handler);
        window.addEventListener("readnlearn:translation-started", translationStartedHandler);
        window.addEventListener("readnlearn:translation-finished", translationFinishedHandler);

        return () => {
            window.removeEventListener(PHRASES_UPDATED_EVENT, handler);
            window.removeEventListener("readnlearn:phrases-updated", handler);
            window.removeEventListener("readnlearn:translation-started", translationStartedHandler);
            window.removeEventListener(
                "readnlearn:translation-finished",
                translationFinishedHandler,
            );
        };
    }, []);

    // Listen for requests from the reader to blink a specific phrase card
    React.useEffect(() => {
        const onJump = (ev: Event) => {
            const custom = ev as CustomEvent<{ marker?: string }>;
            const marker = custom.detail?.marker || "";
            if (!marker) return;
            const match = rows.find((r) => r.id.startsWith(marker));
            if (!match) return;
            const el = document.getElementById(`phrase-card-${match.id}`) as HTMLDivElement | null;
            if (!el) return;
            // Clear any previous inline color to avoid stacking residuals
            el.style.backgroundColor = "";
            const computed = getComputedStyle(el).backgroundColor;
            el.style.backgroundColor = "rgba(180,180,180,0.25)";
            setTimeout(() => {
                el.style.backgroundColor = computed;
            }, 1000);
            try {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            } catch {
                // ignore
            }
        };
        window.addEventListener("readnlearn:jump-to-phrase", onJump as unknown as () => void);
        return () =>
            window.removeEventListener(
                "readnlearn:jump-to-phrase",
                onJump as unknown as () => void,
            );
    }, [rows]);

    // Filter phrases that are present in the current text
    const filteredRows = React.useMemo(() => {
        // If no text is loaded:
        // - In normal/dictionary contexts show all phrases (tests rely on this behavior)
        // - In reader pane (forced) show empty
        if (!filterText.trim()) {
            return forceEmptyWhenNoText ? [] : rows;
        }

        // If text is loaded and we want to filter by current text
        if (!showAllPhrases) {
            const filtered = rows.filter((row) => {
                // If followText is enabled, only show phrases that are currently visible
                if (followText) {
                    const isVisible = visiblePhrases.has(row.id);
                    return isVisible;
                }

                const phrase = row.text.toLowerCase().trim();
                const text = filterText.toLowerCase();

                // More robust matching: check if phrase exists in text
                // Handle potential whitespace differences and punctuation
                const normalizedPhrase = phrase.replace(/\s+/g, " ").replace(/[^\w\s]/g, "");
                const normalizedText = text.replace(/\s+/g, " ").replace(/[^\w\s]/g, "");

                // Try multiple matching strategies
                const exactMatch = normalizedText.includes(normalizedPhrase);
                const wordMatch = normalizedPhrase
                    .split(" ")
                    .every((word) => normalizedText.includes(word));

                const matches = exactMatch || wordMatch;
                return matches;
            });

            // Sort phrases by position
            filtered.sort((a, b) => {
                const aLine = (a as unknown as { lineNo?: number }).lineNo;
                const aCol = (a as unknown as { colOffset?: number }).colOffset;
                const bLine = (b as unknown as { lineNo?: number }).lineNo;
                const bCol = (b as unknown as { colOffset?: number }).colOffset;

                // Use line_no * 100000 + col_offset for sorting (as requested)
                if (
                    typeof aLine === "number" &&
                    typeof aCol === "number" &&
                    typeof bLine === "number" &&
                    typeof bCol === "number"
                ) {
                    const keyA = aLine * 100000 + aCol;
                    const keyB = bLine * 100000 + bCol;
                    return keyA - keyB;
                }

                // For reading mode: use savedPhrases positions
                if (savedPhrases.length > 0) {
                    const posMap = new Map(savedPhrases.map((p) => [p.id, p.position]));
                    const posA = posMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
                    const posB = posMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
                    return posA - posB;
                }

                // For dictionary mode: try to calculate position from text
                if (filterText.trim()) {
                    const posA = filterText.indexOf(a.text);
                    const posB = filterText.indexOf(b.text);
                    if (posA >= 0 && posB >= 0) {
                        return posA - posB;
                    }
                }

                // Final fallback: sort by added_at (newest first)
                const aTime = a.added_at ? new Date(a.added_at).getTime() : 0;
                const bTime = b.added_at ? new Date(b.added_at).getTime() : 0;
                return bTime - aTime;
            });

            return filtered;
        }

        // Show all phrases
        return rows;
    }, [rows, filterText, showAllPhrases, savedPhrases, followText, visiblePhrases]);

    // Emit event when PhraseListView UI is fully ready
    React.useEffect(() => {
        const emitReadyEvent = () => {
            // Wait for all DOM updates to complete
            setTimeout(() => {
                // Double-check that all phrase elements are actually rendered
                const phraseElements = document.querySelectorAll('[id^="phrase-card-"]');
                const expectedCount = filteredRows.length;

                // Also check if the phrase pane is visible and has content
                const phrasePane = document.getElementById("phrase-pane-root");
                const isPhrasePaneReady = phrasePane && phrasePane.children.length > 0;

                if (
                    (phraseElements.length >= expectedCount || expectedCount === 0) &&
                    isPhrasePaneReady
                ) {
                    const event = new CustomEvent("readnlearn:ui-ready");
                    window.dispatchEvent(event);
                } else {
                    // If not all elements are rendered yet, wait a bit more
                    setTimeout(emitReadyEvent, 150);
                }
            }, 300); // Give more time for DOM updates
        };

        emitReadyEvent();
    }, [filteredRows.length, filterText]);

    if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

    // Reader pane requirement: if forced empty when no text, render nothing
    if (forceEmptyWhenNoText && !filterText.trim()) {
        return <div style={{ padding: 16 }} />;
    }

    // If no text is loaded in other contexts, show all phrases; if none, show empty state expected by tests
    if (!filterText.trim()) {
        if (!rows.length) return <div style={{ padding: 16 }}>No phrases yet</div>;
    }

    // If text is loaded but no matching phrases found
    if (filterText.trim() && !filteredRows.length) {
        return (
            <div style={{ padding: 16, fontSize: "0.9em", fontStyle: "italic" }}>
                No phrases found in current view.
            </div>
        );
    }

    return (
        <div
            id="phrase-pane-root"
            style={{
                padding: 16,
                background: "var(--bg)",
                fontFamily: settings.font,
                fontSize: settings.fontSize,
            }}
        >
            {onToggleFilter && (
                <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: "14px", color: "var(--muted)" }}>
                        <input
                            type="checkbox"
                            checked={showAllPhrases}
                            onChange={(e) => onToggleFilter(e.target.checked)}
                            disabled={!filterText.trim()}
                            style={{ marginRight: 6 }}
                        />
                        Show all phrases
                    </label>
                    {!filterText.trim() && (
                        <span
                            style={{
                                fontSize: "12px",
                                color: "var(--muted)",
                                fontStyle: "italic",
                            }}
                        >
                            (No text loaded)
                        </span>
                    )}
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredRows.map((r) => {
                    const tags = r.tags_json ? JSON.parse(r.tags_json) : r.tags || [];

                    return (
                        <PhraseCard
                            key={r.id}
                            id={r.id}
                            text={r.text}
                            translation={r.translation}
                            explanation={r.explanation}
                            tags={tags}
                            isTranslating={translatingPhrases.has(r.id)}
                            onJumpToPhrase={(phraseId) => {
                                try {
                                    const ev = new CustomEvent(
                                        "readnlearn:jump-to-phrase-in-text",
                                        {
                                            detail: { id: phraseId },
                                        },
                                    );
                                    window.dispatchEvent(ev);
                                } catch {
                                    // ignore
                                }
                            }}
                        />
                    );
                })}
            </div>

            {/* Follow text toggle - only show in reading mode */}
            {onFollowTextToggle && (
                <div
                    style={{
                        position: "sticky",
                        bottom: 0,
                        background: "var(--bg)",
                        borderTop: "1px solid var(--border)",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "12px",
                        color: "var(--muted)",
                    }}
                >
                    <input
                        type="checkbox"
                        id="follow-text"
                        checked={followText}
                        onChange={(e) => onFollowTextToggle(e.target.checked)}
                        style={{
                            margin: 0,
                            cursor: "pointer",
                        }}
                    />
                    <label
                        htmlFor="follow-text"
                        style={{
                            cursor: "pointer",
                            userSelect: "none",
                        }}
                    >
                        Follow text
                    </label>
                </div>
            )}
        </div>
    );
};
