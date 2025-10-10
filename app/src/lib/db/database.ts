/**
 * Database Abstraction Layer
 *
 * Provides a unified interface for database operations that works in both
 * browser (using in-memory database) and Tauri (using tauri-plugin-sql) environments.
 */

import Database from "@tauri-apps/plugin-sql";
import { DatabaseFactory } from "./adapters/DatabaseFactory";
import { DatabaseAdapter } from "./adapters/DatabaseAdapter";

// Legacy browser SQLite database implementation using sql.js (fallback only)
let browserDb: any = null;

/**
 * Initialize SQLite database for browser environment using sql.js
 */
async function initBrowserSQLite(): Promise<any> {
    if (browserDb) return browserDb;

    try {
        // Import sql.js dynamically
        const initSqlJs = (await import("sql.js")).default;
        const SqlJs = await initSqlJs();

        // Try to load existing database from localStorage
        const savedDb = localStorage.getItem("readnlearn_db");
        if (savedDb) {
            try {
                const data = new Uint8Array(JSON.parse(savedDb));
                browserDb = new SqlJs.Database(data);
                console.log("Loaded existing database from localStorage");
            } catch (error) {
                console.error("Failed to load database from localStorage:", error);
                browserDb = new SqlJs.Database();
            }
        } else {
            browserDb = new SqlJs.Database();
        }

        // Create the phrases table
        browserDb.run(`
            CREATE TABLE IF NOT EXISTS phrases (
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
                col_offset INTEGER,
                text_stemmed TEXT,
                translation_stemmed TEXT,
                context_stemmed TEXT
            )
        `);

        // Note: sql.js doesn't support FTS5, so we'll use regular tables for search
        // Create a search index table instead
        browserDb.run(`
            CREATE TABLE IF NOT EXISTS phrases_search (
                id TEXT PRIMARY KEY,
                text TEXT,
                translation TEXT,
                context TEXT,
                tags_json TEXT,
                source_file TEXT,
                text_stemmed TEXT,
                translation_stemmed TEXT,
                context_stemmed TEXT,
                FOREIGN KEY(id) REFERENCES phrases(id)
            )
        `);

        // Create triggers to keep search index synchronized
        browserDb.run(`
            CREATE TRIGGER IF NOT EXISTS phrases_ai AFTER INSERT ON phrases BEGIN
                INSERT INTO phrases_search(id, text, translation, context, tags_json, source_file, text_stemmed, translation_stemmed, context_stemmed)
                VALUES (new.id, new.text, new.translation, new.context, new.tags_json, new.source_file, new.text_stemmed, new.translation_stemmed, new.context_stemmed);
            END
        `);

        browserDb.run(`
            CREATE TRIGGER IF NOT EXISTS phrases_ad AFTER DELETE ON phrases BEGIN
                DELETE FROM phrases_search WHERE id = old.id;
            END
        `);

        browserDb.run(`
            CREATE TRIGGER IF NOT EXISTS phrases_au AFTER UPDATE ON phrases BEGIN
                UPDATE phrases_search SET 
                    text = new.text, translation = new.translation, context = new.context, 
                    tags_json = new.tags_json, source_file = new.source_file,
                    text_stemmed = new.text_stemmed, translation_stemmed = new.translation_stemmed, 
                    context_stemmed = new.context_stemmed
                WHERE id = new.id;
            END
        `);

        console.log("Browser SQLite database initialized with sql.js");
        return browserDb;
    } catch (error) {
        console.error("Failed to initialize browser SQLite:", error);

        // If WASM loading fails, try alternative approach
        if (error instanceof Error && error.message.includes("WebAssembly")) {
            console.log("WASM loading failed, trying alternative sql.js configuration...");
            try {
                const initSqlJs = (await import("sql.js")).default;
                const SqlJs = await initSqlJs({
                    // Try without locateFile to use default behavior
                });
                browserDb = new SqlJs.Database();
                console.log("Browser SQLite database initialized with fallback configuration");
                return browserDb;
            } catch (fallbackError) {
                console.error("Fallback initialization also failed:", fallbackError);
            }
        }

        throw error;
    }
}

/**
 * Save the browser database to localStorage for persistence
 */
function saveBrowserDatabase(): void {
    if (browserDb) {
        try {
            const data = browserDb.export();
            localStorage.setItem("readnlearn_db", JSON.stringify(Array.from(data)));
            console.log("Database saved to localStorage");
        } catch (error) {
            console.error("Failed to save database to localStorage:", error);
        }
    }
}

/**
 * Initialize SQLite for Tauri environment
 */
async function initTauriSQLite(): Promise<any> {
    // Resolve database path using Tauri's app data directory
    let dbUrl = "sqlite:readnlearn.db";
    try {
        const tauriWin = window as unknown as {
            __TAURI__?: { path?: { appDataDir?: () => Promise<string> } };
        };
        const appDataDir = await tauriWin.__TAURI__?.path?.appDataDir?.();
        if (appDataDir) {
            const base = appDataDir.endsWith("/") ? appDataDir : `${appDataDir}/`;
            dbUrl = `sqlite:${base}readnlearn.db`;
        }
    } catch {
        // ignore path resolution errors; default URL will be used
    }

    const db = await Database.load(dbUrl);

    // Create the phrases table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS phrases (
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
            col_offset INTEGER,
            text_stemmed TEXT,
            translation_stemmed TEXT,
            context_stemmed TEXT
        )
    `);

    // Create FTS5 virtual table
    await db.execute(`
        CREATE VIRTUAL TABLE IF NOT EXISTS phrases_fts USING fts5(
            text, translation, context, tags_json, source_file,
            text_stemmed, translation_stemmed, context_stemmed,
            content='phrases', content_rowid='rowid', tokenize='unicode61'
        )
    `);

    // Create triggers to keep FTS synchronized
    await db.execute(`
        CREATE TRIGGER IF NOT EXISTS phrases_ai AFTER INSERT ON phrases BEGIN
            INSERT INTO phrases_fts(rowid, text, translation, context, tags_json, source_file, text_stemmed, translation_stemmed, context_stemmed)
            VALUES (new.rowid, new.text, new.translation, new.context, new.tags_json, new.source_file, new.text_stemmed, new.translation_stemmed, new.context_stemmed);
        END
    `);

    await db.execute(`
        CREATE TRIGGER IF NOT EXISTS phrases_ad AFTER DELETE ON phrases BEGIN
            DELETE FROM phrases_fts WHERE rowid = old.rowid;
        END
    `);

    await db.execute(`
        CREATE TRIGGER IF NOT EXISTS phrases_au AFTER UPDATE ON phrases BEGIN
            DELETE FROM phrases_fts WHERE rowid = old.rowid;
            INSERT INTO phrases_fts(rowid, text, translation, context, tags_json, source_file, text_stemmed, translation_stemmed, context_stemmed)
            VALUES (new.rowid, new.text, new.translation, new.context, new.tags_json, new.source_file, new.text_stemmed, new.translation_stemmed, new.context_stemmed);
        END
    `);

    console.log("Tauri SQLite database initialized");
    return db;
}

/**
 * Get the appropriate database instance for the current environment
 *
 * @deprecated Use DatabaseFactory.getInstance() instead for new code
 */
export async function getDatabase(): Promise<any> {
    // For Tauri applications, always use Tauri SQLite
    // Browser mode is only for standalone web applications

    // Wait a bit for Tauri API to load if we're in a Tauri environment
    if (typeof window !== "undefined") {
        // Check if we're in a Tauri environment by looking for Tauri-specific globals
        const hasTauriGlobals =
            typeof (window as any).__TAURI__ !== "undefined" ||
            typeof (window as any).__TAURI_INTERNALS__ !== "undefined" ||
            typeof (window as any).__TAURI_METADATA__ !== "undefined";

        if (hasTauriGlobals) {
            console.log("✅ Tauri environment detected via globals");
            return await initTauriSQLite();
        }
    }

    // Primary Tauri detection: window.__TAURI__ (most reliable)
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;

    // Secondary detection: Vite-exposed environment variables
    const isTauriPlatform =
        typeof __TAURI_PLATFORM__ !== "undefined" && __TAURI_PLATFORM__ !== null;

    // Tertiary detection: process.env (fallback)
    const isTauriProcess =
        typeof process !== "undefined" && process.env?.TAURI_PLATFORM !== undefined;

    // Protocol detection (for Tauri apps)
    const isTauriProtocol = typeof window !== "undefined" && window.location.protocol === "tauri:";

    // Additional detection: Check for Tauri-specific user agent or other indicators
    const isTauriUserAgent =
        typeof window !== "undefined" && window.navigator.userAgent.includes("Tauri");

    const isTauriApp =
        isTauri || isTauriPlatform || isTauriProcess || isTauriProtocol || isTauriUserAgent;

    console.log("Tauri detection results:", {
        isTauri,
        isTauriPlatform,
        isTauriProcess,
        isTauriProtocol,
        isTauriUserAgent,
        isTauriApp,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "N/A",
        location: typeof window !== "undefined" ? window.location.href : "N/A",
    });

    if (isTauriApp) {
        console.log("✅ Using Tauri SQLite database");
        return await initTauriSQLite();
    } else {
        // Only use browser mode for standalone web applications
        console.warn(
            "⚠️ Running in browser mode - this should only be used for standalone web apps, not Tauri development",
        );
        return await initBrowserSQLite();
    }
}

/**
 * Get the modern database adapter instance
 * This is the recommended way to access the database
 */
export async function getDatabaseAdapter(): Promise<DatabaseAdapter> {
    return await DatabaseFactory.getInstance();
}

/**
 * Unified database interface that works in both environments
 */
export class DatabaseInterface {
    private db: any;
    private isTauri: boolean;

    constructor(db: any, isTauri: boolean) {
        this.db = db;
        this.isTauri = isTauri;
    }

    async execute(sql: string, params: any[] = []): Promise<void> {
        if (this.isTauri) {
            await this.db.execute(sql, params);
        } else {
            // For sql.js, use run method directly
            this.db.run(sql, params);
            // Save database to localStorage after modification
            saveBrowserDatabase();
        }
    }

    async select(sql: string, params: any[] = []): Promise<any[]> {
        if (this.isTauri) {
            return await this.db.select(sql, params);
        } else {
            // For sql.js, use prepare/step/getAsObject
            const stmt = this.db.prepare(sql);
            if (params.length > 0) {
                stmt.bind(params);
            }
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
        }
    }

    async insert(sql: string, params: any[] = []): Promise<any> {
        if (this.isTauri) {
            return await this.db.execute(sql, params);
        } else {
            this.db.run(sql, params);
            // Save database to localStorage after modification
            saveBrowserDatabase();
            return { lastInsertId: params[0] }; // Return the ID from params
        }
    }

    async delete(sql: string, params: any[] = []): Promise<void> {
        if (this.isTauri) {
            await this.db.execute(sql, params);
        } else {
            this.db.run(sql, params);
            // Save database to localStorage after modification
            saveBrowserDatabase();
        }
    }
}

/**
 * Get a database interface instance
 *
 * @deprecated Use getDatabaseAdapter() instead for new code
 */
export async function getDatabaseInterface(): Promise<DatabaseInterface> {
    const db = await getDatabase();
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;
    return new DatabaseInterface(db, isTauri);
}
