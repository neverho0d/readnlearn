/**
 * SQLite Database Adapter (Tauri)
 *
 * Implements the DatabaseAdapter interface for SQLite via Tauri plugin.
 * This is the primary database for desktop applications.
 */

import Database from "@tauri-apps/plugin-sql";
import { DatabaseAdapter, SearchOptions, SearchResult, DatabaseInfo } from "./DatabaseAdapter";

export class SQLiteAdapter implements DatabaseAdapter {
    private db: Database | null = null;
    private connected = false;

    constructor(private dbPath: string = "sqlite:readnlearn.db") {}

    async connect(): Promise<void> {
        if (this.connected) return;

        try {
            // Resolve database path using Tauri's app data directory
            let dbUrl = this.dbPath;
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

            this.db = await Database.load(dbUrl);
            await this.initializeSchema();
            this.connected = true;
            console.log("SQLite database connected successfully");
        } catch (error) {
            console.error("Failed to connect to SQLite database:", error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.db) {
            // SQLite connections are automatically closed in Tauri
            this.db = null;
            this.connected = false;
        }
    }

    isConnected(): boolean {
        return this.connected && this.db !== null;
    }

    async execute(sql: string, params: any[] = []): Promise<void> {
        if (!this.db) throw new Error("Database not connected");
        await this.db.execute(sql, params);
    }

    async select<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        if (!this.db) throw new Error("Database not connected");
        return await this.db.select(sql, params);
    }

    async insert(sql: string, params: any[] = []): Promise<{ lastInsertId?: string | number }> {
        if (!this.db) throw new Error("Database not connected");
        await this.db.execute(sql, params);
        // SQLite doesn't return lastInsertId in Tauri plugin, so we return the ID from params
        return { lastInsertId: params[0] };
    }

    async update(sql: string, params: any[] = []): Promise<{ affectedRows: number }> {
        if (!this.db) throw new Error("Database not connected");
        await this.db.execute(sql, params);
        // SQLite doesn't return affected rows count in Tauri plugin
        return { affectedRows: 1 };
    }

    async delete(sql: string, params: any[] = []): Promise<{ affectedRows: number }> {
        if (!this.db) throw new Error("Database not connected");
        await this.db.execute(sql, params);
        // SQLite doesn't return affected rows count in Tauri plugin
        return { affectedRows: 1 };
    }

    async beginTransaction(): Promise<void> {
        await this.execute("BEGIN TRANSACTION");
    }

    async commit(): Promise<void> {
        await this.execute("COMMIT");
    }

    async rollback(): Promise<void> {
        await this.execute("ROLLBACK");
    }

    async searchPhrases(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        if (!this.db) throw new Error("Database not connected");

        const { limit = 20, offset = 0, tags = [], sourceFile } = options;

        // Build FTS5 query with stemming
        const stemmedTerms = this.generateStemmedTerms(query);
        const ftsQuery = `${query} OR ${stemmedTerms.join(" ")}`;

        let sql = `
            SELECT p.*, 
                   json_extract(p.tags_json, '$') as tags,
                   rank
            FROM phrases p
            JOIN phrases_fts fts ON p.rowid = fts.rowid
            WHERE phrases_fts MATCH ?
        `;

        const params: any[] = [ftsQuery];

        if (sourceFile) {
            sql += " AND p.source_file = ?";
            params.push(sourceFile);
        }

        if (tags.length > 0) {
            const tagConditions = tags.map(() => "p.tags_json LIKE ?");
            sql += ` AND (${tagConditions.join(" OR ")})`;
            tags.forEach((tag) => params.push(`%"${tag}"%`));
        }

        sql += " ORDER BY rank LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const results = await this.select(sql, params);
        return results.map(this.mapToSearchResult);
    }

    getDatabaseInfo(): DatabaseInfo {
        return {
            type: "sqlite",
            version: "3.x",
            features: {
                fts: true,
                transactions: true,
                jsonSupport: true,
                fullTextSearch: true,
            },
            limits: {
                maxQuerySize: 1000000, // 1MB
                maxResultSize: 100000, // 100K rows
            },
        };
    }

    private async initializeSchema(): Promise<void> {
        if (!this.db) throw new Error("Database not connected");

        // Create the phrases table
        await this.db.execute(`
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

        // Add missing columns if they don't exist (migration for existing databases)
        try {
            await this.db.execute(`ALTER TABLE phrases ADD COLUMN text_stemmed TEXT`);
        } catch (error) {
            // Column already exists, ignore error
        }

        try {
            await this.db.execute(`ALTER TABLE phrases ADD COLUMN translation_stemmed TEXT`);
        } catch (error) {
            // Column already exists, ignore error
        }

        try {
            await this.db.execute(`ALTER TABLE phrases ADD COLUMN context_stemmed TEXT`);
        } catch (error) {
            // Column already exists, ignore error
        }

        // Create FTS5 virtual table
        await this.db.execute(`
            CREATE VIRTUAL TABLE IF NOT EXISTS phrases_fts USING fts5(
                text, translation, context, tags_json, source_file,
                text_stemmed, translation_stemmed, context_stemmed,
                content='phrases', content_rowid='rowid',
                tokenize='unicode61'
            )
        `);

        // Create triggers to keep FTS synchronized
        await this.db.execute(`
            CREATE TRIGGER IF NOT EXISTS phrases_ai AFTER INSERT ON phrases BEGIN
                INSERT INTO phrases_fts(rowid, text, translation, context, tags_json, source_file, text_stemmed, translation_stemmed, context_stemmed)
                VALUES (new.rowid, new.text, new.translation, new.context, new.tags_json, new.source_file, new.text_stemmed, new.translation_stemmed, new.context_stemmed);
            END
        `);

        await this.db.execute(`
            CREATE TRIGGER IF NOT EXISTS phrases_ad AFTER DELETE ON phrases BEGIN
                DELETE FROM phrases_fts WHERE rowid = old.rowid;
            END
        `);

        await this.db.execute(`
            CREATE TRIGGER IF NOT EXISTS phrases_au AFTER UPDATE ON phrases BEGIN
                DELETE FROM phrases_fts WHERE rowid = old.rowid;
                INSERT INTO phrases_fts(rowid, text, translation, context, tags_json, source_file, text_stemmed, translation_stemmed, context_stemmed)
                VALUES (new.rowid, new.text, new.translation, new.context, new.tags_json, new.source_file, new.text_stemmed, new.translation_stemmed, new.context_stemmed);
            END
        `);
    }

    private generateStemmedTerms(query: string): string[] {
        // Import stemming utility
        const { generateStemmedSearchTerms } = require("../../utils/stemming");
        return generateStemmedSearchTerms(query, "en");
    }

    private mapToSearchResult(row: any): SearchResult {
        return {
            id: row.id,
            text: row.text,
            translation: row.translation || "",
            context: row.context || "",
            tags: JSON.parse(row.tags_json || "[]"),
            addedAt: row.added_at,
            sourceFile: row.source_file || "",
            relevanceScore: row.rank,
        };
    }
}
