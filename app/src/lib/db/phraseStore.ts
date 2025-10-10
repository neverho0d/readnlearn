/**
 * Phrase Store Module
 *
 * This module provides persistence for saved phrases using SQLite as the primary storage.
 * It handles:
 * - Phrase CRUD operations (Create, Read, Update, Delete)
 * - Content hash verification for phrase-text matching
 * - Position tracking for phrase decoration
 * - Database schema management and migrations
 * - Cross-component event communication
 *
 * Architecture:
 * - Uses unified database interface that works in both browser (sql.js) and Tauri environments
 * - Provides type-safe interfaces for phrase data
 * - Handles database initialization and schema updates
 */

import { getDatabaseAdapter } from "./database";
import { DatabaseAdapter } from "./adapters/DatabaseAdapter";
import { generateStemmedPhrase, generateStemmedSearchTerms } from "../utils/stemming";

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
    context: string; // Surrounding context sentence
    tags: string[]; // User-defined tags for categorization
    addedAt: string; // ISO timestamp of when phrase was added
    sourceFile?: string; // Original filename where phrase was found
    contentHash?: string; // Hash of file content for verification
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
 * Database Initialization
 *
 * Ensures the SQLite database is properly initialized with the correct schema.
 * Works in both browser (sql.js) and Tauri environments.
 *
 * @returns Promise<DatabaseAdapter> - Initialized database adapter
 * @throws Error if database initialization fails
 */
export async function ensureDb(): Promise<DatabaseAdapter> {
    try {
        const db = await getDatabaseAdapter();
        console.log("SQLite database initialized successfully");
        return db;
    } catch (error) {
        console.error("Failed to initialize SQLite database:", error);
        throw new Error("Database initialization failed");
    }
}

/**
 * Load all phrases from the database
 */
export async function loadAllPhrases(): Promise<SavedPhrase[]> {
    try {
        const db = await ensureDb();
        const rows = await db.select(
            "SELECT id, lang, text, translation, context, tags_json, added_at, source_file, content_hash, line_no, col_offset FROM phrases ORDER BY added_at DESC",
        );

        return rows.map((r: any) => ({
            id: r.id,
            lang: r.lang,
            text: r.text,
            translation: r.translation ?? "",
            context: r.context ?? "",
            tags: r.tags_json ? JSON.parse(r.tags_json) : [],
            addedAt: r.added_at,
            sourceFile: r.source_file ?? undefined,
            contentHash: r.content_hash ?? undefined,
            lineNo: r.line_no ?? undefined,
            colOffset: r.col_offset ?? undefined,
        }));
    } catch (error) {
        console.error("Failed to load phrases from database:", error);
        throw error;
    }
}

/**
 * Save a new phrase to the database
 */
export async function savePhrase(p: Omit<SavedPhrase, "id" | "addedAt">): Promise<SavedPhrase> {
    try {
        const db = await ensureDb();
        const saved: SavedPhrase = {
            id: crypto.randomUUID(),
            addedAt: new Date().toISOString(),
            ...p,
        };

        // Generate stemmed versions for FTS
        const stemmed = generateStemmedPhrase({
            text: saved.text,
            translation: saved.translation,
            context: saved.context,
            lang: saved.lang,
        });

        await db.execute(
            `INSERT INTO phrases (id, lang, text, translation, context, tags_json, added_at, source_file, content_hash, line_no, col_offset, text_stemmed, translation_stemmed, context_stemmed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                saved.id,
                saved.lang,
                saved.text,
                saved.translation || null,
                saved.context || null,
                JSON.stringify(saved.tags || []),
                saved.addedAt,
                saved.sourceFile || null,
                saved.contentHash || null,
                saved.lineNo ?? null,
                saved.colOffset ?? null,
                stemmed.textStemmed,
                stemmed.translationStemmed,
                stemmed.contextStemmed,
            ],
        );

        // Notify UI listeners
        try {
            window.dispatchEvent(new CustomEvent(PHRASES_UPDATED_EVENT));
        } catch {
            // Ignore dispatch errors in non-browser contexts
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
        const db = await ensureDb();
        await db.delete("DELETE FROM phrases WHERE id = ?", [phraseId]);

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
        const db = await ensureDb();

        // Build the WHERE clause based on search criteria
        const whereConditions: string[] = [];
        const queryParams: (string | number)[] = [];
        let paramIndex = 1;

        // Use FTS5 MATCH for real full-text search if a query is present (Tauri only)
        // For browser, use LIKE queries on the search table
        let useFts = false;
        const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;

        if (searchText.trim()) {
            if (isTauri) {
                // Generate stemmed search terms for better matching
                const stemmedTerms = generateStemmedSearchTerms(searchText, "en");
                const stemmedQuery = stemmedTerms.map((t) => `"${t}"`).join(" ");
                const originalQuery = searchText
                    .split(/\s+/)
                    .map((t) => `"${t}"`)
                    .join(" ");

                // Combine original and stemmed search for comprehensive results
                const combinedQuery = `${originalQuery} OR ${stemmedQuery}`;
                whereConditions.push(`phrases_fts MATCH ?${paramIndex}`);
                queryParams.push(combinedQuery);
                paramIndex++;
                useFts = true;
            } else {
                // Browser mode: use stemmed search with LIKE queries
                const searchTerms = searchText.split(/\s+/);
                const stemmedTerms = generateStemmedSearchTerms(searchText, "en");

                // Create conditions for both original and stemmed terms
                const likeConditions = searchTerms.map(
                    () =>
                        `(ps.text LIKE ?${paramIndex++} OR ps.translation LIKE ?${paramIndex++} OR ps.context LIKE ?${paramIndex++} OR ps.text_stemmed LIKE ?${paramIndex++})`,
                );

                const stemmedConditions = stemmedTerms.map(
                    () =>
                        `(ps.text_stemmed LIKE ?${paramIndex++} OR ps.translation_stemmed LIKE ?${paramIndex++} OR ps.context_stemmed LIKE ?${paramIndex++})`,
                );

                whereConditions.push(
                    `(${likeConditions.join(" AND ")} OR ${stemmedConditions.join(" AND ")})`,
                );

                // Add parameters for original terms
                searchTerms.forEach((term) => {
                    const pattern = `%${term}%`;
                    queryParams.push(pattern, pattern, pattern, pattern);
                });

                // Add parameters for stemmed terms
                stemmedTerms.forEach((term) => {
                    const pattern = `%${term}%`;
                    queryParams.push(pattern, pattern, pattern);
                });
            }
        }

        // Filter by source file if scope is "current"
        if (scope === "current" && sourceFile) {
            whereConditions.push(`p.source_file = ?${paramIndex}`);
            queryParams.push(sourceFile);
            paramIndex++;
        }

        // Filter by tags if any are selected
        if (selectedTags.length > 0) {
            const tagConditions = selectedTags.map(() => `p.tags_json LIKE ?${paramIndex++}`);
            whereConditions.push(`(${tagConditions.join(" OR ")})`);
            selectedTags.forEach((tag) => queryParams.push(`%"${tag}"%`));
        }

        // Build the base query
        let baseQuery = "FROM phrases p";
        if (useFts) {
            baseQuery = "FROM phrases_fts";
        } else if (!isTauri && searchText.trim()) {
            // Browser mode with search: join with search table
            baseQuery = "FROM phrases p JOIN phrases_search ps ON p.id = ps.id";
        }

        const whereClause =
            whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

        // Get total count
        const countQuery = `SELECT COUNT(*) as count ${baseQuery} ${whereClause}`;
        const countResult = await db.select(countQuery, queryParams);
        const totalCount = countResult[0]?.count || 0;

        // Calculate pagination
        const totalPages = Math.ceil(totalCount / itemsPerPage);
        const offset = (page - 1) * itemsPerPage;

        // Get paginated results
        const selectQuery = `
            SELECT p.id, p.lang, p.text, p.translation, p.context, p.tags_json, p.added_at, p.source_file, p.content_hash, p.line_no, p.col_offset
            ${baseQuery}
            ${whereClause}
            ORDER BY ${useFts ? "rank" : "p.added_at DESC"}
            LIMIT ?${paramIndex} OFFSET ?${paramIndex + 1}
        `;
        queryParams.push(itemsPerPage, offset);

        const rows = await db.select(selectQuery, queryParams);

        const phrases = rows.map((r: any) => ({
            id: r.id,
            lang: r.lang,
            text: r.text,
            translation: r.translation ?? "",
            context: r.context ?? "",
            tags: r.tags_json ? JSON.parse(r.tags_json) : [],
            addedAt: r.added_at,
            sourceFile: r.source_file ?? undefined,
            contentHash: r.content_hash ?? undefined,
            lineNo: r.line_no ?? undefined,
            colOffset: r.col_offset ?? undefined,
        }));

        return {
            phrases,
            totalCount,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        };
    } catch (error) {
        console.error("Failed to search phrases:", error);
        // Return empty results on error
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
        const db = await ensureDb();
        const rows = await db.select(
            "SELECT tags_json FROM phrases WHERE tags_json IS NOT NULL AND tags_json != ''",
        );

        const allTags = new Set<string>();
        rows.forEach((row: any) => {
            try {
                const tags = JSON.parse(row.tags_json) as string[];
                tags.forEach((tag) => allTags.add(tag));
            } catch {
                // Ignore invalid JSON
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
        const db = await ensureDb();
        const rows = await db.select(
            "SELECT tags_json FROM phrases WHERE tags_json IS NOT NULL AND tags_json != ''",
        );

        const tagCounts = new Map<string, number>();
        rows.forEach((row: any) => {
            try {
                const tags = JSON.parse(row.tags_json) as string[];
                tags.forEach((tag) => {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                });
            } catch {
                // Ignore invalid JSON
            }
        });

        return tagCounts;
    } catch (error) {
        console.error("Failed to get tag counts:", error);
        return new Map();
    }
}

/**
 * Migrate existing phrases to include stemmed data
 */
export async function migrateExistingPhrasesToStemmed(): Promise<void> {
    try {
        const db = await ensureDb();

        // Find phrases that don't have stemmed data yet
        const phrasesToMigrate = await db.select(
            "SELECT id, lang, text, translation, context FROM phrases WHERE text_stemmed IS NULL OR text_stemmed = ''",
        );

        for (const phrase of phrasesToMigrate) {
            try {
                const stemmed = generateStemmedPhrase({
                    text: phrase.text,
                    translation: phrase.translation,
                    context: phrase.context,
                    lang: phrase.lang,
                });

                await db.execute(
                    "UPDATE phrases SET text_stemmed = ?, translation_stemmed = ?, context_stemmed = ? WHERE id = ?",
                    [
                        stemmed.textStemmed,
                        stemmed.translationStemmed,
                        stemmed.contextStemmed,
                        phrase.id,
                    ],
                );
            } catch (error) {
                console.error(`Failed to migrate phrase ${phrase.id}:`, error);
            }
        }

        // Rebuild FTS index to include stemmed data
        try {
            await db.execute(`INSERT INTO phrases_fts(phrases_fts) VALUES('rebuild')`);
            console.log("FTS index rebuilt with stemmed data");
        } catch (error) {
            console.error("Failed to rebuild FTS index:", error);
        }

        console.log(`Migration completed for ${phrasesToMigrate.length} phrases`);
    } catch (error) {
        console.error("Failed to migrate existing phrases to stemmed format:", error);
    }
}

/**
 * Clear all data from the database (for testing)
 */
export async function clearAllData(): Promise<void> {
    try {
        const db = await ensureDb();
        await db.execute("DELETE FROM phrases");
        console.log("Database cleared");
    } catch (error) {
        console.error("Failed to clear database:", error);
        throw error;
    }
}

/**
 * Seed the database with sample data for development/testing
 */
export async function seedSampleData(): Promise<void> {
    try {
        const db = await ensureDb();

        // Check if we already have data
        const existingCount = await db.select("SELECT COUNT(*) as count FROM phrases");
        if (existingCount[0]?.count > 0) {
            console.log("Database already has data, skipping seed");
            return;
        }

        const samplePhrases = [
            {
                text: "perfect woman",
                translation: "mujer perfecta",
                context:
                    "Mr. Morcheck awoke with a sour taste in his mouth and a laugh ringing in his ears.",
                tags: ["character", "description"],
                lang: "en",
                sourceFile: "the-perfect-woman.txt",
                contentHash: "abc123",
                lineNo: 1,
                colOffset: 0,
            },
            {
                text: "sour taste",
                translation: "sabor amargo",
                context:
                    "Mr. Morcheck awoke with a sour taste in his mouth and a laugh ringing in his ears.",
                tags: ["sensation", "description"],
                lang: "en",
                sourceFile: "the-perfect-woman.txt",
                contentHash: "abc123",
                lineNo: 1,
                colOffset: 25,
            },
            {
                text: "laugh ringing",
                translation: "risa resonando",
                context:
                    "Mr. Morcheck awoke with a sour taste in his mouth and a laugh ringing in his ears.",
                tags: ["sound", "memory"],
                lang: "en",
                sourceFile: "the-perfect-woman.txt",
                contentHash: "abc123",
                lineNo: 1,
                colOffset: 65,
            },
            {
                text: "Triad Morgan party",
                translation: "fiesta de Triad Morgan",
                context:
                    "It was George Owen-Clark's laugh the last thing he remembered from the Triad Morgan party.",
                tags: ["event", "proper-noun"],
                lang: "en",
                sourceFile: "the-perfect-woman.txt",
                contentHash: "abc123",
                lineNo: 2,
                colOffset: 0,
            },
            {
                text: "George Owen-Clark",
                translation: "George Owen-Clark",
                context:
                    "It was George Owen-Clark's laugh the last thing he remembered from the Triad Morgan party.",
                tags: ["character", "proper-noun"],
                lang: "en",
                sourceFile: "the-perfect-woman.txt",
                contentHash: "abc123",
                lineNo: 2,
                colOffset: 10,
            },
        ];

        for (const phrase of samplePhrases) {
            await savePhrase(phrase);
        }

        console.log(`Seeded database with ${samplePhrases.length} sample phrases`);
    } catch (error) {
        console.error("Failed to seed sample data:", error);
    }
}
