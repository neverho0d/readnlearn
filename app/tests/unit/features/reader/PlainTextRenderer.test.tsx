import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { PlainTextRenderer } from "../../../../src/features/reader/PlainTextRenderer";

describe("PlainTextRenderer", () => {
    beforeEach(() => {
        // Clear any existing event listeners
        window.removeEventListener("readnlearn:jump-to-phrase", vi.fn());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should render plain text content", () => {
        const content = "This is a simple text content.";
        const { container } = render(<PlainTextRenderer content={content} />);

        expect(container.textContent).toBe("This is a simple text content.");
    });

    it("should handle decorated phrases and dispatch jump events", () => {
        const content = `
            <span class="phrase-anchor" data-phrase-id="test123">
                Hello world
                <sup class="phrase-marker">test</sup>
            </span>
        `;

        const mockOnClick = vi.fn();
        const { container } = render(<PlainTextRenderer content={content} onClick={mockOnClick} />);

        // Find the decorated phrase
        const phraseAnchor = container.querySelector(".phrase-anchor");
        expect(phraseAnchor).toBeTruthy();

        // Mock window.dispatchEvent
        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

        // Click on the decorated phrase
        fireEvent.click(phraseAnchor!);

        // Verify that the jump event was dispatched
        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "readnlearn:jump-to-phrase",
                detail: { marker: "test" },
            }),
        );

        // Verify that the onClick handler was not called (since we clicked on a decorated phrase)
        expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("should handle text selection when clicking on non-decorated text", () => {
        const content = "This is plain text without decorations.";
        const mockOnClick = vi.fn();

        const { container } = render(<PlainTextRenderer content={content} onClick={mockOnClick} />);

        // Click on the text
        fireEvent.click(container.firstChild as Element);

        // Verify that the onClick handler was called
        expect(mockOnClick).toHaveBeenCalled();
    });

    it("should handle mixed content with both decorated and plain text", () => {
        const content = `
            Plain text before.
            <span class="phrase-anchor" data-phrase-id="test123">
                Decorated phrase
                <sup class="phrase-marker">test</sup>
            </span>
            Plain text after.
        `;

        const mockOnClick = vi.fn();
        const { container } = render(<PlainTextRenderer content={content} onClick={mockOnClick} />);

        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

        // Click on decorated phrase
        const phraseAnchor = container.querySelector(".phrase-anchor");
        fireEvent.click(phraseAnchor!);

        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "readnlearn:jump-to-phrase",
                detail: { marker: "test" },
            }),
        );
        expect(mockOnClick).not.toHaveBeenCalled();

        // Reset mocks
        dispatchEventSpy.mockClear();
        mockOnClick.mockClear();

        // Click on plain text
        const plainText = container.querySelector("div");
        fireEvent.click(plainText!);

        expect(mockOnClick).toHaveBeenCalled();
        expect(dispatchEventSpy).not.toHaveBeenCalled();
    });

    it("should handle multi-line decorated phrases", () => {
        const content = `
            <span class="phrase-anchor" data-phrase-id="multiline123">
                Line 1
                Line 2
                Line 3
                <sup class="phrase-marker">mult</sup>
            </span>
        `;

        const { container } = render(<PlainTextRenderer content={content} />);
        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

        const phraseAnchor = container.querySelector(".phrase-anchor");
        fireEvent.click(phraseAnchor!);

        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "readnlearn:jump-to-phrase",
                detail: { marker: "mult" },
            }),
        );
    });

    it("should not dispatch event if marker is not found", () => {
        const content = `
            <span class="phrase-anchor" data-phrase-id="test123">
                Hello world
            </span>
        `;

        const { container } = render(<PlainTextRenderer content={content} />);
        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

        const phraseAnchor = container.querySelector(".phrase-anchor");
        fireEvent.click(phraseAnchor!);

        expect(dispatchEventSpy).not.toHaveBeenCalled();
    });

    it("should not dispatch event if phrase ID is not found", () => {
        const content = `
            <span class="phrase-anchor">
                Hello world
                <sup class="phrase-marker">test</sup>
            </span>
        `;

        const { container } = render(<PlainTextRenderer content={content} />);
        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

        const phraseAnchor = container.querySelector(".phrase-anchor");
        fireEvent.click(phraseAnchor!);

        expect(dispatchEventSpy).not.toHaveBeenCalled();
    });

    it("should handle multiple decorated phrases correctly", () => {
        const content = `
            <span class="phrase-anchor" data-phrase-id="phrase1">
                First phrase
                <sup class="phrase-marker">phr1</sup>
            </span>
            <span class="phrase-anchor" data-phrase-id="phrase2">
                Second phrase
                <sup class="phrase-marker">phr2</sup>
            </span>
        `;

        const { container } = render(<PlainTextRenderer content={content} />);
        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

        // Click on first phrase
        const firstPhrase = container.querySelector('[data-phrase-id="phrase1"]');
        fireEvent.click(firstPhrase!);

        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "readnlearn:jump-to-phrase",
                detail: { marker: "phr1" },
            }),
        );

        // Reset and click on second phrase
        dispatchEventSpy.mockClear();
        const secondPhrase = container.querySelector('[data-phrase-id="phrase2"]');
        fireEvent.click(secondPhrase!);

        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "readnlearn:jump-to-phrase",
                detail: { marker: "phr2" },
            }),
        );
    });
});
