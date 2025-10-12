/**
 * IndexedDB Cache Layer
 *
 * Provides offline-first functionality by caching data locally in IndexedDB.
 * Handles sync queue for operations when offline and syncs when online.
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { SavedPhrase } from "../db/phraseStore";

interface CacheDB extends DBSchema {
    phrases: {
        key: string;
        value: SavedPhrase;
        indexes: { "by-user": string; "by-lang": string };
    };
    sync_queue: {
        key: number;
        value: { operation: string; data: unknown; timestamp: number };
    };
}

export class IndexedDBCache {
    private db: IDBPDatabase<CacheDB> | null = null;
    private dbName = "readnlearn-cache";
    private version = 1;

    async init(): Promise<void> {
        this.db = await openDB<CacheDB>(this.dbName, this.version, {
            upgrade(db) {
                // Create phrases store
                if (!db.objectStoreNames.contains("phrases")) {
                    const phrasesStore = db.createObjectStore("phrases", { keyPath: "id" });
                    phrasesStore.createIndex("by-user", "user_id");
                    phrasesStore.createIndex("by-lang", "lang");
                }

                // Create sync queue store
                if (!db.objectStoreNames.contains("sync_queue")) {
                    db.createObjectStore("sync_queue", { keyPath: "key", autoIncrement: true });
                }
            },
        });
    }

    async getPhrases(userId: string, lang?: string): Promise<SavedPhrase[]> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("phrases", "readonly");
        const store = tx.objectStore("phrases");

        let index = store.index("by-user");
        let cursor = await index.openCursor(IDBKeyRange.only(userId));

        const phrases: SavedPhrase[] = [];
        while (cursor) {
            const phrase = cursor.value;
            if (!lang || phrase.lang === lang) {
                phrases.push(phrase);
            }
            cursor = await cursor.continue();
        }

        return phrases;
    }

    async savePhrase(phrase: SavedPhrase): Promise<void> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("phrases", "readwrite");
        const store = tx.objectStore("phrases");
        await store.put(phrase);
    }

    async deletePhrase(phraseId: string): Promise<void> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("phrases", "readwrite");
        const store = tx.objectStore("phrases");
        await store.delete(phraseId);
    }

    async searchLocal(
        query: string,
        options: { limit?: number; lang?: string } = {},
    ): Promise<SavedPhrase[]> {
        if (!this.db) await this.init();

        const phrases = await this.getPhrases("current-user", options.lang);

        // Simple local search - can be enhanced with more sophisticated algorithms
        const searchTerms = query.toLowerCase().split(/\s+/);
        const filtered = phrases.filter((phrase) => {
            const searchText =
                `${phrase.text} ${phrase.translation} ${phrase.context}`.toLowerCase();
            return searchTerms.some((term) => searchText.includes(term));
        });

        return filtered.slice(0, options.limit || 20);
    }

    async queueOperation(operation: string, data: unknown): Promise<void> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("sync_queue", "readwrite");
        const store = tx.objectStore("sync_queue");
        await store.add({
            operation,
            data,
            timestamp: Date.now(),
        });
    }

    async getQueuedOperations(): Promise<
        Array<{ operation: string; data: unknown; timestamp: number }>
    > {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("sync_queue", "readonly");
        const store = tx.objectStore("sync_queue");
        return await store.getAll();
    }

    async clearQueuedOperations(): Promise<void> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("sync_queue", "readwrite");
        const store = tx.objectStore("sync_queue");
        await store.clear();
    }

    async updatePhrases(phrases: SavedPhrase[]): Promise<void> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("phrases", "readwrite");
        const store = tx.objectStore("phrases");

        for (const phrase of phrases) {
            await store.put(phrase);
        }
    }

    async getPhrasesBySource(userId: string, sourceFile: string): Promise<SavedPhrase[]> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("phrases", "readonly");
        const store = tx.objectStore("phrases");

        let index = store.index("by-user");
        let cursor = await index.openCursor(IDBKeyRange.only(userId));

        const phrases: SavedPhrase[] = [];
        while (cursor) {
            const phrase = cursor.value;
            if (phrase.sourceFile === sourceFile) {
                phrases.push(phrase);
            }
            cursor = await cursor.continue();
        }

        return phrases;
    }

    async getPhrasesByContentHash(userId: string, contentHash: string): Promise<SavedPhrase[]> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("phrases", "readonly");
        const store = tx.objectStore("phrases");

        let index = store.index("by-user");
        let cursor = await index.openCursor(IDBKeyRange.only(userId));

        const phrases: SavedPhrase[] = [];
        while (cursor) {
            const phrase = cursor.value;
            if (phrase.contentHash === contentHash) {
                phrases.push(phrase);
            }
            cursor = await cursor.continue();
        }

        return phrases;
    }

    async setPhrasesBySource(
        userId: string,
        sourceFile: string,
        phrases: SavedPhrase[],
    ): Promise<void> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("phrases", "readwrite");
        const store = tx.objectStore("phrases");

        // Store phrases with source file metadata
        for (const phrase of phrases) {
            await store.put({ ...phrase, user_id: userId, sourceFile });
        }
    }

    async setPhrasesByContentHash(
        userId: string,
        contentHash: string,
        phrases: SavedPhrase[],
    ): Promise<void> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction("phrases", "readwrite");
        const store = tx.objectStore("phrases");

        // Store phrases with content hash metadata
        for (const phrase of phrases) {
            await store.put({ ...phrase, user_id: userId, contentHash });
        }
    }

    async handleRealtimeUpdate(payload: unknown): Promise<void> {
        if (!this.db) await this.init();

        const { eventType, new: newRecord, old: oldRecord } = payload;

        const tx = this.db!.transaction("phrases", "readwrite");
        const store = tx.objectStore("phrases");

        switch (eventType) {
            case "INSERT":
            case "UPDATE":
                if (newRecord) {
                    await store.put(newRecord);
                }
                break;
            case "DELETE":
                if (oldRecord) {
                    await store.delete(oldRecord.id);
                }
                break;
        }
    }

    async clearCache(): Promise<void> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction(["phrases", "sync_queue"], "readwrite");
        await tx.objectStore("phrases").clear();
        await tx.objectStore("sync_queue").clear();
    }
}

// Export singleton instance
export const cache = new IndexedDBCache();
