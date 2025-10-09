import React from "react";
import { useSettings } from "../../lib/settings/SettingsContext";
import {
    ensureDb,
    loadPhrases,
    PHRASES_UPDATED_EVENT,
    removePhrase,
} from "../../lib/db/phraseStore";

interface PhraseRow {
    id: string;
    lang: string;
    text: string;
    translation?: string | null;
    context?: string | null;
    tags_json?: string | null;
    tags?: string[];
    added_at?: string;
    source_file?: string | null;
    content_hash?: string | null;
}

interface DictionaryViewProps {
    filterText?: string;
    showAllPhrases?: boolean;
    onToggleFilter?: (checked: boolean) => void; // eslint-disable-line no-unused-vars
    savedPhrases?: Array<{ id: string; text: string; position: number }>;
    // When true, and no filterText is provided, render nothing (used by reader pane)
    forceEmptyWhenNoText?: boolean;
    // For dictionary mode: load all phrases with full details
    allPhrases?: PhraseRow[];
    // Scroll-following props
    followText?: boolean;
    visiblePhrases?: Set<string>;
    onFollowTextToggle?: (checked: boolean) => void;
}

export const DictionaryView: React.FC<DictionaryViewProps> = ({
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
    // Per-phrase expand/collapse state for phrase and translation (must be declared before any early returns)
    const [expandedPhrase, setExpandedPhrase] = React.useState<Record<string, boolean>>(() => ({}));
    const [expandedTranslation, setExpandedTranslation] = React.useState<Record<string, boolean>>(
        () => ({}),
    );
    const toggleExpand = (
        setMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
        id: string,
    ) => {
        setMap((prev) => ({ ...prev, [id]: !prev[id] }));
    };
    // no-op helper removed; click-to-expand handles all cases

    const refresh = React.useCallback(async () => {
        setLoading(true);
        try {
            // If allPhrases are provided (dictionary mode), use them
            if (allPhrases.length > 0) {
                setRows(allPhrases);
                setLoading(false);
                return;
            }

            // Try SQL first
            const db = await ensureDb();
            const list = (await db.select(
                "SELECT id, lang, text, translation, context, tags_json, added_at, source_file, content_hash, line_no as line_no, col_offset as col_offset FROM phrases ORDER BY added_at DESC",
            )) as PhraseRow[] & Array<{ line_no?: number; col_offset?: number }>;
            if (list.length === 0) {
                // If DB exists but has no rows yet, fall back to localStorage for tests/dev
                const fallbackPhrases = loadPhrases();
                setRows(fallbackPhrases as unknown as PhraseRow[]);
            } else {
                setRows(list);
            }

            // Debug logging
            // if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") {
            //     console.log("Phrases refreshed from DB:", {
            //         count: list.length,
            //         phrases: list.map((p) => ({ id: p.id, text: p.text })),
            //     });
            // }
        } catch {
            // Fallback to localStorage loader
            const fallbackPhrases = loadPhrases();
            setRows(fallbackPhrases);

            // Debug logging
            // if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") {
            //     console.log("Phrases refreshed from localStorage:", {
            //         count: fallbackPhrases.length,
            //         phrases: fallbackPhrases.map((p) => ({ id: p.id, text: p.text })),
            //     });
            // }
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void refresh();
        const handler = () => {
            // Refresh the list; sorting logic will place new phrases by (line_no, col_offset)
            void refresh();
        };
        window.addEventListener(PHRASES_UPDATED_EVENT, handler);
        return () => window.removeEventListener(PHRASES_UPDATED_EVENT, handler);
    }, [refresh]);

    // Listen for requests from the reader to blink a specific phrase card
    React.useEffect(() => {
        const onJump = (ev: Event) => {
            const custom = ev as CustomEvent<{ marker?: string }>; // marker = first 4 chars of id
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

    // Remove functionality not needed in phrase card UI scope currently

    // Filter phrases that are present in the current text
    const filteredRows = React.useMemo(() => {
        // Debug logging
        // if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") {
        //     console.log("DictionaryView filtering:", {
        //         filterTextLength: filterText.length,
        //         filterTextPreview: filterText.substring(0, 100),
        //         showAllPhrases,
        //         totalRows: rows.length,
        //         mode: "filtering",
        //     });
        // }

        // If no text is loaded:
        // - In normal/dictionary contexts show all phrases (tests rely on this behavior)
        // - In reader pane (forced) show empty
        if (!filterText.trim()) {
            return forceEmptyWhenNoText ? [] : rows;
        }

        // If text is loaded and we want to filter by current text
        if (!showAllPhrases) {
            // Debug logging
            if (
                typeof process !== "undefined" &&
                process.env &&
                process.env.NODE_ENV === "development"
            ) {
                console.log("DictionaryView filtering:", {
                    followText,
                    visiblePhrasesSize: visiblePhrases.size,
                    visiblePhrases: Array.from(visiblePhrases),
                    totalRows: rows.length,
                    filterTextLength: filterText.length,
                    rowIds: rows.map((r) => r.id),
                });
            }

            console.log("🔍 Filtering phrases:", {
                followText,
                visiblePhrasesSize: visiblePhrases.size,
                visiblePhrases: Array.from(visiblePhrases),
                totalRows: rows.length,
            });

            const filtered = rows.filter((row) => {
                // If followText is enabled, only show phrases that are currently visible
                if (followText) {
                    const isVisible = visiblePhrases.has(row.id);
                    console.log(
                        `🔍 Phrase ${row.id} (${row.text.substring(0, 30)}...): visible=${isVisible}`,
                    );
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

                // Debug logging for each phrase
                // if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") {
                //     console.log("Phrase filtering:", {
                //         phrase: row.text,
                //         normalizedPhrase,
                //         normalizedText: normalizedText.substring(0, 100),
                //         textLength: filterText.length,
                //         exactMatch,
                //         wordMatch,
                //         matches,
                //         showAllPhrases,
                //     });
                // }

                return matches;
            });

            // Sort phrases by position
            filtered.sort((a, b) => {
                const aLine = (a as unknown as { line_no?: number }).line_no;
                const aCol = (a as unknown as { col_offset?: number }).col_offset;
                const bLine = (b as unknown as { line_no?: number }).line_no;
                const bCol = (b as unknown as { col_offset?: number }).col_offset;

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

            // Debug logging
            // if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") {
            //     console.log("Filtered phrases result:", {
            //         totalRows: rows.length,
            //         filteredCount: filtered.length,
            //         filterTextLength: filterText.length,
            //         showAllPhrases,
            //         filteredPhrases: filtered.map((r) => r.text),
            //     });
            // }

            return filtered;
        }

        // Show all phrases
        return rows;
    }, [rows, filterText, showAllPhrases, savedPhrases, followText, visiblePhrases]);

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
                    const phraseMarker = r.id.substring(0, 4);
                    const showFullPhrase = Boolean(expandedPhrase[r.id]);
                    const showFullTrans = Boolean(expandedTranslation[r.id]);

                    return (
                        <div
                            key={r.id}
                            id={`phrase-card-${r.id}`}
                            style={{
                                border: "none",
                                borderRadius: 8,
                                background: "var(--bg)",
                                padding: 12,
                            }}
                            onClick={(e) => {
                                // Blink card when notified from text click
                                const handler = (ev: Event) => {
                                    const custom = ev as CustomEvent<{ marker: string }>;
                                    if (r.id.startsWith(custom.detail?.marker || "")) {
                                        const el = e.currentTarget as HTMLDivElement;
                                        const original = el.style.backgroundColor;
                                        el.style.backgroundColor = "rgba(180,180,180,0.25)";
                                        setTimeout(() => {
                                            el.style.backgroundColor = original || "var(--bg)";
                                        }, 1000);
                                    }
                                };
                                window.addEventListener(
                                    "readnlearn:jump-to-phrase",
                                    handler as unknown as () => void,
                                    { once: true },
                                );
                            }}
                        >
                            {/* Row 1: Phrase */}
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <span
                                    style={{
                                        color: "var(--primary)",
                                        fontSize: "0.7em",
                                        marginTop: 2,
                                        cursor: "pointer",
                                    }}
                                    title={r.id}
                                    onClick={() => {
                                        try {
                                            const ev = new CustomEvent(
                                                "readnlearn:jump-to-phrase-in-text",
                                                { detail: { id: r.id } },
                                            );
                                            window.dispatchEvent(ev);
                                        } catch {
                                            // ignore
                                        }
                                    }}
                                >
                                    {phraseMarker}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            whiteSpace: showFullPhrase ? "normal" : "nowrap",
                                            overflow: showFullPhrase ? "visible" : "hidden",
                                            textOverflow: showFullPhrase ? "clip" : "ellipsis",
                                            maxWidth: "100%",
                                            wordBreak: showFullPhrase ? "break-word" : undefined,
                                            cursor: "pointer",
                                        }}
                                        title={
                                            showFullPhrase ? "Click to collapse" : "Click to expand"
                                        }
                                        onClick={() => toggleExpand(setExpandedPhrase, r.id)}
                                    >
                                        {r.text}
                                    </div>
                                </div>
                                {/* Ellipsis is part of the text-overflow; clicking the text toggles expansion */}
                            </div>

                            {/* Row 2: Translation/Explanation */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 8,
                                    marginTop: 6,
                                }}
                            >
                                <span style={{ width: 24, color: "var(--muted)", fontSize: 12 }}>
                                    ✎
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            whiteSpace: showFullTrans ? "normal" : "nowrap",
                                            overflow: showFullTrans ? "visible" : "hidden",
                                            textOverflow: showFullTrans ? "clip" : "ellipsis",
                                            maxWidth: "100%",
                                            wordBreak: showFullTrans ? "break-word" : undefined,
                                            color: "var(--text)",
                                            cursor: "pointer",
                                            fontSize: "0.92em",
                                        }}
                                        title={
                                            showFullTrans ? "Click to collapse" : "Click to expand"
                                        }
                                        onClick={() => toggleExpand(setExpandedTranslation, r.id)}
                                    >
                                        {r.translation || "—"}
                                    </div>
                                </div>
                                {/* Ellipsis is part of the text-overflow; clicking the text toggles expansion */}
                            </div>

                            {/* Row 3: Tags */}
                            {tags.length > 0 && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: 8,
                                        marginTop: 6,
                                    }}
                                >
                                    <span
                                        style={{ width: 24, color: "var(--muted)", fontSize: 12 }}
                                    >
                                        #
                                    </span>
                                    <div style={{ flex: 1, color: "#7dd3fc", fontSize: "0.92em" }}>
                                        {`#${tags.join(", #")}`}
                                    </div>
                                    <div style={{ width: 24 }} />
                                </div>
                            )}

                            {/* Row 4: Source file and remove button (dictionary mode only) */}
                            {!forceEmptyWhenNoText && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 8,
                                        marginTop: 8,
                                        paddingTop: 8,
                                        borderTop: "1px solid var(--border)",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            flex: 1,
                                        }}
                                    >
                                        <span style={{ color: "var(--muted)", fontSize: 12 }}>
                                            📄
                                        </span>
                                        <span
                                            style={{
                                                color: "var(--text-light)",
                                                fontSize: "0.85em",
                                            }}
                                        >
                                            {r.source_file ||
                                                (r as unknown as { sourceFile?: string })
                                                    .sourceFile ||
                                                "Unknown source"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (confirm("Remove this phrase?")) {
                                                try {
                                                    console.log(
                                                        "Attempting to remove phrase:",
                                                        r.id,
                                                    );
                                                    await removePhrase(r.id);
                                                    console.log(
                                                        "Successfully removed phrase:",
                                                        r.id,
                                                    );
                                                } catch (error) {
                                                    console.error("Error removing phrase:", error);
                                                }
                                            }
                                        }}
                                        style={{
                                            background: "var(--danger)",
                                            color: "white",
                                            border: "none",
                                            borderRadius: 4,
                                            padding: "4px 8px",
                                            fontSize: "12px",
                                            cursor: "pointer",
                                        }}
                                        title="Remove phrase"
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>
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
