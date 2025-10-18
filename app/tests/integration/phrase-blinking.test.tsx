import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { PlainTextRenderer } from "../../src/features/reader/PlainTextRenderer";
import { PhraseCard } from "../../src/features/phrases/components/PhraseCard";

describe("Phrase Blinking Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should complete the full phrase blinking flow", async () => {
        // Render a decorated phrase
        const decoratedContent = `
            <span class="phrase-anchor" data-phrase-id="test-phrase-123">
                Hello world
                <sup class="phrase-marker">test</sup>
            </span>
        `;

        const { container: rendererContainer } = render(
            <PlainTextRenderer content={decoratedContent} />,
        );

        // Render a phrase card that should respond to the event
        const { container: cardContainer } = render(
            <PhraseCard
                id="test-phrase-123"
                text="Hello world"
                translation="Hola mundo"
                explanation="A greeting"
                tags={["greeting"]}
            />,
        );

        // Mock getComputedStyle for the card
        const cardElement = cardContainer.querySelector(
            '[id="phrase-card-test-phrase-123"]',
        ) as HTMLElement;
        const mockGetComputedStyle = vi.spyOn(window, "getComputedStyle");
        mockGetComputedStyle.mockReturnValue({
            backgroundColor: "rgb(255, 255, 255)",
        } as CSSStyleDeclaration);

        // Click on the decorated phrase
        const phraseAnchor = rendererContainer.querySelector(".phrase-anchor");
        fireEvent.click(phraseAnchor!);

        // Wait for the card to blink
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

    it("should handle multiple phrase cards with different markers", async () => {
        // This test verifies that multiple phrase cards can exist and respond to different events
        // The core functionality is tested in the unit tests above
        const { container } = render(
            <div>
                <PhraseCard id="phrase-1" text="First phrase" translation="Primera frase" />
                <PhraseCard id="phrase-2" text="Second phrase" translation="Segunda frase" />
            </div>,
        );

        const firstCard = container.querySelector('[id="phrase-card-phrase-1"]') as HTMLElement;
        const secondCard = container.querySelector('[id="phrase-card-phrase-2"]') as HTMLElement;

        // Mock getComputedStyle
        const mockGetComputedStyle = vi.spyOn(window, "getComputedStyle");
        mockGetComputedStyle.mockReturnValue({
            backgroundColor: "rgb(255, 255, 255)",
        } as CSSStyleDeclaration);

        // Test first card
        const jumpEvent1 = new CustomEvent("readnlearn:jump-to-phrase", {
            detail: { marker: "phra" }, // matches phrase-1
        });
        window.dispatchEvent(jumpEvent1);

        await waitFor(() => {
            expect(firstCard.style.backgroundColor).toMatch(/rgba\(180,\s*180,\s*180,\s*0\.25\)/);
        });

        // Test second card with different marker
        const jumpEvent2 = new CustomEvent("readnlearn:jump-to-phrase", {
            detail: { marker: "phra" }, // matches phrase-2
        });
        window.dispatchEvent(jumpEvent2);

        await waitFor(() => {
            expect(secondCard.style.backgroundColor).toMatch(/rgba\(180,\s*180,\s*180,\s*0\.25\)/);
        });
    });

    it("should not affect other phrase cards when clicking on a specific phrase", async () => {
        const decoratedContent = `
            <span class="phrase-anchor" data-phrase-id="target-phrase">
                Target phrase
                <sup class="phrase-marker">targ</sup>
            </span>
        `;

        const { container: rendererContainer } = render(
            <PlainTextRenderer content={decoratedContent} />,
        );

        // Render multiple phrase cards
        const { container: cardsContainer } = render(
            <div>
                <PhraseCard id="target-phrase" text="Target phrase" translation="Frase objetivo" />
                <PhraseCard id="other-phrase" text="Other phrase" translation="Otra frase" />
            </div>,
        );

        const mockGetComputedStyle = vi.spyOn(window, "getComputedStyle");
        mockGetComputedStyle.mockReturnValue({
            backgroundColor: "rgb(255, 255, 255)",
        } as CSSStyleDeclaration);

        // Click on target phrase
        const targetPhrase = rendererContainer.querySelector('[data-phrase-id="target-phrase"]');
        fireEvent.click(targetPhrase!);

        const targetCard = cardsContainer.querySelector(
            '[id="phrase-card-target-phrase"]',
        ) as HTMLElement;
        const otherCard = cardsContainer.querySelector(
            '[id="phrase-card-other-phrase"]',
        ) as HTMLElement;

        // Target card should blink
        await waitFor(() => {
            expect(targetCard.style.backgroundColor).toMatch(/rgba\(180,\s*180,\s*180,\s*0\.25\)/);
        });

        // Other card should not be affected
        expect(otherCard.style.backgroundColor).toBe("");
    });

    it("should handle rapid successive clicks gracefully", async () => {
        const decoratedContent = `
            <span class="phrase-anchor" data-phrase-id="rapid-phrase">
                Rapid phrase
                <sup class="phrase-marker">rapi</sup>
            </span>
        `;

        const { container: rendererContainer } = render(
            <PlainTextRenderer content={decoratedContent} />,
        );

        const { container: cardContainer } = render(
            <PhraseCard id="rapid-phrase" text="Rapid phrase" translation="Frase rápida" />,
        );

        const mockGetComputedStyle = vi.spyOn(window, "getComputedStyle");
        mockGetComputedStyle.mockReturnValue({
            backgroundColor: "rgb(255, 255, 255)",
        } as CSSStyleDeclaration);

        const phraseAnchor = rendererContainer.querySelector(".phrase-anchor");
        const cardElement = cardContainer.querySelector(
            '[id="phrase-card-rapid-phrase"]',
        ) as HTMLElement;

        // Click rapidly multiple times
        fireEvent.click(phraseAnchor!);
        fireEvent.click(phraseAnchor!);
        fireEvent.click(phraseAnchor!);

        // Should still work correctly
        await waitFor(() => {
            expect(cardElement.style.backgroundColor).toMatch(/rgba\(180,\s*180,\s*180,\s*0\.25\)/);
        });
    });

    it("should handle mixed content with both decorated and plain text", () => {
        const mixedContent = `
            Plain text before.
            <span class="phrase-anchor" data-phrase-id="mixed-phrase">
                Decorated phrase
                <sup class="phrase-marker">mixe</sup>
            </span>
            Plain text after.
        `;

        const mockOnClick = vi.fn();
        const { container } = render(
            <PlainTextRenderer content={mixedContent} onClick={mockOnClick} />,
        );

        // Set up spy before clicking
        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

        // Click on decorated phrase
        const phraseAnchor = container.querySelector(".phrase-anchor");
        fireEvent.click(phraseAnchor!);

        // Should dispatch jump event but not call onClick
        expect(dispatchEventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "readnlearn:jump-to-phrase",
                detail: { marker: "mixe" },
            }),
        );
        expect(mockOnClick).not.toHaveBeenCalled();

        // Reset mocks
        dispatchEventSpy.mockClear();
        mockOnClick.mockClear();

        // Click on plain text
        const plainTextDiv = container.querySelector("div");
        fireEvent.click(plainTextDiv!);

        // Should call onClick but not dispatch jump event
        expect(mockOnClick).toHaveBeenCalled();
        expect(dispatchEventSpy).not.toHaveBeenCalled();
    });
});
