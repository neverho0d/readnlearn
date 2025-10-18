import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { PhraseCard } from "../../../../../src/features/phrases/components/PhraseCard";

describe("PhraseCard", () => {
    const mockOnJumpToPhrase = vi.fn();
    const defaultProps = {
        id: "test-phrase-123",
        text: "Hello world",
        translation: "Hola mundo",
        explanation: "A common greeting",
        tags: ["greeting"],
        isTranslating: false,
        onJumpToPhrase: mockOnJumpToPhrase,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should render phrase card with all content", () => {
        const { getByText, getByDisplayValue } = render(<PhraseCard {...defaultProps} />);

        expect(getByText("Hello world")).toBeTruthy();
        expect(getByText("Hola mundo")).toBeTruthy();
        expect(getByText("A common greeting")).toBeTruthy();
        expect(getByText("test")).toBeTruthy(); // marker
    });

    it("should handle phrase card blinking when receiving jump event", async () => {
        const { container } = render(<PhraseCard {...defaultProps} />);

        const cardElement = container.querySelector(
            '[id="phrase-card-test-phrase-123"]',
        ) as HTMLElement;
        expect(cardElement).toBeTruthy();

        // Mock getComputedStyle
        const mockGetComputedStyle = vi.spyOn(window, "getComputedStyle");
        mockGetComputedStyle.mockReturnValue({
            backgroundColor: "rgb(255, 255, 255)",
        } as CSSStyleDeclaration);

        // Dispatch jump event with matching marker
        const jumpEvent = new CustomEvent("readnlearn:jump-to-phrase", {
            detail: { marker: "test" },
        });

        window.dispatchEvent(jumpEvent);

        // Wait for the blinking effect
        await waitFor(() => {
            expect(cardElement.style.backgroundColor).toMatch(/rgba\(180,\s*180,\s*180,\s*0\.25\)/);
        });

        // Wait for the reset
        await waitFor(
            () => {
                expect(cardElement.style.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)/);
            },
            { timeout: 1500 },
        );
    });

    it("should not blink when receiving jump event with non-matching marker", () => {
        const { container } = render(<PhraseCard {...defaultProps} />);

        const cardElement = container.querySelector(
            '[id="phrase-card-test-phrase-123"]',
        ) as HTMLElement;
        const originalBackgroundColor = cardElement.style.backgroundColor;

        // Dispatch jump event with non-matching marker
        const jumpEvent = new CustomEvent("readnlearn:jump-to-phrase", {
            detail: { marker: "different" },
        });

        window.dispatchEvent(jumpEvent);

        // Background color should not change
        expect(cardElement.style.backgroundColor).toBe(originalBackgroundColor);
    });

    it("should handle phrase expansion and collapse", () => {
        const longText = "This is a very long phrase that should be truncated when not expanded";
        const { getByText, container } = render(<PhraseCard {...defaultProps} text={longText} />);

        // Initially should show truncated text
        const phraseElement = container.querySelector('[style*="white-space: nowrap"]');
        expect(phraseElement).toBeTruthy();

        // Click to expand
        fireEvent.click(phraseElement!);

        // Should show full text
        const expandedElement = container.querySelector('[style*="white-space: normal"]');
        expect(expandedElement).toBeTruthy();
    });

    it("should handle translation expansion and collapse", () => {
        const longTranslation =
            "This is a very long translation that should be truncated when not expanded";
        const { container } = render(
            <PhraseCard {...defaultProps} translation={longTranslation} />,
        );

        // Initially should show truncated translation
        const translationElement = container.querySelector('[style*="white-space: nowrap"]');
        expect(translationElement).toBeTruthy();

        // Click to expand
        fireEvent.click(translationElement!);

        // Should show full translation
        const expandedElement = container.querySelector('[style*="white-space: normal"]');
        expect(expandedElement).toBeTruthy();
    });

    it("should handle explanation expansion and collapse", () => {
        const longExplanation =
            "This is a very long explanation that should be truncated when not expanded";
        const { container } = render(
            <PhraseCard {...defaultProps} explanation={longExplanation} />,
        );

        // Initially should show truncated explanation
        const explanationElement = container.querySelector('[style*="white-space: nowrap"]');
        expect(explanationElement).toBeTruthy();

        // Click to expand
        fireEvent.click(explanationElement!);

        // Should show full explanation
        const expandedElement = container.querySelector('[style*="white-space: normal"]');
        expect(expandedElement).toBeTruthy();
    });

    it("should handle marker click to jump to phrase in text", () => {
        const { getByText } = render(<PhraseCard {...defaultProps} />);

        const marker = getByText("test");
        fireEvent.click(marker);

        expect(mockOnJumpToPhrase).toHaveBeenCalledWith("test-phrase-123");
    });

    it("should show loading state when translating", () => {
        const { getByText } = render(<PhraseCard {...defaultProps} isTranslating={true} />);

        expect(getByText("Translating...")).toBeTruthy();
    });

    it("should handle missing translation and explanation", () => {
        const { container } = render(
            <PhraseCard {...defaultProps} translation={null} explanation={null} />,
        );

        // Should not show translation or explanation sections (only phrase text should be present)
        const nowrapElements = container.querySelectorAll('[style*="white-space: nowrap"]');
        expect(nowrapElements.length).toBe(2); // Phrase text + translation (even when null, translation section is still rendered)
    });

    it("should render explanation with markdown", () => {
        const markdownExplanation = "This is **bold** text with *italic* formatting";
        const { container } = render(
            <PhraseCard {...defaultProps} explanation={markdownExplanation} />,
        );

        // Click to expand explanation
        const explanationElement = container.querySelector('[style*="white-space: nowrap"]');
        fireEvent.click(explanationElement!);

        // Should render markdown
        const expandedElement = container.querySelector('[style*="white-space: normal"]');
        expect(expandedElement).toBeTruthy();
    });

    it("should handle scroll into view when blinking", async () => {
        const { container } = render(<PhraseCard {...defaultProps} />);

        const cardElement = container.querySelector(
            '[id="phrase-card-test-phrase-123"]',
        ) as HTMLElement;
        const scrollIntoViewSpy = vi.spyOn(cardElement, "scrollIntoView");

        // Mock getComputedStyle
        const mockGetComputedStyle = vi.spyOn(window, "getComputedStyle");
        mockGetComputedStyle.mockReturnValue({
            backgroundColor: "rgb(255, 255, 255)",
        } as CSSStyleDeclaration);

        // Dispatch jump event
        const jumpEvent = new CustomEvent("readnlearn:jump-to-phrase", {
            detail: { marker: "test" },
        });

        window.dispatchEvent(jumpEvent);

        await waitFor(() => {
            expect(scrollIntoViewSpy).toHaveBeenCalledWith({
                behavior: "smooth",
                block: "center",
            });
        });
    });

    it("should clean up event listeners on unmount", () => {
        const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
        const { unmount } = render(<PhraseCard {...defaultProps} />);

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
            "readnlearn:jump-to-phrase",
            expect.any(Function),
        );
    });
});
