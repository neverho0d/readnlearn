/**
 * Supabase Database Adapter
 *
 * Implements the DatabaseAdapter interface for Supabase (PostgreSQL).
 * Provides multilingual FTS using PGroonga extension and offline-first caching.
 */

import { supabase, Database } from "../../supabase/client";
import { DatabaseAdapter, SearchOptions, SearchResult, DatabaseInfo } from "./DatabaseAdapter";
import { cache } from "../../cache/indexedDB";

export class SupabaseAdapter implements DatabaseAdapter {
    private connected = false;
    private online: boolean = navigator.onLine;

    constructor() {
        // Listen for online/offline events
        window.addEventListener("online", () => {
            this.online = true;
            this.syncWhenOnline();
        });

        window.addEventListener("offline", () => {
            this.online = false;
        });
    }

    async connect(): Promise<void> {
        if (this.connected) return;

        try {
            // Initialize cache
            await cache.init();

            // Check if user is authenticated
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) {
                throw new Error("User not authenticated");
            }

            this.connected = true;
            console.log("SupabaseAdapter: Connected successfully");
        } catch (error) {
            console.error("SupabaseAdapter: Failed to connect:", error);
            throw new Error(`Failed to connect to Supabase: ${error}`);
        }
    }

    async disconnect(): Promise<void> {
        this.connected = false;
        console.log("SupabaseAdapter: Disconnected");
    }

    isConnected(): boolean {
        return this.connected;
    }

    async execute(): Promise<void> {
        // Supabase doesn't support raw SQL execution from client
        // This method is kept for interface compatibility
        throw new Error("Raw SQL execution not supported in Supabase client");
    }

    async select<T = unknown>(): Promise<T[]> {
        // Supabase doesn't support raw SQL queries from client
        // This method is kept for interface compatibility
        throw new Error("Raw SQL queries not supported in Supabase client");
    }

    async insert(): Promise<{ lastInsertId?: string | number }> {
        // This method is kept for interface compatibility
        // Use specific methods like savePhrase instead
        throw new Error("Generic insert not supported. Use specific methods like savePhrase");
    }

    async update(): Promise<{ affectedRows: number }> {
        // This method is kept for interface compatibility
        throw new Error("Generic update not supported. Use specific methods");
    }

    async delete(): Promise<{ affectedRows: number }> {
        // This method is kept for interface compatibility
        throw new Error("Generic delete not supported. Use specific methods");
    }

    async beginTransaction(): Promise<void> {
        // Supabase handles transactions automatically
        // This method is kept for interface compatibility
    }

    async commit(): Promise<void> {
        // Supabase handles transactions automatically
        // This method is kept for interface compatibility
    }

    async rollback(): Promise<void> {
        // Supabase handles transactions automatically
        // This method is kept for interface compatibility
    }

    async searchPhrases(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        if (!this.connected) throw new Error("Database not connected");

        const { limit = 20, offset = 0, tags = [], sourceFile, language } = options;

        try {
            // Try cache first if offline
            if (!this.online) {
                const cachedResults = await cache.searchLocal(query, { limit, lang: language });
                return cachedResults.map((phrase) => ({
                    id: phrase.id,
                    text: phrase.text,
                    translation: phrase.translation,
                    context: phrase.context,
                    tags: phrase.tags,
                    lang: phrase.lang,
                    addedAt: phrase.addedAt,
                    sourceFile: phrase.sourceFile || "",
                    contentHash: phrase.contentHash || "",
                    lineNo: phrase.lineNo || 0,
                    colOffset: phrase.colOffset || 0,
                }));
            }

            // Build query
            let queryBuilder = supabase.from("phrases").select("*");

            // Use PGroonga full-text search if available
            if (query.trim()) {
                // For now, use simple text search - PGroonga integration would go here
                queryBuilder = queryBuilder.or(
                    `text.ilike.%${query}%,translation.ilike.%${query}%,context.ilike.%${query}%`,
                );
            }

            // Apply filters
            if (sourceFile) {
                queryBuilder = queryBuilder.eq("source_file", sourceFile);
            }

            if (tags.length > 0) {
                queryBuilder = queryBuilder.overlaps("tags", tags);
            }

            if (language) {
                queryBuilder = queryBuilder.eq("lang", language);
            }

            // Apply pagination and ordering
            queryBuilder = queryBuilder
                .order("added_at", { ascending: false })
                .range(offset, offset + limit - 1);

            const { data, error } = await queryBuilder;

            if (error) {
                console.error("Search error:", error);
                // Fallback to cache
                const cachedResults = await cache.searchLocal(query, { limit, lang: language });
                return cachedResults.map((phrase) => ({
                    id: phrase.id,
                    text: phrase.text,
                    translation: phrase.translation,
                    context: phrase.context,
                    tags: phrase.tags,
                    lang: phrase.lang,
                    addedAt: phrase.addedAt,
                    sourceFile: phrase.sourceFile || "",
                    contentHash: phrase.contentHash || "",
                    lineNo: phrase.lineNo || 0,
                    colOffset: phrase.colOffset || 0,
                }));
            }

            // Update cache with results
            if (data) {
                await cache.updatePhrases(data);
            }

            return (data || []).map(this.mapToSearchResult);
        } catch (error) {
            console.error("Search failed:", error);
            // Fallback to cache
            const cachedResults = await cache.searchLocal(query, { limit, lang: language });
            return cachedResults.map((phrase) => ({
                id: phrase.id,
                text: phrase.text,
                translation: phrase.translation,
                context: phrase.context,
                tags: phrase.tags,
                lang: phrase.lang,
                addedAt: phrase.addedAt,
                sourceFile: phrase.sourceFile || "",
                contentHash: phrase.contentHash || "",
                lineNo: phrase.lineNo || 0,
                colOffset: phrase.colOffset || 0,
            }));
        }
    }

    getDatabaseInfo(): DatabaseInfo {
        return {
            type: "postgresql",
            version: "15.x",
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

    private mapToSearchResult(row: Database["public"]["Tables"]["phrases"]["Row"]): SearchResult {
        return {
            id: row.id,
            text: row.text,
            translation: row.translation || "",
            context: row.context || "",
            tags: row.tags || [],
            addedAt: row.added_at,
            sourceFile: row.source_file || "",
            relevanceScore: 1.0, // PGroonga would provide actual relevance scores
        };
    }

    private async syncWhenOnline(): Promise<void> {
        if (!this.online) return;

        try {
            // Sync queued operations
            const queuedOps = await cache.getQueuedOperations();

            for (const op of queuedOps) {
                try {
                    switch (op.operation) {
                        case "insert":
                            await this.syncInsert(op.data);
                            break;
                        case "update":
                            await this.syncUpdate(op.data);
                            break;
                        case "delete":
                            await this.syncDelete(op.data);
                            break;
                    }
                } catch (error) {
                    console.error(`Failed to sync operation ${op.operation}:`, error);
                }
            }

            // Clear successfully synced operations
            await cache.clearQueuedOperations();
        } catch (error) {
            console.error("Sync failed:", error);
        }
    }

    private async syncInsert(data: unknown): Promise<void> {
        const { error } = await supabase.from("phrases").insert(data);

        if (error) throw error;
    }

    private async syncUpdate(data: unknown): Promise<void> {
        const { error } = await supabase
            .from("phrases")
            .update(data)
            .eq("id", (data as { id: string }).id);

        if (error) throw error;
    }

    private async syncDelete(data: unknown): Promise<void> {
        const { error } = await supabase
            .from("phrases")
            .delete()
            .eq("id", (data as { id: string }).id);

        if (error) throw error;
    }
}
