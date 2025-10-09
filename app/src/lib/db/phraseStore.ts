// Simple persistence for phrases
// Uses Tauri SQL plugin when available; falls back to localStorage
import Database from "@tauri-apps/plugin-sql";

export interface SavedPhrase {
    id: string;
    lang: string; // L2
    text: string;
    translation: string;
    context: string;
    tags: string[];
    addedAt: string; // ISO
    sourceFile?: string; // Original filename
    contentHash?: string; // Hash of file content for verification
    // Position of the phrase in the original text (1-based line, 0-based column offset)
    lineNo?: number;
    colOffset?: number;
}

const STORAGE_KEY = "readnlearn-phrases";

export const PHRASES_UPDATED_EVENT = "readnlearn:phrases-updated";

// Generate a simple hash for content verification
export function generateContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

export async function ensureDb() {
    try {
        const db = await Database.load("sqlite:readnlearn.db");
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
        console.error("Failed to save phrase to database, falling back to localStorage:", error);
        // Fallback to localStorage
        const current = loadPhrases();
        const saved: SavedPhrase = {
            ...p,
            id: crypto.randomUUID(),
            addedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([saved, ...current]));
        // Notify UI listeners
        try {
            window.dispatchEvent(new CustomEvent(PHRASES_UPDATED_EVENT));
        } catch {
            // Ignore dispatch errors in non-browser contexts
        }
        return saved;
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
        console.error(
            "Failed to remove phrase from database, falling back to localStorage:",
            error,
        );
        // Fallback to localStorage
        const current = loadPhrases();
        const updated = current.filter((p) => p.id !== phraseId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Notify UI listeners
        try {
            window.dispatchEvent(new CustomEvent(PHRASES_UPDATED_EVENT));
        } catch {
            // Ignore dispatch errors in non-browser contexts
        }
    }
}
