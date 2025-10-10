/**
 * PostgreSQL Database Adapter (Cloud)
 *
 * Implements the DatabaseAdapter interface for PostgreSQL.
 * This adapter is designed for cloud deployment scenarios.
 */

import { DatabaseAdapter, SearchOptions, SearchResult, DatabaseInfo } from "./DatabaseAdapter";

export class PostgreSQLAdapter implements DatabaseAdapter {
    private client: any = null;
    private connected = false;

    constructor(
        private connectionString: string,
        private options: {
            host?: string;
            port?: number;
            database?: string;
            username?: string;
            password?: string;
            ssl?: boolean;
        } = {},
    ) {}

    async connect(): Promise<void> {
        if (this.connected) return;

        try {
            // Dynamic import of pg (PostgreSQL client)
            // This will only be available in cloud deployment environments
            const { Client } = await import("pg");

            this.client = new Client({
                connectionString: this.connectionString,
                ...this.options,
            });

            await this.client.connect();
            await this.initializeSchema();
            this.connected = true;
            console.log("PostgreSQL database connected successfully");
        } catch (error) {
            console.error("Failed to connect to PostgreSQL database:", error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.end();
            this.client = null;
            this.connected = false;
        }
    }

    isConnected(): boolean {
        return this.connected && this.client !== null;
    }

    async execute(sql: string, params: any[] = []): Promise<void> {
        if (!this.client) throw new Error("Database not connected");
        await this.client.query(sql, params);
    }

    async select<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        if (!this.client) throw new Error("Database not connected");
        const result = await this.client.query(sql, params);
        return result.rows;
    }

    async insert(sql: string, params: any[] = []): Promise<{ lastInsertId?: string | number }> {
        if (!this.client) throw new Error("Database not connected");
        const result = await this.client.query(sql, params);
        return { lastInsertId: result.rows[0]?.id };
    }

    async update(sql: string, params: any[] = []): Promise<{ affectedRows: number }> {
        if (!this.client) throw new Error("Database not connected");
        const result = await this.client.query(sql, params);
        return { affectedRows: result.rowCount || 0 };
    }

    async delete(sql: string, params: any[] = []): Promise<{ affectedRows: number }> {
        if (!this.client) throw new Error("Database not connected");
        const result = await this.client.query(sql, params);
        return { affectedRows: result.rowCount || 0 };
    }

    async beginTransaction(): Promise<void> {
        await this.execute("BEGIN");
    }

    async commit(): Promise<void> {
        await this.execute("COMMIT");
    }

    async rollback(): Promise<void> {
        await this.execute("ROLLBACK");
    }

    async searchPhrases(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        if (!this.client) throw new Error("Database not connected");

        const { limit = 20, offset = 0, tags = [], sourceFile } = options;

        // PostgreSQL full-text search with stemming
        const stemmedTerms = this.generateStemmedTerms(query);
        const searchTerms = [query, ...stemmedTerms].map((term) => `'${term}'`).join(" | ");

        let sql = `
            SELECT p.*, 
                   p.tags_json::jsonb as tags,
                   ts_rank(
                       to_tsvector('english', p.text || ' ' || p.translation || ' ' || p.context),
                       plainto_tsquery('english', $1)
                   ) as rank
            FROM phrases p
            WHERE to_tsvector('english', p.text || ' ' || p.translation || ' ' || p.context) @@ plainto_tsquery('english', $1)
        `;

        const params: any[] = [searchTerms];
        let paramIndex = 2;

        if (sourceFile) {
            sql += ` AND p.source_file = $${paramIndex}`;
            params.push(sourceFile);
            paramIndex++;
        }

        if (tags.length > 0) {
            const tagConditions = tags.map(() => `p.tags_json::jsonb ? $${paramIndex++}`);
            sql += ` AND (${tagConditions.join(" OR ")})`;
            tags.forEach((tag) => params.push(tag));
        }

        sql += ` ORDER BY rank DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const results = await this.select(sql, params);
        return results.map(this.mapToSearchResult);
    }

    getDatabaseInfo(): DatabaseInfo {
        return {
            type: "postgresql",
            version: "13+",
            features: {
                fts: true,
                transactions: true,
                jsonSupport: true,
                fullTextSearch: true,
            },
            limits: {
                maxConnections: 100,
                maxQuerySize: 10000000, // 10MB
                maxResultSize: 1000000, // 1M rows
            },
        };
    }

    private async initializeSchema(): Promise<void> {
        if (!this.client) throw new Error("Database not connected");

        // Create the phrases table
        await this.client.query(`
            CREATE TABLE IF NOT EXISTS phrases (
                id TEXT PRIMARY KEY,
                lang TEXT NOT NULL,
                text TEXT NOT NULL,
                translation TEXT,
                context TEXT,
                tags_json JSONB,
                added_at TIMESTAMP NOT NULL,
                source_file TEXT,
                content_hash TEXT,
                line_no INTEGER,
                col_offset INTEGER,
                text_stemmed TEXT,
                translation_stemmed TEXT,
                context_stemmed TEXT
            )
        `);

        // Create indexes for better performance
        await this.client.query(`
            CREATE INDEX IF NOT EXISTS idx_phrases_text_fts 
            ON phrases USING gin(to_tsvector('english', text || ' ' || translation || ' ' || context))
        `);

        await this.client.query(`
            CREATE INDEX IF NOT EXISTS idx_phrases_tags 
            ON phrases USING gin(tags_json)
        `);

        await this.client.query(`
            CREATE INDEX IF NOT EXISTS idx_phrases_source_file 
            ON phrases (source_file)
        `);

        await this.client.query(`
            CREATE INDEX IF NOT EXISTS idx_phrases_added_at 
            ON phrases (added_at)
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
            tags: row.tags || [],
            addedAt: row.added_at,
            sourceFile: row.source_file || "",
            relevanceScore: parseFloat(row.rank) || 0,
        };
    }
}
