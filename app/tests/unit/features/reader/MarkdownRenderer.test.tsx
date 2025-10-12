/**
 * MarkdownRenderer Component Tests
 *
 * Tests the click handling for multi-line phrases in MarkdownRenderer
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownRenderer } from "../../../../src/features/reader/MarkdownRenderer";

// Mock ReactMarkdown to render HTML directly
vi.mock("react-markdown", () => ({
    default: ({ children }: { children: string }) => (
        <div data-testid="markdown-content" dangerouslySetInnerHTML={{ __html: children }} />
    ),
}));

// Mock rehype-raw
vi.mock("rehype-raw", () => ({
    default: vi.fn(),
}));

describe("MarkdownRenderer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should handle clicks on single-line phrases", () => {
        const mockDispatchEvent = vi.fn();
        window.dispatchEvent = mockDispatchEvent;

        const content = `<span class="phrase-anchor" data-phrase-id="test-123">Hello world<sup class="phrase-marker">test</sup></span>`;

        render(<MarkdownRenderer content={content} />);

        const anchor = screen.getByText("Hello world");
        fireEvent.click(anchor);

        expect(mockDispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "readnlearn:jump-to-phrase",
                detail: { marker: "test" },
            }),
        );
    });

    it("should handle clicks on multi-line phrases", () => {
        const mockDispatchEvent = vi.fn();
        window.dispatchEvent = mockDispatchEvent;

        const content = `
            <span class="phrase-anchor" data-phrase-id="test-123">First line</span>
            <span class="phrase-anchor" data-phrase-id="test-123">Second line</span>
            <span class="phrase-anchor" data-phrase-id="test-123">Third line<sup class="phrase-marker">test</sup></span>
        `;

        render(<MarkdownRenderer content={content} />);

        // Click on the first span - should find the marker in the last span
        const firstSpan = screen.getByText("First line");
        fireEvent.click(firstSpan);

        expect(mockDispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "readnlearn:jump-to-phrase",
                detail: { marker: "test" },
            }),
        );
    });

    it("should not dispatch event if no marker is found", () => {
        const mockDispatchEvent = vi.fn();
        window.dispatchEvent = mockDispatchEvent;

        const content = `<span class="phrase-anchor" data-phrase-id="test-123">Hello world</span>`;

        render(<MarkdownRenderer content={content} />);

        const anchor = screen.getByText("Hello world");
        fireEvent.click(anchor);

        expect(mockDispatchEvent).not.toHaveBeenCalled();
    });

    it("should not dispatch event if no phrase ID is found", () => {
        const mockDispatchEvent = vi.fn();
        window.dispatchEvent = mockDispatchEvent;

        const content = `<span class="phrase-anchor">Hello world</span>`;

        render(<MarkdownRenderer content={content} />);

        const anchor = screen.getByText("Hello world");
        fireEvent.click(anchor);

        expect(mockDispatchEvent).not.toHaveBeenCalled();
    });
});
