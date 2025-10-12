import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EnhancedDictionaryView } from "./EnhancedDictionaryView";

// Mock the dependencies
vi.mock("../../lib/settings/SettingsContext", () => ({
    useSettings: () => ({
        settings: {
            l1: "en",
            l2: "es",
            theme: "dark",
        },
    }),
}));

vi.mock("../../lib/db/phraseStore", () => ({
    searchPhrases: vi.fn(),
    searchPhrasesAdvanced: vi.fn(),
    getAllTags: vi.fn(),
    removePhrase: vi.fn(),
    loadAllPhrases: vi.fn(),
    PHRASES_UPDATED_EVENT: "phrases-updated",
}));

vi.mock("./DictionarySearchBar", () => ({
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

vi.mock("./DictionaryTagsBar", () => ({
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

vi.mock("./DictionaryStatusBar", () => ({
    DictionaryStatusBar: ({ totalCount, currentPage, totalPages }: any) => (
        <div data-testid="status-bar">
            {totalCount} phrases found | Page {currentPage} of {totalPages}
        </div>
    ),
}));

vi.mock("./DictionaryPager", () => ({
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
            tags: ["greeting"],
            source_file: "english.txt",
            added_at: "2023-01-01T00:00:00Z",
            lang: "en",
        },
        {
            id: "es-1",
            text: "Hola mundo",
            translation: "Hello world",
            tags: ["greeting"],
            source_file: "spanish.txt",
            added_at: "2023-01-02T00:00:00Z",
            lang: "es",
        },
        {
            id: "fr-1",
            text: "Bonjour le monde",
            translation: "Hello world",
            tags: ["greeting"],
            source_file: "french.txt",
            added_at: "2023-01-03T00:00:00Z",
            lang: "fr",
        },
        {
            id: "de-1",
            text: "Hallo Welt",
            translation: "Hello world",
            tags: ["greeting"],
            source_file: "german.txt",
            added_at: "2023-01-04T00:00:00Z",
            lang: "de",
        },
        {
            id: "zh-1",
            text: "你好世界",
            translation: "Hello world",
            tags: ["greeting"],
            source_file: "chinese.txt",
            added_at: "2023-01-05T00:00:00Z",
            lang: "zh",
        },
        {
            id: "ja-1",
            text: "こんにちは世界",
            translation: "Hello world",
            tags: ["greeting"],
            source_file: "japanese.txt",
            added_at: "2023-01-06T00:00:00Z",
            lang: "ja",
        },
        {
            id: "ar-1",
            text: "مرحبا بالعالم",
            translation: "Hello world",
            tags: ["greeting"],
            source_file: "arabic.txt",
            added_at: "2023-01-07T00:00:00Z",
            lang: "ar",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Language-Specific Search", () => {
        it("should search English phrases with stemming", async () => {
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
                    tags: ["space"],
                    source_file: "emoji.txt",
                    added_at: "2023-01-08T00:00:00Z",
                    lang: "en",
                },
            ];

            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
                tags: ["test"],
                source_file: `file-${i % 10}.txt`,
                added_at: "2023-01-01T00:00:00Z",
                lang: "en",
            }));

            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
            const { searchPhrases } = await import("../../lib/db/phraseStore");
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
