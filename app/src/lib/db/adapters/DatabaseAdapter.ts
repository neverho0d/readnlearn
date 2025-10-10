/**
 * Database Adapter Interface
 *
 * This interface defines the contract for all database implementations,
 * allowing the application to work with different database backends:
 * - SQLite (Tauri desktop)
 * - PostgreSQL (Cloud deployment)
 * - MySQL (Cloud deployment)
 * - SQLite (Browser with sql.js - fallback only)
 */

export interface DatabaseAdapter {
    // Connection management
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;

    // Basic CRUD operations
    execute(sql: string, params?: any[]): Promise<void>;
    select<T = any>(sql: string, params?: any[]): Promise<T[]>;
    insert(sql: string, params?: any[]): Promise<{ lastInsertId?: string | number }>;
    update(sql: string, params?: any[]): Promise<{ affectedRows: number }>;
    delete(sql: string, params?: any[]): Promise<{ affectedRows: number }>;

    // Transaction support
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;

    // Full-text search (database-specific implementation)
    searchPhrases(query: string, options?: SearchOptions): Promise<SearchResult[]>;

    // Database-specific features
    getDatabaseInfo(): DatabaseInfo;
}

export interface SearchOptions {
    limit?: number;
    offset?: number;
    tags?: string[];
    sourceFile?: string;
    language?: string;
}

export interface SearchResult {
    id: string;
    text: string;
    translation: string;
    context: string;
    tags: string[];
    addedAt: string;
    sourceFile: string;
    relevanceScore?: number; // For FTS ranking
}

export interface DatabaseInfo {
    type: "sqlite" | "postgresql" | "mysql" | "sqlite-browser";
    version: string;
    features: {
        fts: boolean;
        transactions: boolean;
        jsonSupport: boolean;
        fullTextSearch: boolean;
    };
    limits: {
        maxConnections?: number;
        maxQuerySize?: number;
        maxResultSize?: number;
    };
}
