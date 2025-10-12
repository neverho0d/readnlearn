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

describe("EnhancedDictionaryView", () => {
    const mockPhrases = [
        {
            id: "test-1",
            text: "Hello world",
            translation: "Hola mundo",
            tags: ["greeting"],
            source_file: "test.txt",
            added_at: "2023-01-01T00:00:00Z",
        },
        {
            id: "test-2",
            text: "Good morning",
            translation: "Buenos días",
            tags: ["greeting", "time"],
            source_file: "test.txt",
            added_at: "2023-01-02T00:00:00Z",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should show loading indicator initially", () => {
        render(<EnhancedDictionaryView />);
        expect(screen.getByText("Loading phrases...")).toBeInTheDocument();
    });

    it("should display phrases when loaded", async () => {
        const { searchPhrases } = await import("../../lib/db/phraseStore");
        vi.mocked(searchPhrases).mockResolvedValue({
            phrases: mockPhrases,
            totalCount: 2,
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
        });

        render(<EnhancedDictionaryView />);

        await waitFor(() => {
            expect(screen.getByText("Hello world")).toBeInTheDocument();
            expect(screen.getByText("Good morning")).toBeInTheDocument();
        });
    });

    it("should show 'No phrases found' when no results", async () => {
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

        await waitFor(() => {
            expect(
                screen.getByText("No phrases found matching your criteria."),
            ).toBeInTheDocument();
        });
    });

    it("should display source file correctly", async () => {
        const { searchPhrases } = await import("../../lib/db/phraseStore");
        vi.mocked(searchPhrases).mockResolvedValue({
            phrases: mockPhrases,
            totalCount: 2,
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
        });

        render(<EnhancedDictionaryView />);

        await waitFor(() => {
            expect(screen.getAllByText("test.txt")).toHaveLength(2);
        });
    });

    it("should handle missing source file gracefully", async () => {
        const phrasesWithoutSource = [
            {
                ...mockPhrases[0],
                source_file: undefined,
            },
        ];

        const { searchPhrases } = await import("../../lib/db/phraseStore");
        vi.mocked(searchPhrases).mockResolvedValue({
            phrases: phrasesWithoutSource,
            totalCount: 1,
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
        });

        render(<EnhancedDictionaryView />);

        await waitFor(() => {
            expect(screen.getByText("Unknown source")).toBeInTheDocument();
        });
    });

    it("should use cached phrases when available and no search filters", async () => {
        const cachedPhrases = [
            { id: "test-1", text: "Hello world", position: 0 },
            { id: "test-2", text: "Good morning", position: 10 },
        ];

        const { loadAllPhrases } = await import("../../lib/db/phraseStore");
        vi.mocked(loadAllPhrases).mockResolvedValue(mockPhrases);

        render(<EnhancedDictionaryView cachedPhrases={cachedPhrases} />);

        await waitFor(() => {
            expect(loadAllPhrases).toHaveBeenCalled();
            expect(screen.getByText("Hello world")).toBeInTheDocument();
        });
    });

    it("should perform database search when search text is provided", async () => {
        const { searchPhrases } = await import("../../lib/db/phraseStore");
        vi.mocked(searchPhrases).mockResolvedValue({
            phrases: [mockPhrases[0]],
            totalCount: 1,
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
        });

        render(<EnhancedDictionaryView />);

        const searchInput = screen.getByTestId("search-input");
        fireEvent.change(searchInput, { target: { value: "Hello" } });

        await waitFor(() => {
            expect(searchPhrases).toHaveBeenCalledWith(
                expect.objectContaining({
                    searchText: "Hello",
                }),
            );
        });
    });

    it("should handle search errors gracefully", async () => {
        const { searchPhrases } = await import("../../lib/db/phraseStore");
        vi.mocked(searchPhrases).mockRejectedValue(new Error("Search failed"));

        render(<EnhancedDictionaryView />);

        await waitFor(() => {
            expect(
                screen.getByText("No phrases found matching your criteria."),
            ).toBeInTheDocument();
        });
    });

    it("should filter by source file when scope is set to current", async () => {
        const { searchPhrases } = await import("../../lib/db/phraseStore");
        vi.mocked(searchPhrases).mockResolvedValue({
            phrases: mockPhrases,
            totalCount: mockPhrases.length,
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
        });

        render(
            <EnhancedDictionaryView
                sourceFile="test.txt"
                cachedPhrases={[{ id: "test-1", text: "Hello world", position: 0 }]}
            />,
        );

        const scopeToggle = screen.getByTestId("scope-toggle");
        fireEvent.click(scopeToggle);

        await waitFor(() => {
            expect(searchPhrases).toHaveBeenCalled();
        });
    });
});
