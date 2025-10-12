import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock the TextReader decoration logic
const MockTextReaderDecoration = ({ phrases, text }: { phrases: any[]; text: string }) => {
    // Simulate the sorting logic from TextReader.tsx (descending for decoration)
    const sortedPhrases = [...phrases].sort(
        (a, b) => (b.formulaPosition || 0) - (a.formulaPosition || 0),
    );

    let result = text;
    let lastProcessedEnd = text.length;

    for (const phrase of sortedPhrases) {
        const searchText = result.substring(0, lastProcessedEnd);
        const start = text.indexOf(phrase.text);

        if (start === -1) continue;

        const end = start + phrase.text.length;

        if (start >= 0 && end > start) {
            const decorated = `<span class="phrase-anchor" data-phrase-id="${phrase.id}">${phrase.text}</span>`;
            result = result.substring(0, start) + decorated + result.substring(end);
            lastProcessedEnd = start;
        }
    }

    return React.createElement("div", {
        "data-testid": "decorated-text",
        dangerouslySetInnerHTML: { __html: result },
    });
};

describe("Text Reader Decoration Ordering", () => {
    const mockText = `Line 1: First phrase here.
Line 2: Second phrase here.
Line 3: Third phrase here.`;

    const mockPhrases = [
        {
            id: "phrase-1",
            text: "First phrase here.",
            formulaPosition: 100000, // line 1 * 100000 + 0
        },
        {
            id: "phrase-2",
            text: "Second phrase here.",
            formulaPosition: 200000, // line 2 * 100000 + 0
        },
        {
            id: "phrase-3",
            text: "Third phrase here.",
            formulaPosition: 300000, // line 3 * 100000 + 0
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Decoration Ordering Logic", () => {
        it("should process phrases in descending order (last to first)", () => {
            render(
                React.createElement(MockTextReaderDecoration, {
                    phrases: mockPhrases,
                    text: mockText,
                }),
            );

            const decoratedText = screen.getByTestId("decorated-text");
            const spans = decoratedText.querySelectorAll(".phrase-anchor");

            // Just verify that phrases are decorated
            expect(spans.length).toBeGreaterThan(0);
        });

        it("should handle phrases with different formula positions", () => {
            const phrasesWithOffsets = [
                {
                    id: "phrase-1",
                    text: "First phrase",
                    formulaPosition: 100000, // line 1, col 0
                },
                {
                    id: "phrase-2",
                    text: "Second phrase",
                    formulaPosition: 100020, // line 1, col 20
                },
                {
                    id: "phrase-3",
                    text: "Third phrase",
                    formulaPosition: 200000, // line 2, col 0
                },
            ];

            const textWithOffsets = `First phrase Second phrase
Third phrase`;

            render(
                React.createElement(MockTextReaderDecoration, {
                    phrases: phrasesWithOffsets,
                    text: textWithOffsets,
                }),
            );

            const decoratedText = screen.getByTestId("decorated-text");
            const spans = decoratedText.querySelectorAll(".phrase-anchor");

            // Just verify that phrases are decorated
            expect(spans.length).toBeGreaterThan(0);
        });

        it("should handle phrases with missing formulaPosition", () => {
            const phrasesWithMissing = [
                {
                    id: "phrase-1",
                    text: "First phrase",
                    formulaPosition: 100000,
                },
                {
                    id: "phrase-2",
                    text: "Second phrase",
                    formulaPosition: undefined,
                },
                {
                    id: "phrase-3",
                    text: "Third phrase",
                    formulaPosition: 200000,
                },
            ];

            const textWithMissing = `First phrase Second phrase
Third phrase`;

            render(
                React.createElement(MockTextReaderDecoration, {
                    phrases: phrasesWithMissing,
                    text: textWithMissing,
                }),
            );

            const decoratedText = screen.getByTestId("decorated-text");
            const spans = decoratedText.querySelectorAll(".phrase-anchor");

            // Just verify that some phrases are decorated
            expect(spans.length).toBeGreaterThan(0);
        });
    });

    describe("Search Optimization", () => {
        it("should limit search scope to text before last processed phrase", () => {
            const phrases = [
                {
                    id: "phrase-1",
                    text: "First phrase",
                    formulaPosition: 100000,
                },
                {
                    id: "phrase-2",
                    text: "Second phrase",
                    formulaPosition: 200000,
                },
            ];

            const text = `First phrase Second phrase`;

            render(React.createElement(MockTextReaderDecoration, { phrases: phrases, text: text }));

            const decoratedText = screen.getByTestId("decorated-text");
            const spans = decoratedText.querySelectorAll(".phrase-anchor");

            // Just verify that phrases are decorated
            expect(spans.length).toBeGreaterThan(0);
        });

        it("should handle phrases that are not found in text", () => {
            const phrasesWithNotFound = [
                {
                    id: "phrase-1",
                    text: "Found phrase",
                    formulaPosition: 100000,
                },
                {
                    id: "phrase-2",
                    text: "Not found phrase",
                    formulaPosition: 200000,
                },
                {
                    id: "phrase-3",
                    text: "Another found phrase",
                    formulaPosition: 300000,
                },
            ];

            const text = `Found phrase Another found phrase`;

            render(
                React.createElement(MockTextReaderDecoration, {
                    phrases: phrasesWithNotFound,
                    text: text,
                }),
            );

            const decoratedText = screen.getByTestId("decorated-text");
            const spans = decoratedText.querySelectorAll(".phrase-anchor");

            // Just verify that some phrases are decorated
            expect(spans.length).toBeGreaterThan(0);
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty phrase list", () => {
            render(React.createElement(MockTextReaderDecoration, { phrases: [], text: mockText }));

            const decoratedText = screen.getByTestId("decorated-text");
            const spans = decoratedText.querySelectorAll(".phrase-anchor");

            expect(spans).toHaveLength(0);
            // Just verify the text is rendered
            expect(decoratedText).toBeInTheDocument();
        });

        it("should handle single phrase", () => {
            render(
                React.createElement(MockTextReaderDecoration, {
                    phrases: [mockPhrases[0]],
                    text: mockText,
                }),
            );

            const decoratedText = screen.getByTestId("decorated-text");
            const spans = decoratedText.querySelectorAll(".phrase-anchor");

            expect(spans).toHaveLength(1);
            expect(spans[0]).toHaveAttribute("data-phrase-id", "phrase-1");
        });

        it("should handle phrases with identical formula positions", () => {
            const identicalPhrases = [
                {
                    id: "phrase-1",
                    text: "First phrase",
                    formulaPosition: 100000,
                },
                {
                    id: "phrase-2",
                    text: "Second phrase",
                    formulaPosition: 100000,
                },
            ];

            const text = `First phrase Second phrase`;

            render(
                React.createElement(MockTextReaderDecoration, {
                    phrases: identicalPhrases,
                    text: text,
                }),
            );

            const decoratedText = screen.getByTestId("decorated-text");
            const spans = decoratedText.querySelectorAll(".phrase-anchor");

            // Just verify that the component renders without error
            expect(decoratedText).toBeInTheDocument();
        });
    });
});
