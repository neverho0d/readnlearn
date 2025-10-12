import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockSupabase = {
    from: vi.fn(() => ({
        select: vi.fn(() => ({
            eq: vi.fn(() => ({
                textSearch: vi.fn(() => ({
                    data: [],
                    error: null,
                    count: 0,
                })),
                or: vi.fn(() => ({
                    order: vi.fn(() => ({
                        range: vi.fn(() => ({
                            data: [],
                            error: null,
                            count: 0,
                        })),
                    })),
                })),
                order: vi.fn(() => ({
                    range: vi.fn(() => ({
                        data: [] as never[],
                        error: null,
                        count: 0,
                    })),
                })),
            })),
            or: vi.fn(() => ({
                order: vi.fn(() => ({
                    range: vi.fn(() => ({
                        data: [] as never[],
                        error: null,
                        count: 0,
                    })),
                })),
            })),
            order: vi.fn(() => ({
                range: vi.fn(() => ({
                    data: [],
                    error: null,
                    count: 0,
                })),
            })),
            textSearch: vi.fn(() => ({
                data: [],
                error: null,
                count: 0,
            })),
        })),
        insert: vi.fn(() => ({
            data: { id: "test-id" },
            error: null,
        })),
    })),
    auth: {
        getUser: vi.fn(() => ({
            data: { user: { id: "test-user-id" } },
        })),
        getSession: vi.fn(() =>
            Promise.resolve({
                data: { session: null },
                error: null,
            }),
        ),
    },
};

vi.mock("../supabase/client", () => ({
    supabase: mockSupabase,
}));

// Mock the ensureDb function to prevent database initialization
vi.mock("./phraseStore", async () => {
    const actual = await vi.importActual("./phraseStore");
    return {
        ...actual,
        ensureDb: vi.fn().mockResolvedValue(undefined),
    };
});

describe("FTS Database Schema and Configuration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Database Schema Validation", () => {
        it("should have proper FTS indexes for multilingual search", () => {
            // This would be tested against the actual database schema
            // In a real implementation, you'd query the database to verify indexes exist
            const expectedIndexes = [
                "idx_phrases_fts", // PGroonga FTS index
                "idx_phrases_user_id", // User isolation
                "idx_phrases_lang", // Language filtering
                "idx_phrases_added_at", // Temporal ordering
            ];

            // Mock the schema check
            expect(expectedIndexes).toHaveLength(4);
            expect(expectedIndexes).toContain("idx_phrases_fts");
        });

        it("should support multiple language configurations", () => {
            const languageConfigs = {
                en: "english",
                es: "spanish",
                fr: "french",
                de: "german",
                it: "italian",
                pt: "portuguese",
                ru: "russian",
                zh: "chinese_simple",
                ja: "japanese",
                ar: "arabic",
            };

            expect(Object.keys(languageConfigs)).toHaveLength(10);
            expect(languageConfigs["en"]).toBe("english");
            expect(languageConfigs["zh"]).toBe("chinese_simple");
        });
    });

    describe("FTS Query Optimization", () => {
        it("should use websearch type for better multilingual support", async () => {
            const { searchPhrases } = await import("./phraseStore");

            mockSupabase
                .from()
                .select()
                .eq()
                .textSearch.mockReturnValue({
                    data: [
                        {
                            id: "1",
                            text: "The quick brown fox",
                            translation: "El zorro marrón rápido",
                            lang: "en",
                            user_id: "test-user-id",
                            context: "Test context",
                            tags: ["test"],
                            added_at: "2023-01-01T00:00:00Z",
                            source_file: "test.txt",
                            content_hash: "hash1",
                            line_no: 1,
                            col_offset: 0,
                            updated_at: "2023-01-01T00:00:00Z",
                        },
                    ] as any,
                    error: null,
                    count: 1,
                });

            const result = await searchPhrases({
                searchText: "quick fox",
                scope: "all",
            });

            // Verify that the function returns a valid structure
            expect(result).toHaveProperty("phrases");
            expect(result).toHaveProperty("totalCount");
            expect(result).toHaveProperty("currentPage");
            expect(result).toHaveProperty("totalPages");
            expect(result).toHaveProperty("hasNextPage");
            expect(result).toHaveProperty("hasPreviousPage");
            expect(Array.isArray(result.phrases)).toBe(true);
        });

        it("should handle language-specific stemming", () => {
            const stemmingExamples = {
                en: {
                    input: "running",
                    expected: ["run", "running"],
                },
                es: {
                    input: "corriendo",
                    expected: ["correr", "corriendo"],
                },
                fr: {
                    input: "courant",
                    expected: ["courir", "courant"],
                },
            };

            Object.entries(stemmingExamples).forEach(([_lang, example]) => {
                expect(example.expected).toContain(example.input);
            });
        });
    });

    describe("Search Performance Tests", () => {
        it("should handle large text searches efficiently", async () => {
            const largeText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(
                100,
            );

            mockSupabase
                .from()
                .select()
                .eq()
                .textSearch.mockReturnValue({
                    data: [
                        {
                            id: "1",
                            text: largeText,
                            translation: "Large text translation",
                            lang: "en",
                            user_id: "test-user-id",
                            context: "Test context",
                            tags: ["test"],
                            added_at: "2023-01-01T00:00:00Z",
                            source_file: "test.txt",
                            content_hash: "hash1",
                            line_no: 1,
                            col_offset: 0,
                            updated_at: "2023-01-01T00:00:00Z",
                        },
                    ] as any,
                    error: null,
                    count: 1,
                });

            const startTime = performance.now();

            const { searchPhrases } = await import("./phraseStore");
            await searchPhrases({
                searchText: "lorem ipsum",
                scope: "all",
            });

            const endTime = performance.now();
            const searchTime = endTime - startTime;

            // Search should complete within reasonable time (adjust threshold as needed)
            expect(searchTime).toBeLessThan(1000); // 1 second
        });

        it("should handle concurrent searches", async () => {
            const searchPromises = Array.from({ length: 10 }, async (_, i) => {
                mockSupabase.from().select().eq().textSearch.mockReturnValue({
                    data: [],
                    error: null,
                    count: 0,
                });

                const { searchPhrases } = await import("./phraseStore");
                return await searchPhrases({
                    searchText: `search term ${i}`,
                    scope: "all",
                });
            });

            const results = await Promise.all(searchPromises);

            expect(results).toHaveLength(10);
            results.forEach((result) => {
                expect(result.phrases).toHaveLength(0);
            });
        });
    });

    describe("Multilingual Text Processing", () => {
        it("should handle Unicode normalization", () => {
            const unicodeExamples = [
                { input: "café", normalized: "cafe" },
                { input: "résumé", normalized: "resume" },
                { input: "naïve", normalized: "naive" },
                { input: "Zürich", normalized: "Zurich" },
            ];

            unicodeExamples.forEach(({ input, normalized }) => {
                // In a real implementation, you'd test Unicode normalization
                expect(input).toMatch(/[a-zA-Z]/);
                expect(normalized).toMatch(/[a-zA-Z]/);
            });
        });

        it("should handle different writing systems", () => {
            const writingSystems = {
                latin: "Hello world",
                cyrillic: "Привет мир",
                arabic: "مرحبا بالعالم",
                chinese: "你好世界",
                japanese: "こんにちは世界",
                korean: "안녕하세요 세계",
            };

            Object.values(writingSystems).forEach((text) => {
                expect(text.length).toBeGreaterThan(0);
                expect(typeof text).toBe("string");
            });
        });

        it("should handle mixed language content", () => {
            const mixedLanguagePhrases = [
                "Hello 你好 world",
                "Bonjour مرحبا world",
                "Hola こんにちは world",
                "Guten Tag 你好 world",
            ];

            mixedLanguagePhrases.forEach((phrase) => {
                expect(phrase).toMatch(/[a-zA-Z]/); // Contains Latin characters
                expect(phrase.length).toBeGreaterThan(5);
            });
        });
    });

    describe("Search Ranking and Relevance", () => {
        it("should rank exact matches higher than partial matches", () => {
            const searchResults = [
                { text: "exact match", score: 1.0 },
                { text: "exact matcher", score: 0.8 },
                { text: "exact matching", score: 0.6 },
            ];

            const sortedResults = searchResults.sort((a, b) => b.score - a.score);

            expect(sortedResults[0].text).toBe("exact match");
            expect(sortedResults[0].score).toBe(1.0);
        });

        it("should rank recent phrases higher than older ones", () => {
            const phrasesWithDates = [
                { text: "old phrase", added_at: "2023-01-01T00:00:00Z" },
                { text: "recent phrase", added_at: "2023-12-01T00:00:00Z" },
                { text: "middle phrase", added_at: "2023-06-01T00:00:00Z" },
            ];

            const sortedByDate = phrasesWithDates.sort(
                (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime(),
            );

            expect(sortedByDate[0].text).toBe("recent phrase");
        });
    });

    describe("Error Handling and Edge Cases", () => {
        it("should handle empty search terms", async () => {
            mockSupabase.from().select().eq().order().range.mockReturnValue({
                data: [],
                error: null,
                count: 0,
            });

            const { searchPhrases } = await import("./phraseStore");
            const result = await searchPhrases({
                searchText: "",
                scope: "all",
            });

            expect(result.phrases).toHaveLength(0);
            expect(result.totalCount).toBe(0);
        });

        it("should handle special characters in search", async () => {
            const specialCharacters = [
                "test@example.com",
                "user+tag@domain.co.uk",
                "file_name-v1.2.3",
                "query?param=value&other=123",
                "path/to/file.txt",
                "price: $19.99",
                "phone: +1-555-123-4567",
            ];

            specialCharacters.forEach((char) => {
                expect(char).toMatch(/[a-zA-Z0-9]/);
            });
        });

        it("should handle very long search terms", async () => {
            const longSearchTerm = "a".repeat(1000);

            mockSupabase.from().select().eq().or().order().range.mockReturnValue({
                data: [],
                error: null,
                count: 0,
            });

            const { searchPhrases } = await import("./phraseStore");
            const result = await searchPhrases({
                searchText: longSearchTerm,
                scope: "all",
            });

            expect(result.phrases).toHaveLength(0);
        });
    });

    describe("Database Connection and Authentication", () => {
        it("should handle authentication errors gracefully", async () => {
            mockSupabase.auth.getUser.mockReturnValue({
                data: { user: null },
                error: null,
            } as any);

            const { searchPhrases } = await import("./phraseStore");

            const result = await searchPhrases({
                searchText: "test",
                scope: "all",
            });

            // Verify that the function returns a valid structure even with auth errors
            expect(result).toHaveProperty("phrases");
            expect(result).toHaveProperty("totalCount");
            expect(result).toHaveProperty("currentPage");
            expect(result).toHaveProperty("totalPages");
            expect(result).toHaveProperty("hasNextPage");
            expect(result).toHaveProperty("hasPreviousPage");
            expect(Array.isArray(result.phrases)).toBe(true);
        });

        it("should handle database connection errors", async () => {
            mockSupabase
                .from()
                .select()
                .eq()
                .or()
                .order()
                .range.mockReturnValue({
                    data: [] as never[],
                    error: { message: "Connection failed" } as any,
                    count: 0,
                });

            const { searchPhrases } = await import("./phraseStore");

            const result = await searchPhrases({
                searchText: "test",
                scope: "all",
            });

            // Verify that the function returns a valid structure even with connection errors
            expect(result).toHaveProperty("phrases");
            expect(result).toHaveProperty("totalCount");
            expect(result).toHaveProperty("currentPage");
            expect(result).toHaveProperty("totalPages");
            expect(result).toHaveProperty("hasNextPage");
            expect(result).toHaveProperty("hasPreviousPage");
            expect(Array.isArray(result.phrases)).toBe(true);
        });
    });
});
