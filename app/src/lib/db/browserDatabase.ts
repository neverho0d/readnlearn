/**
 * Browser In-Memory Database
 *
 * A simple in-memory database implementation for browser environments
 * that provides SQL-like operations without external dependencies.
 */

export interface BrowserPhrase {
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
    text_stemmed: string | null;
    translation_stemmed: string | null;
    context_stemmed: string | null;
}

export interface BrowserSearchPhrase {
    id: string;
    text: string;
    translation: string | null;
    context: string | null;
    tags_json: string | null;
    source_file: string | null;
    text_stemmed: string | null;
    translation_stemmed: string | null;
    context_stemmed: string | null;
}

export class BrowserDatabase {
    private phrases: Map<string, BrowserPhrase> = new Map();
    private search: Map<string, BrowserSearchPhrase> = new Map();

    constructor() {
        console.log("Browser in-memory database initialized");
    }

    /**
     * Execute SQL-like operations
     */
    exec(sql: string): void {
        // Parse and execute SQL-like operations
        if (sql.includes("CREATE TABLE")) {
            // Table creation - no-op for our Map-based approach
            return;
        }
        if (sql.includes("CREATE TRIGGER")) {
            // Trigger creation - no-op for our Map-based approach
            return;
        }
    }

    /**
     * Prepare a statement (simplified)
     */
    prepare(sql: string) {
        return new BrowserStatement(sql, this);
    }

    /**
     * Get all phrases
     */
    getAllPhrases(): BrowserPhrase[] {
        return Array.from(this.phrases.values());
    }

    /**
     * Get phrase by ID
     */
    getPhrase(id: string): BrowserPhrase | undefined {
        return this.phrases.get(id);
    }

    /**
     * Insert a phrase
     */
    insertPhrase(phrase: BrowserPhrase): void {
        this.phrases.set(phrase.id, phrase);

        // Also add to search index
        this.search.set(phrase.id, {
            id: phrase.id,
            text: phrase.text,
            translation: phrase.translation,
            context: phrase.context,
            tags_json: phrase.tags_json,
            source_file: phrase.source_file,
            text_stemmed: phrase.text_stemmed,
            translation_stemmed: phrase.translation_stemmed,
            context_stemmed: phrase.context_stemmed,
        });
    }

    /**
     * Update a phrase
     */
    updatePhrase(id: string, updates: Partial<BrowserPhrase>): void {
        const existing = this.phrases.get(id);
        if (existing) {
            const updated = { ...existing, ...updates };
            this.phrases.set(id, updated);

            // Update search index
            this.search.set(id, {
                id: updated.id,
                text: updated.text,
                translation: updated.translation,
                context: updated.context,
                tags_json: updated.tags_json,
                source_file: updated.source_file,
                text_stemmed: updated.text_stemmed,
                translation_stemmed: updated.translation_stemmed,
                context_stemmed: updated.context_stemmed,
            });
        }
    }

    /**
     * Delete a phrase
     */
    deletePhrase(id: string): void {
        this.phrases.delete(id);
        this.search.delete(id);
    }

    /**
     * Search phrases
     */
    searchPhrases(
        query: string,
        filters: {
            tags?: string[];
            sourceFile?: string;
            limit?: number;
            offset?: number;
        } = {},
    ): BrowserPhrase[] {
        let results = Array.from(this.phrases.values());

        // Apply text search
        if (query) {
            const searchTerms = query.toLowerCase().split(/\s+/);
            results = results.filter((phrase) => {
                const searchableText = [
                    phrase.text,
                    phrase.translation,
                    phrase.context,
                    phrase.text_stemmed,
                    phrase.translation_stemmed,
                    phrase.context_stemmed,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchTerms.every((term) => searchableText.includes(term));
            });
        }

        // Apply tag filters
        if (filters.tags && filters.tags.length > 0) {
            results = results.filter((phrase) => {
                if (!phrase.tags_json) return false;
                try {
                    const tags = JSON.parse(phrase.tags_json);
                    return filters.tags!.some((filterTag) => tags.includes(filterTag));
                } catch {
                    return false;
                }
            });
        }

        // Apply source file filter
        if (filters.sourceFile) {
            results = results.filter((phrase) => phrase.source_file === filters.sourceFile);
        }

        // Apply pagination
        if (filters.offset) {
            results = results.slice(filters.offset);
        }
        if (filters.limit) {
            results = results.slice(0, filters.limit);
        }

        return results;
    }

    /**
     * Get all tags
     */
    getAllTags(): string[] {
        const allTags = new Set<string>();
        for (const phrase of this.phrases.values()) {
            if (phrase.tags_json) {
                try {
                    const tags = JSON.parse(phrase.tags_json);
                    tags.forEach((tag: string) => allTags.add(tag));
                } catch {
                    // Ignore invalid JSON
                }
            }
        }
        return Array.from(allTags).sort();
    }

    /**
     * Get tag counts
     */
    getTagCounts(): Map<string, number> {
        const tagCounts = new Map<string, number>();
        for (const phrase of this.phrases.values()) {
            if (phrase.tags_json) {
                try {
                    const tags = JSON.parse(phrase.tags_json);
                    tags.forEach((tag: string) => {
                        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                    });
                } catch {
                    // Ignore invalid JSON
                }
            }
        }
        return tagCounts;
    }

    /**
     * Get phrase count
     */
    getPhraseCount(): number {
        return this.phrases.size;
    }
}

class BrowserStatement {
    private sql: string;
    private db: BrowserDatabase;
    private params: any[] = [];

    constructor(sql: string, db: BrowserDatabase) {
        this.sql = sql;
        this.db = db;
    }

    bind(params: any[]): void {
        this.params = params;
    }

    step(): boolean {
        // Simple step implementation - always returns false for now
        return false;
    }

    getAsObject(): any {
        // Simple object return
        return {};
    }

    run(): void {
        // Execute the statement
        if (this.sql.includes("INSERT INTO phrases")) {
            const phrase: BrowserPhrase = {
                id: this.params[0],
                lang: this.params[1],
                text: this.params[2],
                translation: this.params[3],
                context: this.params[4],
                tags_json: this.params[5],
                added_at: this.params[6],
                source_file: this.params[7],
                content_hash: this.params[8],
                line_no: this.params[9],
                col_offset: this.params[10],
                text_stemmed: this.params[11],
                translation_stemmed: this.params[12],
                context_stemmed: this.params[13],
            };
            this.db.insertPhrase(phrase);
        } else if (this.sql.includes("DELETE FROM phrases")) {
            const id = this.params[0];
            this.db.deletePhrase(id);
        } else if (this.sql.includes("UPDATE phrases")) {
            const id = this.params[this.params.length - 1]; // Last param is usually the ID
            const updates: Partial<BrowserPhrase> = {};

            // Parse update fields based on SQL
            if (this.sql.includes("text_stemmed")) {
                updates.text_stemmed = this.params[0];
                updates.translation_stemmed = this.params[1];
                updates.context_stemmed = this.params[2];
            }

            this.db.updatePhrase(id, updates);
        }
    }

    free(): void {
        // Cleanup
        this.params = [];
    }
}
