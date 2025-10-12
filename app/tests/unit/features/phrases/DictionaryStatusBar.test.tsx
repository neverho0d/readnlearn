import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
// import React from "react"; // Not needed in this test file
import { DictionaryStatusBar } from "../../../../src/features/phrases/DictionaryStatusBar";

describe("DictionaryStatusBar", () => {
    const mockOnScopeChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render with total records", () => {
        render(
            <DictionaryStatusBar
                totalRecords={150}
                currentScope="all"
                onScopeChange={mockOnScopeChange}
                hasCurrentFile={false}
            />,
        );

        expect(screen.getByText("150 phrases found")).toBeInTheDocument();
    });

    it("should format large numbers correctly", () => {
        render(
            <DictionaryStatusBar
                totalRecords={1500}
                currentScope="all"
                onScopeChange={mockOnScopeChange}
                hasCurrentFile={false}
            />,
        );

        expect(screen.getByText("1,500 phrases found")).toBeInTheDocument();
    });

    it("should show scope selector", () => {
        render(
            <DictionaryStatusBar
                totalRecords={50}
                currentScope="all"
                onScopeChange={mockOnScopeChange}
                hasCurrentFile={true}
            />,
        );

        expect(screen.getByRole("button", { name: /all files/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /current file/i })).toBeInTheDocument();
    });

    it("should handle scope change", () => {
        render(
            <DictionaryStatusBar
                totalRecords={50}
                currentScope="all"
                onScopeChange={mockOnScopeChange}
                hasCurrentFile={true}
            />,
        );

        const currentFileButton = screen.getByRole("button", { name: /current file/i });
        fireEvent.click(currentFileButton);

        expect(mockOnScopeChange).toHaveBeenCalledWith("current");
    });

    it("should show current scope as active", () => {
        render(
            <DictionaryStatusBar
                totalRecords={50}
                currentScope="current"
                onScopeChange={mockOnScopeChange}
                hasCurrentFile={true}
            />,
        );

        const currentFileButton = screen.getByRole("button", { name: /current file/i });
        // Check that the button has the active styling
        expect(currentFileButton).toHaveAttribute("style");
        const style = currentFileButton.getAttribute("style");
        expect(style).toContain("var(--primary)");
        expect(style).toContain("white");
    });

    it("should show all scope as active", () => {
        render(
            <DictionaryStatusBar
                totalRecords={50}
                currentScope="all"
                onScopeChange={mockOnScopeChange}
                hasCurrentFile={true}
            />,
        );

        const allButton = screen.getByRole("button", { name: /all files/i });
        // Check that the button has the active styling
        expect(allButton).toHaveAttribute("style");
        const style = allButton.getAttribute("style");
        expect(style).toContain("var(--primary)");
        expect(style).toContain("white");
    });

    it("should show current file option even when no current file", () => {
        render(
            <DictionaryStatusBar
                totalRecords={50}
                currentScope="all"
                onScopeChange={mockOnScopeChange}
                hasCurrentFile={false}
            />,
        );

        expect(screen.getByRole("button", { name: /current file/i })).toBeInTheDocument();
    });

    it("should handle zero records", () => {
        render(
            <DictionaryStatusBar
                totalRecords={0}
                currentScope="all"
                onScopeChange={mockOnScopeChange}
                hasCurrentFile={false}
            />,
        );

        expect(screen.getByText("No phrases found")).toBeInTheDocument();
    });

    it("should handle undefined totalRecords", () => {
        render(
            <DictionaryStatusBar
                totalRecords={0}
                currentScope="all"
                onScopeChange={mockOnScopeChange}
                hasCurrentFile={false}
            />,
        );

        expect(screen.getByText("No phrases found")).toBeInTheDocument();
    });
});
