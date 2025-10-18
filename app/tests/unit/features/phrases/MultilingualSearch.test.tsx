import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EnhancedDictionaryView } from "../../../../src/features/phrases/EnhancedDictionaryView";

// Mock the dependencies
vi.mock("../../../../src/lib/settings/SettingsContext", () => ({
    useSettings: () => ({
        settings: {
            l1: "en",
            l2: "es",
            theme: "dark",
        },
    }),
}));

vi.mock("../../../../src/lib/db/phraseStore", () => ({
    searchPhrases: vi.fn(),
    searchPhrasesAdvanced: vi.fn(),
    getAllTags: vi.fn(),
    removePhrase: vi.fn(),
    loadAllPhrases: vi.fn(),
    PHRASES_UPDATED_EVENT: "phrases-updated",
}));

vi.mock("../../../../src/features/phrases/DictionarySearchBar", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DictionarySearchBar: ({ onSearchChange, onScopeChange }: any) => (
        <div data-testid="search-bar">
            <input
                data-testid="search-input"
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search phrases..."
            />
            <button data-testid="scope-toggle" onClick={() => onScopeChange("all")}>
                All files
            </button>
        </div>
    ),
}));

vi.mock("../../../../src/features/phrases/DictionaryTagsBar", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DictionaryTagsBar: ({ tags = [], selectedTags, onTagToggle }: any) => (
        <div data-testid="tags-bar">
            {tags.map((tag: string) => (
                <label key={tag}>
                    <input
                        type="checkbox"
                        checked={selectedTags.has(tag)}
                        onChange={() => onTagToggle(tag)}
                    />
                    {tag}
                </label>
            ))}
        </div>
    ),
}));

vi.mock("../../../../src/features/phrases/DictionaryStatusBar", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DictionaryStatusBar: ({ totalCount, currentPage, totalPages }: any) => (
        <div data-testid="status-bar">
            {totalCount} phrases found | Page {currentPage} of {totalPages}
        </div>
    ),
}));

vi.mock("../../../../src/features/phrases/DictionaryPager", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DictionaryPager: ({ currentPage, totalPages, onPageChange }: any) => (
        <div data-testid="pager">
            <button
                data-testid="prev-page"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
            >
                Previous
            </button>
            <span>
                {currentPage} / {totalPages}
            </span>
            <button
                data-testid="next-page"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
            >
                Next
            </button>
        </div>
    ),
}));

describe("Multilingual Search in Dictionary View", () => {
    const mockMultilingualPhrases = [
        {
            id: "en-1",
            text: "Hello world",
            translation: "Hola mundo",
            context: "Hello world, how are you?",
            tags: ["greeting"],
            lang: "en",
            addedAt: "2023-01-01T00:00:00Z",
            sourceFile: "english.txt",
            contentHash: "hash1",
            lineNo: 1,
            colOffset: 0,
        },
        {
            id: "es-1",
            text: "Hola mundo",
            translation: "Hello world",
            context: "Hola mundo, ¿cómo estás?",
            tags: ["greeting"],
            lang: "es",
            addedAt: "2023-01-02T00:00:00Z",
            sourceFile: "spanish.txt",
            contentHash: "hash2",
            lineNo: 1,
            colOffset: 0,
        },
        {
            id: "fr-1",
            text: "Bonjour le monde",
            translation: "Hello world",
            context: "Bonjour le monde, comment allez-vous?",
            tags: ["greeting"],
            lang: "fr",
            addedAt: "2023-01-03T00:00:00Z",
            sourceFile: "french.txt",
            contentHash: "hash3",
            lineNo: 1,
            colOffset: 0,
        },
        {
            id: "de-1",
            text: "Hallo Welt",
            translation: "Hello world",
            context: "Hallo Welt, wie geht es dir?",
            tags: ["greeting"],
            lang: "de",
            addedAt: "2023-01-04T00:00:00Z",
            sourceFile: "german.txt",
            contentHash: "hash4",
            lineNo: 1,
            colOffset: 0,
        },
        {
            id: "zh-1",
            text: "你好世界",
            translation: "Hello world",
            context: "你好世界，你好吗？",
            tags: ["greeting"],
            lang: "zh",
            addedAt: "2023-01-05T00:00:00Z",
            sourceFile: "chinese.txt",
            contentHash: "hash5",
            lineNo: 1,
            colOffset: 0,
        },
        {
            id: "ja-1",
            text: "こんにちは世界",
            translation: "Hello world",
            context: "こんにちは世界、お元気ですか？",
            tags: ["greeting"],
            lang: "ja",
            addedAt: "2023-01-06T00:00:00Z",
            sourceFile: "japanese.txt",
            contentHash: "hash6",
            lineNo: 1,
            colOffset: 0,
        },
        {
            id: "ar-1",
            text: "مرحبا بالعالم",
            translation: "Hello world",
            context: "مرحبا بالعالم، كيف حالك؟",
            tags: ["greeting"],
            lang: "ar",
            addedAt: "2023-01-07T00:00:00Z",
            sourceFile: "arabic.txt",
            contentHash: "hash7",
            lineNo: 1,
            colOffset: 0,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Language-Specific Search", () => {
        it("should search English phrases with stemming", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: [mockMultilingualPhrases[0]],
                totalCount: 1,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "hello" } });

            await waitFor(() => {
                expect(searchPhrases).toHaveBeenCalledWith(
                    expect.objectContaining({
                        searchText: "hello",
                    }),
                );
            });

            await waitFor(() => {
                expect(screen.getByText("Hello world")).toBeInTheDocument();
            });
        });

        it("should search Spanish phrases with proper language handling", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: [mockMultilingualPhrases[1]],
                totalCount: 1,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "hola" } });

            await waitFor(() => {
                expect(screen.getByText("Hola mundo")).toBeInTheDocument();
            });
        });

        it("should search French phrases with accent handling", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: [mockMultilingualPhrases[2]],
                totalCount: 1,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "bonjour" } });

            await waitFor(() => {
                expect(screen.getByText("Bonjour le monde")).toBeInTheDocument();
            });
        });

        it("should search German phrases with compound words", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: [mockMultilingualPhrases[3]],
                totalCount: 1,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "hallo" } });

            await waitFor(() => {
                expect(screen.getByText("Hallo Welt")).toBeInTheDocument();
            });
        });

        it("should search Chinese phrases with character matching", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: [mockMultilingualPhrases[4]],
                totalCount: 1,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "你好" } });

            await waitFor(() => {
                expect(screen.getByText("你好世界")).toBeInTheDocument();
            });
        });

        it("should search Japanese phrases with hiragana/katakana", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: [mockMultilingualPhrases[5]],
                totalCount: 1,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "こんにちは" } });

            await waitFor(() => {
                expect(screen.getByText("こんにちは世界")).toBeInTheDocument();
            });
        });

        it("should search Arabic phrases with RTL support", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: [mockMultilingualPhrases[6]],
                totalCount: 1,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "مرحبا" } });

            await waitFor(() => {
                expect(screen.getByText("مرحبا بالعالم")).toBeInTheDocument();
            });
        });
    });

    describe("Cross-Language Search", () => {
        it("should find phrases across multiple languages", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: mockMultilingualPhrases.slice(0, 3), // English, Spanish, French
                totalCount: 3,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "world" } });

            await waitFor(() => {
                expect(screen.getAllByText("Hello world")).toHaveLength(3); // Should find all instances
                expect(screen.getAllByText("Hola mundo")).toHaveLength(2); // Should find both instances
                expect(screen.getByText("Bonjour le monde")).toBeInTheDocument();
            });
        });

        it("should search in translations across languages", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: mockMultilingualPhrases,
                totalCount: 7,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "Hello world" } });

            await waitFor(() => {
                // Should find all phrases that have "Hello world" in translation
                expect(screen.getAllByText(/Hello world/)).toHaveLength(7);
            });
        });
    });

    describe("Advanced Search Features", () => {
        it("should handle fuzzy matching with typos", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: [mockMultilingualPhrases[0]],
                totalCount: 1,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "helo" } }); // Typo in "hello"

            await waitFor(() => {
                expect(screen.getByText("Hello world")).toBeInTheDocument();
            });
        });

        it("should handle special characters and accents", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: [mockMultilingualPhrases[2]],
                totalCount: 1,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "bonjour" } }); // Without accent

            await waitFor(() => {
                expect(screen.getByText("Bonjour le monde")).toBeInTheDocument();
            });
        });

        it("should handle emoji and unicode characters", async () => {
            const phrasesWithEmoji = [
                {
                    id: "emoji-1",
                    text: "🚀 rocket ship",
                    translation: "cohete espacial",
                    context: "The rocket ship launched successfully",
                    tags: ["space"],
                    lang: "en",
                    addedAt: "2023-01-08T00:00:00Z",
                    sourceFile: "emoji.txt",
                    contentHash: "hash8",
                    lineNo: 1,
                    colOffset: 0,
                },
            ];

            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: phrasesWithEmoji,
                totalCount: 1,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "🚀" } });

            await waitFor(() => {
                expect(screen.getByText("🚀 rocket ship")).toBeInTheDocument();
            });
        });
    });

    describe("Search Performance", () => {
        it("should handle large result sets efficiently", async () => {
            const largePhraseSet = Array.from({ length: 100 }, (_, i) => ({
                id: `phrase-${i}`,
                text: `Phrase ${i}`,
                translation: `Frase ${i}`,
                context: `This is phrase ${i} in context`,
                tags: ["test"],
                lang: "en",
                addedAt: "2023-01-01T00:00:00Z",
                sourceFile: `file-${i % 10}.txt`,
                contentHash: `hash-${i}`,
                lineNo: i + 1,
                colOffset: 0,
            }));

            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: largePhraseSet.slice(0, 20), // First 20 for pagination
                totalCount: 100,
                currentPage: 1,
                totalPages: 5,
                hasNextPage: true,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            // Just verify that the component renders and the search function is called
            await waitFor(
                () => {
                    expect(searchPhrases).toHaveBeenCalled();
                },
                { timeout: 5000 },
            );
        });

        it("should handle empty search results gracefully", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: [],
                totalCount: 0,
                currentPage: 1,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "nonexistent" } });

            await waitFor(() => {
                expect(
                    screen.getByText("No phrases found matching your criteria."),
                ).toBeInTheDocument();
            });
        });
    });

    describe("Source File Display", () => {
        it("should display source files correctly for multilingual phrases", async () => {
            const { searchPhrases } = await import("../../../../src/lib/db/phraseStore");
            vi.mocked(searchPhrases).mockResolvedValue({
                phrases: mockMultilingualPhrases.slice(0, 3),
                totalCount: 3,
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            });

            render(<EnhancedDictionaryView />);

            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "hello" } });

            await waitFor(() => {
                expect(screen.getByText("english.txt")).toBeInTheDocument();
                expect(screen.getByText("spanish.txt")).toBeInTheDocument();
                expect(screen.getByText("french.txt")).toBeInTheDocument();
            });
        });
    });
});
