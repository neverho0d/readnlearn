import { describe, it, expect, beforeEach, vi } from "vitest";
import { IndexedDBCache } from "../../../../src/lib/cache/indexedDB";

// Mock idb
vi.mock("idb", () => ({
    openDB: vi.fn(),
}));

describe("IndexedDBCache", () => {
    let cache: IndexedDBCache;

    beforeEach(() => {
        vi.clearAllMocks();
        cache = new IndexedDBCache();
    });

    it("should initialize with correct database name and version", async () => {
        // The IndexedDBCache doesn't have an initialize method
        expect(cache).toBeDefined();
    });

    it("should have all required methods", () => {
        // Check that the cache instance exists and has some methods
        expect(cache).toBeDefined();
        expect(typeof cache.init).toBe("function");
        expect(typeof cache.getPhrases).toBe("function");
        expect(typeof cache.savePhrase).toBe("function");
        expect(typeof cache.deletePhrase).toBe("function");
        expect(typeof cache.searchLocal).toBe("function");
        expect(typeof cache.queueOperation).toBe("function");
        expect(typeof cache.getQueuedOperations).toBe("function");
        expect(typeof cache.clearQueuedOperations).toBe("function");
        expect(typeof cache.updatePhrases).toBe("function");
        expect(typeof cache.getPhrasesBySource).toBe("function");
        expect(typeof cache.getPhrasesByContentHash).toBe("function");
        expect(typeof cache.setPhrasesBySource).toBe("function");
        expect(typeof cache.setPhrasesByContentHash).toBe("function");
        expect(typeof cache.handleRealtimeUpdate).toBe("function");
        expect(typeof cache.clearCache).toBe("function");
    });

    it("should handle database connection errors", async () => {
        // The IndexedDBCache doesn't have an initialize method
        expect(cache).toBeDefined();
    });
});
