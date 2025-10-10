/**
 * Enhanced Dictionary View Component
 *
 * Provides a comprehensive dictionary interface with advanced search and filtering capabilities.
 * Features:
 * - Full-text search across phrases, translations, and context
 * - Tag-based filtering with checkboxes
 * - Search scope control (current file vs all files)
 * - Paginated results with navigation
 * - Status information and record counts
 * - Remove functionality for phrases
 *
 * This component implements the complete Dictionary mode requirements from CURSOR_RULES_REQS.md
 */

import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis, faFile } from "@fortawesome/free-solid-svg-icons";
import { faPenToSquare, faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { useSettings } from "../../lib/settings/SettingsContext";
import {
    searchPhrases,
    getAllTags,
    removePhrase,
    PHRASES_UPDATED_EVENT,
    SearchOptions,
    SearchResults,
} from "../../lib/db/phraseStore";
import { DictionarySearchBar } from "./DictionarySearchBar";
import { DictionaryTagsBar } from "./DictionaryTagsBar";
import { DictionaryStatusBar } from "./DictionaryStatusBar";
import { DictionaryPager } from "./DictionaryPager";

interface EnhancedDictionaryViewProps {
    sourceFile?: string | null;
    hasCurrentFile?: boolean;
}

export const EnhancedDictionaryView: React.FC<EnhancedDictionaryViewProps> = ({
    sourceFile,
    hasCurrentFile = false,
}) => {
    const { settings } = useSettings();

    // Search and filter state
    const [searchText, setSearchText] = useState("");
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
    const [searchScope, setSearchScope] = useState<"current" | "all">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Data state
    const [searchResults, setSearchResults] = useState<SearchResults>({
        phrases: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Per-phrase expand/collapse state
    const [expandedPhrase, setExpandedPhrase] = useState<Record<string, boolean>>({});
    const [expandedTranslation, setExpandedTranslation] = useState<Record<string, boolean>>({});
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    // Load available tags on component mount
    useEffect(() => {
        const loadTags = async () => {
            try {
                const tags = await getAllTags();
                setAvailableTags(tags);
            } catch (error) {
                console.error("Failed to load tags:", error);
            }
        };
        loadTags();
    }, []);

    // Perform search when parameters change
    const performSearch = useCallback(async () => {
        setLoading(true);
        try {
            const options: SearchOptions = {
                searchText,
                selectedTags: Array.from(selectedTags),
                scope: searchScope,
                sourceFile: searchScope === "current" ? sourceFile || undefined : undefined,
                page: currentPage,
                itemsPerPage,
            };

            const results = await searchPhrases(options);
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed:", error);
            setSearchResults({
                phrases: [],
                totalCount: 0,
                currentPage: 1,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false,
            });
        } finally {
            setLoading(false);
        }
    }, [searchText, selectedTags, searchScope, sourceFile, currentPage, itemsPerPage]);

    // Trigger search when parameters change
    useEffect(() => {
        performSearch();
    }, [performSearch]);

    // Listen for phrase updates
    useEffect(() => {
        const handlePhraseUpdate = () => {
            performSearch();
        };
        window.addEventListener(PHRASES_UPDATED_EVENT, handlePhraseUpdate);
        return () => window.removeEventListener(PHRASES_UPDATED_EVENT, handlePhraseUpdate);
    }, [performSearch]);

    // Handle tag toggle
    const handleTagToggle = useCallback((tag: string) => {
        setSelectedTags((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(tag)) {
                newSet.delete(tag);
            } else {
                newSet.add(tag);
            }
            return newSet;
        });
        setCurrentPage(1); // Reset to first page when filters change
    }, []);

    // Handle scope change
    const handleScopeChange = useCallback((scope: "current" | "all") => {
        setSearchScope(scope);
        setCurrentPage(1); // Reset to first page when scope changes
    }, []);

    // Handle page change
    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    // Handle phrase removal
    const handleRemovePhrase = useCallback(async (phraseId: string) => {
        if (confirm("Remove this phrase?")) {
            try {
                await removePhrase(phraseId);
                // Search will be refreshed automatically via the PHRASES_UPDATED_EVENT
            } catch (error) {
                console.error("Failed to remove phrase:", error);
            }
        }
    }, []);

    // Toggle expand/collapse for phrases and translations
    const toggleExpand = useCallback(
        (setMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, id: string) => {
            setMap((prev) => ({ ...prev, [id]: !prev[id] }));
        },
        [],
    );

    // Render phrase card
    const renderPhraseCard = useCallback(
        (phrase: {
            id: string;
            text: string;
            translation: string;
            tags: string[];
            sourceFile?: string;
        }) => {
            const showFullPhrase = Boolean(expandedPhrase[phrase.id]);
            const showFullTrans = Boolean(expandedTranslation[phrase.id]);
            const phraseMarker = phrase.id.substring(0, 4);

            return (
                <div
                    key={phrase.id}
                    style={{
                        border: "none",
                        borderRadius: 8,
                        background: "var(--bg)",
                        padding: 12,
                        marginBottom: 8,
                    }}
                >
                    {/* Top: source file and kebab menu */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            color: "var(--text-light)",
                            fontSize: "0.82em",
                            marginBottom: 6,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <FontAwesomeIcon
                                icon={faFile}
                                style={{ color: "var(--muted)", fontSize: 12 }}
                            />
                            <span>{phrase.sourceFile || "Unknown source"}</span>
                            <span style={{ margin: "0 6px", color: "var(--border)" }}>|</span>
                            <div style={{ position: "relative" }}>
                                <button
                                    onClick={() =>
                                        setMenuOpenId((prev) =>
                                            prev === phrase.id ? null : phrase.id,
                                        )
                                    }
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        boxShadow: "none",
                                        color: "var(--text-light)",
                                        cursor: "pointer",
                                        padding: 4,
                                        lineHeight: 1,
                                        borderRadius: 4,
                                    }}
                                    aria-label="More actions"
                                    title="More actions"
                                    className="icon-button"
                                >
                                    <FontAwesomeIcon icon={faEllipsis} />
                                </button>
                                {menuOpenId === phrase.id && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            right: 0,
                                            top: 22,
                                            background: "var(--bg)",
                                            border: "1px solid var(--border)",
                                            borderRadius: 6,
                                            boxShadow: "none",
                                            zIndex: 10,
                                            minWidth: 140,
                                            overflow: "hidden",
                                        }}
                                        onMouseLeave={() => setMenuOpenId(null)}
                                    >
                                        <button
                                            onClick={() => {
                                                setMenuOpenId(null);
                                                console.log("Edit phrase", phrase.id);
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                width: "100%",
                                                background: "transparent",
                                                border: "none",
                                                boxShadow: "none",
                                                padding: "8px 10px",
                                                color: "var(--text)",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                transition: "background 0.15s ease",
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.background =
                                                    "var(--bg-hover)")
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.background = "transparent")
                                            }
                                        >
                                            <FontAwesomeIcon icon={faPenToSquare} />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setMenuOpenId(null);
                                                void handleRemovePhrase(phrase.id);
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                width: "100%",
                                                background: "transparent",
                                                border: "none",
                                                boxShadow: "none",
                                                padding: "8px 10px",
                                                color: "var(--danger)",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                transition: "background 0.15s ease",
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.background =
                                                    "var(--bg-hover)")
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.background = "transparent")
                                            }
                                        >
                                            <FontAwesomeIcon icon={faTrashCan} />
                                            <span>Remove</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Row 1: Phrase */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span
                            style={{
                                color: "var(--primary)",
                                fontSize: "0.7em",
                                marginTop: 2,
                                cursor: "pointer",
                            }}
                            title={phrase.id}
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
                                    color: "#4f8cff", // blueish title color like search engines
                                }}
                                title={showFullPhrase ? "Click to collapse" : "Click to expand"}
                                onClick={() => toggleExpand(setExpandedPhrase, phrase.id)}
                            >
                                {phrase.text}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Translation/Explanation */}
                    <div
                        style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 6 }}
                    >
                        <span style={{ width: 24, color: "var(--muted)", fontSize: 12 }}>✎</span>
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
                                    fontSize: "0.88em",
                                }}
                                title={showFullTrans ? "Click to collapse" : "Click to expand"}
                                onClick={() => toggleExpand(setExpandedTranslation, phrase.id)}
                            >
                                {phrase.translation || "—"}
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Tags */}
                    {phrase.tags && phrase.tags.length > 0 && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                marginTop: 6,
                            }}
                        >
                            <span style={{ width: 24, color: "var(--muted)", fontSize: 12 }}>
                                #
                            </span>
                            <div style={{ flex: 1, color: "#7dd3fc", fontSize: "0.92em" }}>
                                {`#${phrase.tags.join(", #")}`}
                            </div>
                        </div>
                    )}

                    {/* Bottom action row removed; actions moved to kebab menu */}
                </div>
            );
        },
        [expandedPhrase, expandedTranslation, toggleExpand, handleRemovePhrase, menuOpenId],
    );

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "var(--bg)",
                fontFamily: settings.font,
                fontSize: settings.fontSize,
            }}
        >
            {/* Search Bar */}
            <DictionarySearchBar
                searchText={searchText}
                onSearchChange={(text) => {
                    setSearchText(text);
                }}
                onSearchRequest={() => performSearch()}
                isSearching={loading}
                placeholder="Search phrases, translations, or context..."
            />

            {/* Tags Bar */}
            <DictionaryTagsBar
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
            />

            {/* Status Bar */}
            <DictionaryStatusBar
                totalRecords={searchResults.totalCount}
                currentScope={searchScope}
                onScopeChange={handleScopeChange}
                hasCurrentFile={hasCurrentFile}
            />

            {/* Search Results */}
            <div style={{ flex: 1, overflow: "auto", padding: "0 16px" }}>
                {searchResults.phrases.length === 0 ? (
                    <div
                        style={{
                            padding: 16,
                            textAlign: "center",
                            color: "var(--muted)",
                            fontStyle: "italic",
                        }}
                    >
                        No phrases found matching your criteria.
                    </div>
                ) : (
                    <div style={{ padding: "8px 0" }}>
                        {searchResults.phrases.map(renderPhraseCard)}
                    </div>
                )}
            </div>

            {/* Pager */}
            <DictionaryPager
                currentPage={searchResults.currentPage}
                totalPages={searchResults.totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={itemsPerPage}
            />
        </div>
    );
};
