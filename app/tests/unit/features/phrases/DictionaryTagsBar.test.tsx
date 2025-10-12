import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
// import React from "react"; // Not needed in this test file
import { DictionaryTagsBar } from "../../../../src/features/phrases/DictionaryTagsBar";

describe("DictionaryTagsBar", () => {
    const mockOnTagToggle = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render with available tags", () => {
        const availableTags = ["vocabulary", "grammar", "pronunciation"];
        const selectedTags = new Set(["vocabulary"]);

        render(
            <DictionaryTagsBar
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagToggle={mockOnTagToggle}
            />,
        );

        expect(screen.getByText("#vocabulary")).toBeInTheDocument();
        expect(screen.getByText("#grammar")).toBeInTheDocument();
        expect(screen.getByText("#pronunciation")).toBeInTheDocument();
    });

    it("should show selected tags as active", () => {
        const availableTags = ["vocabulary", "grammar"];
        const selectedTags = new Set(["vocabulary"]);

        render(
            <DictionaryTagsBar
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagToggle={mockOnTagToggle}
            />,
        );

        const vocabularyCheckbox = screen.getByRole("checkbox", { name: /#vocabulary/i });
        const grammarCheckbox = screen.getByRole("checkbox", { name: /#grammar/i });

        expect(vocabularyCheckbox).toBeChecked();
        expect(grammarCheckbox).not.toBeChecked();
    });

    it("should handle tag toggle", () => {
        const availableTags = ["vocabulary", "grammar"];
        const selectedTags = new Set(["vocabulary"]);

        render(
            <DictionaryTagsBar
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagToggle={mockOnTagToggle}
            />,
        );

        const grammarCheckbox = screen.getByRole("checkbox", { name: /#grammar/i });
        fireEvent.click(grammarCheckbox);

        expect(mockOnTagToggle).toHaveBeenCalledWith("grammar");
    });

    it("should handle tag toggle for already selected tag", () => {
        const availableTags = ["vocabulary", "grammar"];
        const selectedTags = new Set(["vocabulary", "grammar"]);

        render(
            <DictionaryTagsBar
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagToggle={mockOnTagToggle}
            />,
        );

        const vocabularyCheckbox = screen.getByRole("checkbox", { name: /#vocabulary/i });
        fireEvent.click(vocabularyCheckbox);

        expect(mockOnTagToggle).toHaveBeenCalledWith("vocabulary");
    });

    it("should render with empty available tags", () => {
        render(
            <DictionaryTagsBar
                availableTags={[]}
                selectedTags={new Set()}
                onTagToggle={mockOnTagToggle}
            />,
        );

        expect(screen.getByText("No tags available")).toBeInTheDocument();
    });

    it("should render with no selected tags", () => {
        const availableTags = ["vocabulary", "grammar"];

        render(
            <DictionaryTagsBar
                availableTags={availableTags}
                selectedTags={new Set()}
                onTagToggle={mockOnTagToggle}
            />,
        );

        const vocabularyCheckbox = screen.getByRole("checkbox", { name: /#vocabulary/i });
        const grammarCheckbox = screen.getByRole("checkbox", { name: /#grammar/i });

        expect(vocabularyCheckbox).not.toBeChecked();
        expect(grammarCheckbox).not.toBeChecked();
    });

    it("should handle special characters in tags", () => {
        const availableTags = ["tag-with-dash", "tag_with_underscore", "tag with spaces"];
        const selectedTags = new Set(["tag-with-dash"]);

        render(
            <DictionaryTagsBar
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagToggle={mockOnTagToggle}
            />,
        );

        expect(screen.getByText("#tag-with-dash")).toBeInTheDocument();
        expect(screen.getByText("#tag_with_underscore")).toBeInTheDocument();
        expect(screen.getByText("#tag with spaces")).toBeInTheDocument();
    });

    it("should handle undefined availableTags", () => {
        render(
            <DictionaryTagsBar
                availableTags={[]}
                selectedTags={new Set()}
                onTagToggle={mockOnTagToggle}
            />,
        );

        expect(screen.getByText("No tags available")).toBeInTheDocument();
    });

    it("should handle undefined selectedTags", () => {
        const availableTags = ["vocabulary", "grammar"];

        render(
            <DictionaryTagsBar
                availableTags={availableTags}
                selectedTags={new Set()}
                onTagToggle={mockOnTagToggle}
            />,
        );

        const vocabularyCheckbox = screen.getByRole("checkbox", { name: /#vocabulary/i });
        expect(vocabularyCheckbox).not.toBeChecked();
    });
});
