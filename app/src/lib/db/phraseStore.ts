/**
 * Phrase Store Module
 *
 * This module provides persistence for saved phrases using SQLite as the primary storage
 * with localStorage as a fallback. It handles:
 * - Phrase CRUD operations (Create, Read, Update, Delete)
 * - Content hash verification for phrase-text matching
 * - Position tracking for phrase decoration
 * - Database schema management and migrations
 * - Cross-component event communication
 *
 * Architecture:
 * - Uses Tauri SQL plugin for SQLite operations
 * - Implements localStorage fallback for development/testing
 * - Provides type-safe interfaces for phrase data
 * - Handles database initialization and schema updates
 */

import Database from "@tauri-apps/plugin-sql";

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
 * Storage Configuration
 *
 * Constants for localStorage fallback and event communication.
 */
const STORAGE_KEY = "readnlearn-phrases";

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
 * Handles database path resolution, schema creation, and migrations.
 *
 * Features:
 * - Resolves database path using Tauri's app data directory
 * - Creates phrases table with proper schema
 * - Handles schema migrations for existing installations
 * - Provides development logging for debugging
 *
 * @returns Promise<Database> - Initialized database instance
 * @throws Error if database initialization fails
 */
export async function ensureDb() {
    try {
        // Resolve a predictable absolute DB path when running under Tauri; fallback to default URL otherwise
        let dbUrl = "sqlite:readnlearn.db";
        try {
            const tauriWin = window as unknown as {
                __TAURI__?: { path?: { appDataDir?: () => Promise<string> } };
            };
            const appDataDir = await tauriWin.__TAURI__?.path?.appDataDir?.();
            if (appDataDir) {
                // Ensure trailing slash
                const base = appDataDir.endsWith("/") ? appDataDir : `${appDataDir}/`;
                dbUrl = `sqlite:${base}readnlearn.db`;
            }
        } catch {
            // ignore path resolution errors; default URL will be used
        }

        const db = await Database.load(dbUrl);

        // Create the phrases table with the complete schema
        await db.execute(
            `CREATE TABLE IF NOT EXISTS phrases (
          id TEXT PRIMARY KEY,
          lang TEXT NOT NULL,
          text TEXT NOT NULL,
          translation TEXT,
          context TEXT,
          tags_json TEXT,
          added_at TEXT NOT NULL,
          source_file TEXT,
          content_hash TEXT,
          line_no INTEGER,
          col_offset INTEGER
        )`,
        );

        // Try to add missing columns on existing installations (SQLite has no IF NOT EXISTS for columns)
        try {
            await db.execute(`ALTER TABLE phrases ADD COLUMN line_no INTEGER`);
        } catch {
            // Column may already exist
        }
        try {
            await db.execute(`ALTER TABLE phrases ADD COLUMN col_offset INTEGER`);
        } catch {
            // Column may already exist
        }

        // In development, log the actual DB file path to help diagnostics
        try {
            // Best-effort logging without relying on Node globals
            const rows = (await db.select("SELECT name, file FROM pragma_database_list")) as Array<{
                name: string;
                file: string;
            }>;
            console.log("SQLite database list:", rows);
        } catch {
            // ignore logging errors
        }
        return db;
    } catch (error) {
        console.error("Failed to initialize SQLite database:", error);
        throw new Error("Database initialization failed. Please check Tauri permissions.");
    }
}

export function loadPhrases(): SavedPhrase[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as SavedPhrase[]) : [];
    } catch {
        return [];
    }
}

// Unified loader: prefer DB, fallback to localStorage
export async function loadAllPhrases(): Promise<SavedPhrase[]> {
    try {
        const db = await ensureDb();
        const rows = (await db.select(
            "SELECT id, lang, text, translation, context, tags_json, added_at, source_file, content_hash, line_no, col_offset FROM phrases ORDER BY added_at DESC",
        )) as Array<{
            id: string;
            lang: string;
            text: string;
            translation: string | null;
            context: string | null;
            tags_json: string | null;
            added_at: string;
            source_file: string | null;
            content_hash: string | null;
            line_no: number | null;
            col_offset: number | null;
        }>;

        return rows.map((r) => ({
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
        console.error("Failed to load phrases from database, falling back to localStorage:", error);
        return loadPhrases();
    }
}

export async function savePhrase(p: Omit<SavedPhrase, "id" | "addedAt">): Promise<SavedPhrase> {
    try {
        const db = await ensureDb();
        const saved: SavedPhrase = {
            ...p,
            id: crypto.randomUUID(),
            addedAt: new Date().toISOString(),
        };
        await db.execute(
            `INSERT INTO phrases (id, lang, text, translation, context, tags_json, added_at, source_file, content_hash, line_no, col_offset)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
                saved.id,
                saved.lang,
                saved.text,
                saved.translation,
                saved.context,
                JSON.stringify(saved.tags),
                saved.addedAt,
                saved.sourceFile || null,
                saved.contentHash || null,
                saved.lineNo ?? null,
                saved.colOffset ?? null,
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

export async function removePhrase(phraseId: string): Promise<void> {
    try {
        const db = await ensureDb();
        await db.execute("DELETE FROM phrases WHERE id = $1", [phraseId]);

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

// One-time migration: move phrases from localStorage to SQLite
export async function migrateLocalStorageToSqlite(): Promise<{ moved: number }> {
    const legacy = loadPhrases();
    if (!legacy.length) return { moved: 0 };
    const db = await ensureDb();
    let moved = 0;
    for (const p of legacy) {
        try {
            await db.execute(
                `INSERT OR IGNORE INTO phrases (id, lang, text, translation, context, tags_json, added_at, source_file, content_hash, line_no, col_offset)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
                [
                    p.id || crypto.randomUUID(),
                    p.lang,
                    p.text,
                    p.translation ?? null,
                    p.context ?? null,
                    JSON.stringify(p.tags ?? []),
                    p.addedAt || new Date().toISOString(),
                    p.sourceFile ?? null,
                    p.contentHash ?? null,
                    p.lineNo ?? null,
                    p.colOffset ?? null,
                ],
            );
            moved++;
        } catch (e) {
            console.error("Migration insert failed for phrase:", p.id, e);
        }
    }
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
    try {
        window.dispatchEvent(new CustomEvent(PHRASES_UPDATED_EVENT));
    } catch {
        // ignore in non-browser
    }
    return { moved };
}
