import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { DictionarySearchBar } from "../../../../src/features/phrases/DictionarySearchBar";

describe("DictionarySearchBar", () => {
    const mockOnSearchChange = vi.fn();
    const mockOnSearchRequest = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render search input and controls", () => {
        render(
            <DictionarySearchBar
                searchText=""
                onSearchChange={mockOnSearchChange}
                onSearchRequest={mockOnSearchRequest}
                isSearching={false}
                placeholder="Search phrases..."
            />,
        );

        expect(screen.getByPlaceholderText("Search phrases...")).toBeInTheDocument();
        expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should handle search input changes", async () => {
        render(
            <DictionarySearchBar
                searchText=""
                onSearchChange={mockOnSearchChange}
                onSearchRequest={mockOnSearchRequest}
                isSearching={false}
                placeholder="Search phrases..."
            />,
        );

        const searchInput = screen.getByPlaceholderText("Search phrases...");
        fireEvent.change(searchInput, { target: { value: "test phrase" } });

        await waitFor(() => {
            expect(searchInput).toHaveValue("test phrase");
        });
    });

    it("should trigger search request on button click", async () => {
        render(
            <DictionarySearchBar
                searchText="test"
                onSearchChange={mockOnSearchChange}
                onSearchRequest={mockOnSearchRequest}
                isSearching={false}
                placeholder="Search phrases..."
            />,
        );

        const searchButton = screen.getByRole("button");
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(mockOnSearchRequest).toHaveBeenCalled();
        });
    });

    it("should show loading state", () => {
        render(
            <DictionarySearchBar
                searchText=""
                onSearchChange={mockOnSearchChange}
                onSearchRequest={mockOnSearchRequest}
                isSearching={true}
                placeholder="Search phrases..."
            />,
        );

        expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should handle empty search gracefully", async () => {
        render(
            <DictionarySearchBar
                searchText=""
                onSearchChange={mockOnSearchChange}
                onSearchRequest={mockOnSearchRequest}
                isSearching={false}
                placeholder="Search phrases..."
            />,
        );

        const searchButton = screen.getByRole("button");
        expect(searchButton).toBeDisabled();
    });

    it("should handle multiple input changes", () => {
        render(
            <DictionarySearchBar
                searchText=""
                onSearchChange={mockOnSearchChange}
                onSearchRequest={mockOnSearchRequest}
                isSearching={false}
                placeholder="Search phrases..."
            />,
        );

        const searchInput = screen.getByPlaceholderText("Search phrases...");

        fireEvent.change(searchInput, { target: { value: "t" } });
        fireEvent.change(searchInput, { target: { value: "te" } });
        fireEvent.change(searchInput, { target: { value: "test" } });

        expect(searchInput).toHaveValue("test");
    });

    it("should not show clear button when text is empty", () => {
        render(
            <DictionarySearchBar
                searchText=""
                onSearchChange={mockOnSearchChange}
                onSearchRequest={mockOnSearchRequest}
                isSearching={false}
                placeholder="Search phrases..."
            />,
        );

        expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
    });

    it("should display search text correctly", () => {
        render(
            <DictionarySearchBar
                searchText="test query"
                onSearchChange={mockOnSearchChange}
                onSearchRequest={mockOnSearchRequest}
                isSearching={false}
                placeholder="Search phrases..."
            />,
        );

        const searchInput = screen.getByPlaceholderText("Search phrases...");
        expect(searchInput).toHaveValue("test query");
    });

    it("should handle custom placeholder", () => {
        render(
            <DictionarySearchBar
                searchText=""
                onSearchChange={mockOnSearchChange}
                onSearchRequest={mockOnSearchRequest}
                isSearching={false}
                placeholder="Custom search placeholder"
            />,
        );

        expect(screen.getByPlaceholderText("Custom search placeholder")).toBeInTheDocument();
    });
});
