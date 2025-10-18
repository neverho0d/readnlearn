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

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSettings } from "../../lib/settings/SettingsContext";
import {
    searchPhrases,
    getAllTags,
    PHRASES_UPDATED_EVENT,
    SearchOptions,
    SearchResults,
} from "../../lib/db/phraseStore";
import { DictionarySearchBar } from "./DictionarySearchBar";
import { DictionaryTagsBar } from "./DictionaryTagsBar";
import { DictionaryStatusBar } from "./DictionaryStatusBar";
import { DictionaryPager } from "./DictionaryPager";
import { PhraseListFull } from "./components";

interface EnhancedDictionaryViewProps {
    sourceFile?: string | null;
    hasCurrentFile?: boolean;
    cachedPhrases?: Array<{ id: string; text: string; position: number }>;
}

export const EnhancedDictionaryView: React.FC<EnhancedDictionaryViewProps> = ({
    sourceFile,
    hasCurrentFile = false,
    cachedPhrases = [],
}) => {
    const { settings } = useSettings();

    // Search and filter state
    const [searchText, setSearchText] = useState("");
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
    // Smart default scope: "current" if file is loaded, "all" if no file
    const [searchScope, setSearchScope] = useState<"current" | "all">(() => {
        return sourceFile ? "current" : "all";
    });
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

    // Update scope when sourceFile changes
    useEffect(() => {
        if (sourceFile) {
            setSearchScope("current");
        } else {
            setSearchScope("all");
        }
    }, [sourceFile]);

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
            // If we have cached phrases and no search filters, use cached data for better performance
            if (
                cachedPhrasesRef.current.length > 0 &&
                !searchText &&
                selectedTags.size === 0 &&
                searchScope === "all"
            ) {
                // Convert cached phrases to full phrase objects for display
                const { loadAllPhrases } = await import("../../lib/db/phraseStore");
                const allPhrases = await loadAllPhrases();

                // Apply pagination
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedPhrases = allPhrases.slice(startIndex, endIndex);

                setSearchResults({
                    phrases: paginatedPhrases,
                    totalCount: allPhrases.length,
                    currentPage,
                    totalPages: Math.ceil(allPhrases.length / itemsPerPage),
                    hasNextPage: endIndex < allPhrases.length,
                    hasPreviousPage: currentPage > 1,
                });
            } else if (searchScope === "current" && !searchText && selectedTags.size === 0) {
                // For current scope, always use database search to get proper filtering
                const options: SearchOptions = {
                    searchText: "",
                    selectedTags: [],
                    scope: "current",
                    sourceFile: sourceFile || undefined,
                    page: currentPage,
                    itemsPerPage,
                };

                // If current scope is requested but no sourceFile is available,
                // show a message instead of empty results
                if (!sourceFile) {
                    setSearchResults({
                        phrases: [],
                        totalCount: 0,
                        currentPage: 1,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: currentPage > 1,
                    });
                    setLoading(false);
                    return;
                }

                const results = await searchPhrases(options);
                setSearchResults(results);
            } else {
                // Use database search for filtered results
                const options: SearchOptions = {
                    searchText,
                    selectedTags: Array.from(selectedTags),
                    scope: searchScope,
                    sourceFile: searchScope === "current" ? sourceFile || undefined : undefined,
                    page: currentPage,
                    itemsPerPage,
                };

                // If current scope is requested but no sourceFile is available,
                // show a message instead of empty results
                if (searchScope === "current" && !sourceFile) {
                    setSearchResults({
                        phrases: [],
                        totalCount: 0,
                        currentPage: 1,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false,
                    });
                    setLoading(false);
                    return;
                }

                const results = await searchPhrases(options);
                setSearchResults(results);
            }
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
    }, [
        searchText,
        selectedTags,
        searchScope,
        sourceFile,
        currentPage,
        itemsPerPage,
        // Removed cachedPhrases to prevent unnecessary re-runs
    ]);

    // Trigger search when parameters change
    useEffect(() => {
        performSearch();
    }, [performSearch]);

    // Use ref to store current performSearch function to avoid stale closures
    const performSearchRef = useRef(performSearch);
    performSearchRef.current = performSearch;

    // Use ref to store current cachedPhrases to avoid dependency issues
    const cachedPhrasesRef = useRef(cachedPhrases);
    cachedPhrasesRef.current = cachedPhrases;

    // Listen for phrase updates (only register once, not on every performSearch change)
    useEffect(() => {
        const handlePhraseUpdate = () => {
            performSearchRef.current();
        };
        window.addEventListener(PHRASES_UPDATED_EVENT, handlePhraseUpdate);
        return () => window.removeEventListener(PHRASES_UPDATED_EVENT, handlePhraseUpdate);
    }, []); // Empty dependency array - only register once

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
                sourceFile={sourceFile}
            />

            {/* Search Results */}
            <div style={{ flex: 1, overflow: "auto", padding: "0 16px" }}>
                {loading ? (
                    <div
                        style={{
                            padding: 16,
                            textAlign: "center",
                            color: "var(--muted)",
                            fontStyle: "italic",
                        }}
                    >
                        Loading phrases...
                    </div>
                ) : searchResults.phrases.length === 0 ? (
                    <div
                        style={{
                            padding: 16,
                            textAlign: "center",
                            color: "var(--muted)",
                            fontStyle: "italic",
                        }}
                    >
                        {searchScope === "current" && !sourceFile ? (
                            <div>
                                <div>No file is currently loaded.</div>
                                <div style={{ fontSize: "0.9em", marginTop: 4 }}>
                                    Load a file in Reading mode to see phrases from that file.
                                </div>
                            </div>
                        ) : (
                            "No phrases found matching your criteria."
                        )}
                    </div>
                ) : (
                    <PhraseListFull
                        phrases={searchResults.phrases}
                        loading={loading}
                        onEdit={(phraseId) => {
                            console.log("Edit phrase", phraseId);
                        }}
                    />
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
