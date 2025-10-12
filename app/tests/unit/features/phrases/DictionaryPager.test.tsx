import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { DictionaryPager } from "../../../../src/features/phrases/DictionaryPager";

describe("DictionaryPager", () => {
    const mockOnPageChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should not render when there is only one page", () => {
        render(
            <DictionaryPager
                currentPage={1}
                totalPages={1}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("should not render when there are no pages", () => {
        render(
            <DictionaryPager
                currentPage={1}
                totalPages={0}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("should render pagination controls for multiple pages", () => {
        render(
            <DictionaryPager
                currentPage={3}
                totalPages={10}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        expect(screen.getByRole("button", { name: /← prev/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /next →/i })).toBeInTheDocument();
        expect(screen.getByText("Page 3 of 10")).toBeInTheDocument();
    });

    it("should handle page navigation", () => {
        render(
            <DictionaryPager
                currentPage={3}
                totalPages={10}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        const nextButton = screen.getByRole("button", { name: /next →/i });
        fireEvent.click(nextButton);

        expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it("should handle previous page navigation", () => {
        render(
            <DictionaryPager
                currentPage={3}
                totalPages={10}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        const prevButton = screen.getByRole("button", { name: /← prev/i });
        fireEvent.click(prevButton);

        expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it("should not show previous button on first page", () => {
        render(
            <DictionaryPager
                currentPage={1}
                totalPages={10}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        expect(screen.queryByRole("button", { name: /← prev/i })).not.toBeInTheDocument();
    });

    it("should not show next button on last page", () => {
        render(
            <DictionaryPager
                currentPage={10}
                totalPages={10}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        expect(screen.queryByRole("button", { name: /next →/i })).not.toBeInTheDocument();
    });

    it("should show page numbers correctly", () => {
        render(
            <DictionaryPager
                currentPage={5}
                totalPages={10}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        // Should show pages around current page
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("4")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("6")).toBeInTheDocument();
        expect(screen.getByText("7")).toBeInTheDocument();
        expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("should handle page number clicks", () => {
        render(
            <DictionaryPager
                currentPage={5}
                totalPages={10}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        const pageButton = screen.getByText("7");
        fireEvent.click(pageButton);

        expect(mockOnPageChange).toHaveBeenCalledWith(7);
    });

    it("should show ellipsis for large page ranges", () => {
        render(
            <DictionaryPager
                currentPage={10}
                totalPages={20}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        expect(screen.getAllByText("...")).toHaveLength(2);
    });

    it("should handle edge case with very few pages", () => {
        render(
            <DictionaryPager
                currentPage={2}
                totalPages={3}
                onPageChange={mockOnPageChange}
                itemsPerPage={20}
            />,
        );

        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
    });
});
