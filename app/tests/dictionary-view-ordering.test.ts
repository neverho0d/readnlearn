import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock the DictionaryView component
const MockDictionaryView = ({ phrases }: { phrases: any[] }) => {
    // Simulate the sorting logic from DictionaryView.tsx
    const sortedPhrases = [...phrases].sort((a, b) => {
        const aLine = (a as any).lineNo || 0;
        const aCol = (a as any).colOffset || 0;
        const bLine = (b as any).lineNo || 0;
        const bCol = (b as any).colOffset || 0;

        const aPosition = aLine * 100000 + aCol;
        const bPosition = bLine * 100000 + bCol;

        return aPosition - bPosition;
    });

    return React.createElement(
        "div",
        { "data-testid": "phrase-list" },
        sortedPhrases.map((phrase, index) =>
            React.createElement(
                "div",
                {
                    key: phrase.id,
                    "data-testid": `phrase-${index}`,
                },
                `${phrase.text} (Line ${phrase.lineNo}, Col ${phrase.colOffset})`,
            ),
        ),
    );
};

describe("Dictionary View Phrase Ordering", () => {
    const mockPhrases = [
        {
            id: "phrase-1",
            text: "First phrase",
            lineNo: 1,
            colOffset: 0,
        },
        {
            id: "phrase-2",
            text: "Second phrase",
            lineNo: 2,
            colOffset: 0,
        },
        {
            id: "phrase-3",
            text: "Third phrase",
            lineNo: 3,
            colOffset: 0,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Phrase Sorting Logic", () => {
        it("should sort phrases by line number ascending", () => {
            const shuffledPhrases = [mockPhrases[2], mockPhrases[0], mockPhrases[1]];

            render(React.createElement(MockDictionaryView, { phrases: shuffledPhrases }));

            const phraseElements = screen.getAllByTestId(/phrase-\d+/);

            expect(phraseElements[0]).toHaveTextContent("First phrase (Line 1, Col 0)");
            expect(phraseElements[1]).toHaveTextContent("Second phrase (Line 2, Col 0)");
            expect(phraseElements[2]).toHaveTextContent("Third phrase (Line 3, Col 0)");
        });

        it("should sort phrases by column offset within same line", () => {
            const sameLinePhrases = [
                {
                    id: "phrase-1",
                    text: "First phrase",
                    lineNo: 1,
                    colOffset: 20,
                },
                {
                    id: "phrase-2",
                    text: "Second phrase",
                    lineNo: 1,
                    colOffset: 0,
                },
                {
                    id: "phrase-3",
                    text: "Third phrase",
                    lineNo: 1,
                    colOffset: 10,
                },
            ];

            render(React.createElement(MockDictionaryView, { phrases: sameLinePhrases }));

            const phraseElements = screen.getAllByTestId(/phrase-\d+/);

            expect(phraseElements[0]).toHaveTextContent("Second phrase (Line 1, Col 0)");
            expect(phraseElements[1]).toHaveTextContent("Third phrase (Line 1, Col 10)");
            expect(phraseElements[2]).toHaveTextContent("First phrase (Line 1, Col 20)");
        });

        it("should handle mixed line numbers and column offsets", () => {
            const mixedPhrases = [
                {
                    id: "phrase-1",
                    text: "Line 2, Col 10",
                    lineNo: 2,
                    colOffset: 10,
                },
                {
                    id: "phrase-2",
                    text: "Line 1, Col 20",
                    lineNo: 1,
                    colOffset: 20,
                },
                {
                    id: "phrase-3",
                    text: "Line 2, Col 0",
                    lineNo: 2,
                    colOffset: 0,
                },
            ];

            render(React.createElement(MockDictionaryView, { phrases: mixedPhrases }));

            const phraseElements = screen.getAllByTestId(/phrase-\d+/);

            // Should be ordered by formula: line_no * 100000 + col_offset
            expect(phraseElements[0]).toHaveTextContent("Line 1, Col 20 (Line 1, Col 20)"); // 100020
            expect(phraseElements[1]).toHaveTextContent("Line 2, Col 0 (Line 2, Col 0)"); // 200000
            expect(phraseElements[2]).toHaveTextContent("Line 2, Col 10 (Line 2, Col 10)"); // 200010
        });
    });

    describe("Edge Cases", () => {
        it("should handle phrases with missing lineNo and colOffset", () => {
            const phrasesWithMissing = [
                {
                    id: "phrase-1",
                    text: "Normal phrase",
                    lineNo: 1,
                    colOffset: 0,
                },
                {
                    id: "phrase-2",
                    text: "Missing position",
                    lineNo: undefined,
                    colOffset: undefined,
                },
                {
                    id: "phrase-3",
                    text: "Another normal phrase",
                    lineNo: 2,
                    colOffset: 0,
                },
            ];

            render(React.createElement(MockDictionaryView, { phrases: phrasesWithMissing }));

            const phraseElements = screen.getAllByTestId(/phrase-\d+/);

            // Phrase with missing position should come first (formula position = 0)
            expect(phraseElements[0]).toHaveTextContent(
                "Missing position (Line undefined, Col undefined)",
            );
            expect(phraseElements[1]).toHaveTextContent("Normal phrase (Line 1, Col 0)");
            expect(phraseElements[2]).toHaveTextContent("Another normal phrase (Line 2, Col 0)");
        });

        it("should handle empty phrase list", () => {
            render(React.createElement(MockDictionaryView, { phrases: [] }));

            const phraseList = screen.getByTestId("phrase-list");
            expect(phraseList).toBeEmptyDOMElement();
        });

        it("should handle single phrase", () => {
            render(React.createElement(MockDictionaryView, { phrases: [mockPhrases[0]] }));

            const phraseElements = screen.getAllByTestId(/phrase-\d+/);
            expect(phraseElements).toHaveLength(1);
            expect(phraseElements[0]).toHaveTextContent("First phrase (Line 1, Col 0)");
        });
    });

    describe("Formula Position Calculation", () => {
        it("should calculate formula position correctly for various combinations", () => {
            const testCases = [
                { lineNo: 1, colOffset: 0, expected: 100000 },
                { lineNo: 1, colOffset: 10, expected: 100010 },
                { lineNo: 2, colOffset: 0, expected: 200000 },
                { lineNo: 2, colOffset: 5, expected: 200005 },
                { lineNo: 100, colOffset: 0, expected: 10000000 },
                { lineNo: 100, colOffset: 50, expected: 10000050 },
            ];

            testCases.forEach(({ lineNo, colOffset, expected }) => {
                const formulaPosition = lineNo * 100000 + colOffset;
                expect(formulaPosition).toBe(expected);
            });
        });

        it("should maintain correct ordering with large line numbers", () => {
            const largeLinePhrases = [
                {
                    id: "phrase-1",
                    text: "Line 1000",
                    lineNo: 1000,
                    colOffset: 0,
                },
                {
                    id: "phrase-2",
                    text: "Line 999",
                    lineNo: 999,
                    colOffset: 0,
                },
                {
                    id: "phrase-3",
                    text: "Line 1001",
                    lineNo: 1001,
                    colOffset: 0,
                },
            ];

            render(React.createElement(MockDictionaryView, { phrases: largeLinePhrases }));

            const phraseElements = screen.getAllByTestId(/phrase-\d+/);

            expect(phraseElements[0]).toHaveTextContent("Line 999 (Line 999, Col 0)");
            expect(phraseElements[1]).toHaveTextContent("Line 1000 (Line 1000, Col 0)");
            expect(phraseElements[2]).toHaveTextContent("Line 1001 (Line 1001, Col 0)");
        });
    });
});
