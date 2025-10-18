/**
 * Phrase Store Module
 *
 * This module provides persistence for saved phrases using Supabase (PostgreSQL) as the primary storage.
 * It handles:
 * - Phrase CRUD operations (Create, Read, Update, Delete)
 * - Content hash verification for phrase-text matching
 * - Position tracking for phrase decoration
 * - Offline-first caching with IndexedDB
 * - Cross-component event communication
 *
 * Architecture:
 * - Uses Supabase for cloud storage with offline-first caching
 * - Provides type-safe interfaces for phrase data
 * - Handles authentication and user data isolation
 */

import { supabase } from "../supabase/client";
import { cache } from "../cache/indexedDB";
import { generateStemmedPhrase } from "../utils/stemming";

/**
 * Get PostgreSQL FTS configuration for a given language code
 */
function getLanguageConfig(lang: string): string {
    const languageMap: Record<string, string> = {
        en: "english",
        es: "spanish",
        fr: "french",
        de: "german",
        it: "italian",
        pt: "portuguese",
    };

    return languageMap[lang] || "simple";
}

/**
 * Saved Phrase Interface
 *
 * Represents a saved phrase with all associated metadata.
 * This interface defines the structure of phrase data stored in the database.
 */
export interface SavedPhrase {
    id: string; // Unique identifier (UUID)
    lang: string; // L2 language code (e.g., "es", "fr")
    text: string; // The actual phrase text
    translation: string; // Translation or explanation
    explanation?: string; // Detailed explanation from LLM
    context: string; // Surrounding context sentence
    tags: string[]; // User-defined tags for categorization
    addedAt: string; // ISO timestamp of when phrase was added
    sourceFile?: string; // Original filename where phrase was found
    contentHash?: string; // Hash of file content for verification
    fileFormat?: "text" | "markdown"; // Format of the source file
    // Position of the phrase in the original text (1-based line, 0-based column offset)
    lineNo?: number; // Line number in source text (1-based)
    colOffset?: number; // Column offset within the line (0-based)
}

/**
 * Event Constants
 *
 * Custom events for cross-component communication.
 * Used to notify components when phrase data changes.
 */
export const PHRASES_UPDATED_EVENT = "readnlearn:phrases-updated";
export const PHRASE_TRANSLATED_EVENT = "readnlearn:phrase-translated";

/**
 * Content Hash Generation
 *
 * Generates a simple hash for content verification.
 * Used to match phrases to their source content and detect changes.
 *
 * Algorithm: Simple hash function that processes each character
 * and combines them using bit shifting and addition.
 *
 * @param content - The text content to hash
 * @returns Base-36 encoded hash string
 */
export function generateContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Update phrase translation/explanation and emit events
 */
export async function updatePhraseTranslation(
    phraseId: string,
    translation: string,
    explanation?: string,
): Promise<void> {
    await ensureDb();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const updatePayload: Record<string, unknown> = {
        translation: translation || "",
        explanation: explanation || "",
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("phrases")
        .update(updatePayload)
        .eq("id", phraseId)
        .eq("user_id", user.id);
    if (error) console.warn("Supabase updatePhraseTranslation error:", error);

    // Update local cache
    try {
        const allPhrases = await cache.getPhrases(user.id);
        const phraseIndex = allPhrases.findIndex((p) => p.id === phraseId);
        if (phraseIndex >= 0) {
            allPhrases[phraseIndex] = {
                ...allPhrases[phraseIndex],
                translation: translation || "",
                explanation: explanation || "",
            };
            await cache.updatePhrases(allPhrases);
        }
    } catch (cacheError) {
        console.warn("Failed to update cache after translation:", cacheError);
    }

    try {
        window.dispatchEvent(new CustomEvent(PHRASE_TRANSLATED_EVENT));
        window.dispatchEvent(new CustomEvent(PHRASES_UPDATED_EVENT));
    } catch {
        // ignore dispatch errors outside browser
    }
}

/**
 * Database Initialization
 *
 * Ensures the Supabase connection is ready and cache is initialized.
 *
 * @returns Promise<boolean> - Whether the database is ready
 * @throws Error if database initialization fails
 */
export async function ensureDb(): Promise<boolean> {
    try {
        // In test environments, skip database initialization
        if (
            typeof window === "undefined" ||
            // eslint-disable-next-line no-undef
            (typeof process !== "undefined" && process?.env?.NODE_ENV === "test") ||
            import.meta.env.MODE === "test"
        ) {
            console.log("Skipping database initialization in test environment");
            return true;
        }

        // Check if user is authenticated
        const {
            data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
            throw new Error("User not authenticated");
        }

        // Initialize cache only if not in test environment
        try {
            await cache.init();
        } catch (cacheError) {
            // If cache initialization fails (e.g., IndexedDB not available), continue without cache
            console.warn("Cache initialization failed, continuing without cache:", cacheError);
        }

        console.log("Supabase database connection ready");
        return true;
    } catch (error) {
        console.error("Failed to initialize Supabase database:", error);
        throw new Error("Database initialization failed");
    }
}

/**
 * Load all phrases from the database
 */
export async function loadAllPhrases(): Promise<SavedPhrase[]> {
    try {
        await ensureDb();

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Try to load from Supabase first
        const { data: phrases, error } = await supabase
            .from("phrases")
            .select("*")
            .eq("user_id", user.id)
            .order("added_at", { ascending: false });

        if (error) {
            console.error("Failed to load phrases from Supabase:", error);
            // Fallback to cache
            return await cache.getPhrases(user.id);
        }

        console.log("📥 Loaded phrases from Supabase:", phrases?.length || 0, "phrases");
        if (phrases && phrases.length > 0) {
            console.log(
                "📝 All loaded phrases:",
                phrases.map((p) => ({
                    id: p.id,
                    text: p.text.substring(0, 50) + "...",
                    contentHash: p.content_hash,
                    sourceFile: p.source_file,
                    addedAt: p.added_at,
                })),
            );
        }

        // Update cache with fresh data
        if (phrases) {
            await cache.updatePhrases(phrases);
        }

        // Transform Supabase data to proper format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedPhrases = (phrases || []).map((phrase: any) => ({
            id: phrase.id,
            lang: phrase.lang,
            text: phrase.text,
            translation: phrase.translation,
            explanation: phrase.explanation,
            context: phrase.context,
            tags: phrase.tags || [],
            addedAt: phrase.added_at,
            sourceFile: phrase.source_file,
            contentHash: phrase.content_hash,
            lineNo: phrase.line_no,
            colOffset: phrase.col_offset,
            updatedAt: phrase.updated_at,
        }));

        return transformedPhrases;
    } catch (error) {
        console.error("Failed to load phrases:", error);
        // Fallback to cache
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                return await cache.getPhrases(user.id);
            }
        } catch (cacheError) {
            console.error("Failed to load from cache:", cacheError);
        }
        return [];
    }
}

/**
 * Load phrases filtered by source file for better performance
 * This function loads only phrases that belong to a specific source file
 */
export async function loadPhrasesBySource(sourceFile: string): Promise<SavedPhrase[]> {
    try {
        await ensureDb();

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Load phrases filtered by source file
        const { data: phrases, error } = await supabase
            .from("phrases")
            .select("*")
            .eq("user_id", user.id)
            .eq("source_file", sourceFile)
            .order("added_at", { ascending: false });

        if (error) {
            console.error("Failed to load phrases by source from Supabase:", error);
            // Fallback to cache
            return await cache.getPhrasesBySource(user.id, sourceFile);
        }

        // Transform Supabase data to proper format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedPhrases = (phrases || []).map((phrase: any) => ({
            id: phrase.id,
            lang: phrase.lang,
            text: phrase.text,
            translation: phrase.translation,
            explanation: phrase.explanation,
            context: phrase.context,
            tags: phrase.tags || [],
            addedAt: phrase.added_at,
            sourceFile: phrase.source_file,
            contentHash: phrase.content_hash,
            lineNo: phrase.line_no,
            colOffset: phrase.col_offset,
            updatedAt: phrase.updated_at,
        }));

        // Update cache with fresh data
        await cache.setPhrasesBySource(user.id, sourceFile, transformedPhrases);

        return transformedPhrases;
    } catch (error) {
        console.error("Failed to load phrases by source:", error);
        throw error;
    }
}

/**
 * Load phrases filtered by content hash for better performance
 * This function loads only phrases that belong to a specific content
 */
export async function loadPhrasesByContentHash(contentHash: string): Promise<SavedPhrase[]> {
    try {
        await ensureDb();

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Load phrases filtered by content hash
        const { data: phrases, error } = await supabase
            .from("phrases")
            .select("*")
            .eq("user_id", user.id)
            .eq("content_hash", contentHash)
            .order("added_at", { ascending: false });

        if (error) {
            console.error("Failed to load phrases by content hash:", error);
            // Fallback to cache
            return await cache.getPhrasesByContentHash(user.id, contentHash);
        }

        // Transform Supabase data to proper format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedPhrases = (phrases || []).map((phrase: any) => ({
            id: phrase.id,
            lang: phrase.lang,
            text: phrase.text,
            translation: phrase.translation,
            explanation: phrase.explanation,
            context: phrase.context,
            tags: phrase.tags || [],
            addedAt: phrase.added_at,
            sourceFile: phrase.source_file,
            contentHash: phrase.content_hash,
            lineNo: phrase.line_no,
            colOffset: phrase.col_offset,
            updatedAt: phrase.updated_at,
        }));

        // Update cache with fresh data
        await cache.setPhrasesByContentHash(user.id, contentHash, transformedPhrases);

        return transformedPhrases;
    } catch (error) {
        console.error("Failed to load phrases by content hash:", error);
        throw error;
    }
}

/**
 * Save a new phrase to the database
 */
export async function savePhrase(p: Omit<SavedPhrase, "id" | "addedAt">): Promise<SavedPhrase> {
    try {
        await ensureDb();

        // Get current user with better error handling
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
            console.error("❌ Authentication error:", userError);
            throw new Error(`Authentication failed: ${userError.message}`);
        }

        if (!user) {
            console.error("❌ No authenticated user found");
            throw new Error("User not authenticated. Please sign in again.");
        }

        const saved: SavedPhrase = {
            id: crypto.randomUUID(),
            addedAt: new Date().toISOString(),
            ...p,
        };

        // Generate stemmed versions for FTS (currently unused but kept for future use)
        generateStemmedPhrase({
            text: saved.text,
            translation: saved.translation,
            context: saved.context,
            lang: saved.lang,
        });

        console.log("💾 Saving phrase to Supabase:", {
            id: saved.id,
            text: saved.text,
            sourceFile: saved.sourceFile,
            contentHash: saved.contentHash,
            user_id: user.id,
        });

        // Debug: Check if sourceFile and contentHash are valid
        if (!saved.sourceFile) {
            console.warn("⚠️ Warning: sourceFile is null/undefined when saving phrase");
        }
        if (!saved.contentHash) {
            console.warn("⚠️ Warning: contentHash is null/undefined when saving phrase");
        }

        // Try to save to Supabase
        const { error } = await supabase
            .from("phrases")
            .insert({
                id: saved.id,
                user_id: user.id,
                lang: saved.lang,
                text: saved.text,
                translation: saved.translation || "",
                context: saved.context || "",
                tags: saved.tags,
                added_at: saved.addedAt,
                source_file: saved.sourceFile || "",
                content_hash: saved.contentHash || "",
                line_no: saved.lineNo || 0,
                col_offset: saved.colOffset || 0,
                updated_at: new Date().toISOString(),
            })
            .select("*")
            .single();

        if (error) {
            console.error("Failed to save phrase to Supabase:", error);
            // Queue for later sync if offline
            await cache.queueOperation("insert", saved);
        } else {
            // Update cache with the saved phrase
            await cache.savePhrase(saved);
        }

        // Notify UI listeners
        try {
            console.log("📢 Dispatching PHRASES_UPDATED_EVENT");
            window.dispatchEvent(new CustomEvent(PHRASES_UPDATED_EVENT));
            console.log("✅ PHRASES_UPDATED_EVENT dispatched successfully");
        } catch (_error) {
            console.error("❌ Failed to dispatch PHRASES_UPDATED_EVENT:", _error);
        }
        return saved;
    } catch (error) {
        console.error("Failed to save phrase to database:", error);
        throw error;
    }
}

/**
 * Remove a phrase from the database
 */
export async function removePhrase(phraseId: string): Promise<void> {
    try {
        await ensureDb();

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Try to delete from Supabase
        const { error } = await supabase
            .from("phrases")
            .delete()
            .eq("id", phraseId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Failed to remove phrase from Supabase:", error);
            // Queue for later sync if offline
            await cache.queueOperation("delete", { id: phraseId });
        } else {
            // Remove from cache
            await cache.deletePhrase(phraseId);
        }

        // Notify UI listeners
        try {
            window.dispatchEvent(new CustomEvent(PHRASES_UPDATED_EVENT));
        } catch {
            // Ignore dispatch errors in non-browser contexts
        }
    } catch (error) {
        console.error("Failed to remove phrase from database:", error);
        throw error;
    }
}

/**
 * Search Options Interface
 */
export interface SearchOptions {
    searchText?: string;
    selectedTags?: string[];
    scope?: "current" | "all";
    sourceFile?: string;
    page?: number;
    itemsPerPage?: number;
}

/**
 * Search Results Interface
 */
export interface SearchResults {
    phrases: SavedPhrase[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

/**
 * Advanced multilingual search with multiple strategies
 * Supports: English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Arabic
 */
export async function searchPhrasesAdvanced(
    searchText: string,
    options: {
        language?: string;
        searchFields?: ("text" | "translation" | "context")[];
        fuzzyMatch?: boolean;
        exactMatch?: boolean;
        caseSensitive?: boolean;
    } = {},
): Promise<SavedPhrase[]> {
    const {
        language = "auto",
        searchFields = ["text", "translation", "context"],
        fuzzyMatch = true,
        exactMatch = false,
        caseSensitive = false,
    } = options;

    try {
        await ensureDb();

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        let query = supabase.from("phrases").select("*").eq("user_id", user.id);

        if (searchText.trim()) {
            const searchTerm = searchText.trim();

            // Language-specific search strategies
            const searchStrategies = [];

            // Strategy 1: Exact match (highest priority)
            if (exactMatch) {
                searchStrategies.push(...searchFields.map((field) => `${field}.eq.${searchTerm}`));
            }

            // Strategy 2: Full-text search with language-specific configs
            if (language !== "auto") {
                const languageConfigs = {
                    en: "english",
                    es: "spanish",
                    fr: "french",
                    de: "german",
                    it: "italian",
                    pt: "portuguese",
                    ru: "russian",
                    zh: "chinese_simple",
                    ja: "japanese",
                    ar: "arabic",
                };

                const config =
                    languageConfigs[language as keyof typeof languageConfigs] || "simple";

                searchStrategies.push(
                    ...searchFields.map((field) => `textSearch(${field},${searchTerm},${config})`),
                );
            }

            // Strategy 3: Fuzzy matching with similarity
            if (fuzzyMatch) {
                searchStrategies.push(
                    ...searchFields.map((field) => `similarity(${field},${searchTerm}) > 0.3`),
                );
            }

            // Strategy 4: Case-insensitive partial matching
            if (!caseSensitive) {
                searchStrategies.push(
                    ...searchFields.map((field) => `${field}.ilike.%${searchTerm}%`),
                );
            } else {
                searchStrategies.push(
                    ...searchFields.map((field) => `${field}.like.%${searchTerm}%`),
                );
            }

            // Combine all strategies with OR
            if (searchStrategies.length > 0) {
                query = query.or(searchStrategies.join(","));
            }
        }

        const { data, error } = await query.order("added_at", { ascending: false });

        if (error) {
            console.error("Search error:", error);
            throw error;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (data || []).map((phrase: any) => ({
            id: phrase.id,
            lang: phrase.lang,
            text: phrase.text,
            translation: phrase.translation,
            context: phrase.context,
            tags: phrase.tags || [],
            addedAt: phrase.added_at,
            sourceFile: phrase.source_file,
            contentHash: phrase.content_hash,
            lineNo: phrase.line_no,
            colOffset: phrase.col_offset,
            updatedAt: phrase.updated_at,
        }));
    } catch (error) {
        console.error("Advanced search failed:", error);
        throw error;
    }
}

/**
 * Search phrases using FTS with advanced filtering
 */
export async function searchPhrases(options: SearchOptions = {}): Promise<SearchResults> {
    const {
        searchText = "",
        selectedTags = [],
        scope = "all",
        sourceFile,
        page = 1,
        itemsPerPage = 20,
    } = options;

    try {
        await ensureDb();

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Build Supabase query
        let query = supabase.from("phrases").select("*", { count: "exact" }).eq("user_id", user.id);

        // Apply advanced search filter with multiple strategies
        if (searchText.trim()) {
            const searchTerm = searchText.trim();

            // Strategy 1: Full-text search using PostgreSQL's built-in FTS with dynamic language detection
            // This provides better multilingual support and handles proper stemming for each language

            // Get all supported languages from the user's phrases to determine which FTS configs to use
            const { data: userPhrases } = await supabase
                .from("phrases")
                .select("lang")
                .eq("user_id", user.id)
                .limit(1000); // Get a sample to determine languages

            const supportedLanguages = [...new Set((userPhrases || []).map((p) => p.lang))];

            // Create FTS queries for each supported language
            const ftsQueries = [];

            for (const lang of supportedLanguages) {
                const config = getLanguageConfig(lang);

                // FTS query for text field
                ftsQueries.push(
                    supabase
                        .from("phrases")
                        .select("*", { count: "exact" })
                        .eq("user_id", user.id)
                        .eq("lang", lang)
                        .textSearch("text", searchTerm, {
                            type: "websearch",
                            config: config,
                        }),
                );

                // FTS query for translation field
                ftsQueries.push(
                    supabase
                        .from("phrases")
                        .select("*", { count: "exact" })
                        .eq("user_id", user.id)
                        .eq("lang", lang)
                        .textSearch("translation", searchTerm, {
                            type: "websearch",
                            config: config,
                        }),
                );

                // FTS query for context field
                ftsQueries.push(
                    supabase
                        .from("phrases")
                        .select("*", { count: "exact" })
                        .eq("user_id", user.id)
                        .eq("lang", lang)
                        .textSearch("context", searchTerm, {
                            type: "websearch",
                            config: config,
                        }),
                );
            }

            // Strategy 2: ILIKE fallback for partial matches and non-FTS fields
            const ilikeQuery = supabase
                .from("phrases")
                .select("*", { count: "exact" })
                .eq("user_id", user.id)
                .or(
                    `text.ilike.%${searchTerm}%,translation.ilike.%${searchTerm}%,context.ilike.%${searchTerm}%`,
                );

            // Strategy 3: Combined approach - try all FTS queries, then supplement with ILIKE
            try {
                // Execute all FTS queries and ILIKE query in parallel
                const allQueries = [...ftsQueries, ilikeQuery];
                const results = await Promise.all(allQueries);

                // Combine all FTS results (exclude ILIKE result)
                const ftsResults = results.slice(0, -1).flatMap((result) => result.data || []);

                // Remove duplicates based on id
                const uniqueFtsResults = ftsResults.filter(
                    (phrase, index, self) => index === self.findIndex((p) => p.id === phrase.id),
                );

                const ilikeResult = results[results.length - 1];

                if (uniqueFtsResults.length > 0) {
                    // Use FTS results if available
                    query = supabase
                        .from("phrases")
                        .select("*", { count: "exact" })
                        .eq("user_id", user.id)
                        .in(
                            "id",
                            uniqueFtsResults.map((p) => p.id),
                        );
                } else if (!ilikeResult.error && ilikeResult.data && ilikeResult.data.length > 0) {
                    // Fallback to ILIKE if FTS found nothing
                    query = ilikeQuery;
                } else {
                    // Both failed, use ILIKE as final fallback
                    query = ilikeQuery;
                }
            } catch {
                // If all queries fail, use ILIKE as final fallback
                query = ilikeQuery;
            }
        }

        // Filter by source file if scope is "current"
        if (scope === "current") {
            if (sourceFile) {
                query = query.eq("source_file", sourceFile);
            } else {
                // If no sourceFile is provided, filter for phrases with empty source_file
                // This handles cases where phrases were saved without a filename
                query = query.or("source_file.is.null,source_file.eq.");
            }
        }

        // Filter by tags if any are selected
        if (selectedTags.length > 0) {
            // For now, use simple array contains - more complex tag filtering would go here
            selectedTags.forEach((tag) => {
                query = query.contains("tags", [tag]);
            });
        }

        // Apply pagination
        const offset = (page - 1) * itemsPerPage;
        query = query
            .order("added_at", { ascending: false })
            .range(offset, offset + itemsPerPage - 1);

        const { data: phrases, error, count } = await query;

        if (error) {
            console.error("Failed to search phrases:", error);
            return {
                phrases: [],
                totalCount: 0,
                currentPage: 1,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false,
            };
        }

        const totalCount = count || 0;
        const totalPages = Math.ceil(totalCount / itemsPerPage);

        return {
            phrases: phrases || [],
            totalCount,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        };
    } catch (error) {
        console.error("Failed to search phrases:", error);
        return {
            phrases: [],
            totalCount: 0,
            currentPage: 1,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
        };
    }
}

/**
 * Get all available tags from the database
 */
export async function getAllTags(): Promise<string[]> {
    try {
        await ensureDb();

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        const { data: phrases, error } = await supabase
            .from("phrases")
            .select("tags")
            .eq("user_id", user.id)
            .not("tags", "is", null);

        if (error) {
            console.error("Failed to get tags:", error);
            return [];
        }

        const allTags = new Set<string>();
        phrases?.forEach((phrase) => {
            if (phrase.tags && Array.isArray(phrase.tags)) {
                phrase.tags.forEach((tag: string) => allTags.add(tag));
            }
        });

        return Array.from(allTags).sort();
    } catch (error) {
        console.error("Failed to get tags:", error);
        return [];
    }
}

/**
 * Get tag usage counts
 */
export async function getTagCounts(): Promise<Map<string, number>> {
    try {
        await ensureDb();

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        const { data: phrases, error } = await supabase
            .from("phrases")
            .select("tags")
            .eq("user_id", user.id)
            .not("tags", "is", null);

        if (error) {
            console.error("Failed to get tag counts:", error);
            return new Map();
        }

        const tagCounts = new Map<string, number>();
        phrases?.forEach((phrase) => {
            if (phrase.tags && Array.isArray(phrase.tags)) {
                phrase.tags.forEach((tag: string) => {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                });
            }
        });

        return tagCounts;
    } catch (error) {
        console.error("Failed to get tag counts:", error);
        return new Map();
    }
}

// Migration functions removed - no longer needed with Supabase

// Database management functions removed - no longer needed with Supabase
