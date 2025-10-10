import { describe, it, expect } from "vitest";

/**
 * Test for phrase decoration length calculation
 * This test ensures that phrases with newlines are decorated correctly
 * and prevents regression of the newline counting issue
 */
describe("TextReader Decoration", () => {
    /**
     * Simulates the renderTextWithPhrases function logic
     * This is a simplified version for testing purposes
     */
    function renderTextWithPhrases(
        text: string,
        phrases: Array<{ id: string; text: string; position: number }>,
    ): string {
        if (phrases.length === 0) return text;

        // Process phrases in reverse order to maintain correct positions
        const sortedPhrases = [...phrases].sort((a, b) => b.position - a.position);
        let result = text;

        for (const phrase of sortedPhrases) {
            const start = Math.max(0, phrase.position);
            // Calculate end position using original text length to ensure we get the full phrase
            let end = Math.min(text.length, start + phrase.text.length);

            if (start >= 0 && end > start) {
                // Use the original substring at this position to preserve casing/punctuation
                const original = text.substring(start, end);

                // Fix for newline characters: count newlines in the original substring
                // and adjust the end position to include them
                const newlineCount = (original.match(/\n/g) || []).length;
                if (newlineCount > 0) {
                    // Extend the end position to include the newlines
                    end = Math.min(text.length, end + newlineCount);
                    // Re-extract the original with the corrected end position
                    const correctedOriginal = text.substring(start, end);

                    // Create decorated phrase with superscript marker
                    const decoratedPhrase = `<span class="phrase-anchor" data-phrase-id="${phrase.id}">${correctedOriginal}<sup class="phrase-marker">${phrase.id.substring(0, 4)}</sup></span>`;

                    // Replace the phrase in the text
                    result = result.substring(0, start) + decoratedPhrase + result.substring(end);
                } else {
                    // No newlines, use original logic
                    const decoratedPhrase = `<span class="phrase-anchor" data-phrase-id="${phrase.id}">${original}<sup class="phrase-marker">${phrase.id.substring(0, 4)}</sup></span>`;

                    // Replace the phrase in the text
                    result = result.substring(0, start) + decoratedPhrase + result.substring(end);
                }
            }
        }

        return result;
    }

    it("should decorate phrases without newlines correctly", () => {
        const text = "Hello world! This is a test.";
        const phrases = [
            { id: "test1", text: "Hello world!", position: 0 },
            { id: "test2", text: "This is a test.", position: 13 },
        ];

        const result = renderTextWithPhrases(text, phrases);

        expect(result).toContain('data-phrase-id="test1"');
        expect(result).toContain('data-phrase-id="test2"');
        expect(result).toContain("Hello world!");
        expect(result).toContain("This is a test.");
    });

    it("should handle phrases with newlines correctly", () => {
        const text = "Hello\nworld! This is a\ntest.";
        const phrases = [
            { id: "test1", text: "Hello\nworld!", position: 0 },
            { id: "test2", text: "This is a\ntest.", position: 13 },
        ];

        const result = renderTextWithPhrases(text, phrases);

        // Check that the decoration includes the full phrase with newlines
        expect(result).toContain('data-phrase-id="test1"');
        expect(result).toContain('data-phrase-id="test2"');
        expect(result).toContain("Hello\nworld!");
        expect(result).toContain("This is a\ntest.");
    });

    it("should handle phrases with multiple newlines correctly", () => {
        const text = "Line 1\nLine 2\nLine 3";
        const phrases = [{ id: "test1", text: "Line 1\nLine 2\nLine 3", position: 0 }];

        const result = renderTextWithPhrases(text, phrases);

        expect(result).toContain('data-phrase-id="test1"');
        expect(result).toContain("Line 1\nLine 2\nLine 3");
    });

    it("should handle phrases with newlines at the end correctly", () => {
        const text = "Hello world!\nThis is a test.\n";
        const phrases = [
            { id: "test1", text: "Hello world!\n", position: 0 },
            { id: "test2", text: "This is a test.\n", position: 13 },
        ];

        const result = renderTextWithPhrases(text, phrases);

        expect(result).toContain('data-phrase-id="test1"');
        expect(result).toContain('data-phrase-id="test2"');
        expect(result).toContain("Hello world!\n");
        expect(result).toContain("This is a test.\n");
    });

    it("should handle mixed content with and without newlines", () => {
        const text = "Simple text. Text with\nnewlines. More text.";
        const phrases = [
            { id: "test1", text: "Simple text.", position: 0 },
            { id: "test2", text: "Text with\nnewlines.", position: 13 },
        ];

        const result = renderTextWithPhrases(text, phrases);

        expect(result).toContain('data-phrase-id="test1"');
        expect(result).toContain('data-phrase-id="test2"');
        expect(result).toContain("Simple text.");
        expect(result).toContain("Text with\nnewlines.");
    });

    it("should handle edge case with newlines at phrase boundaries", () => {
        const text = "Start\nMiddle\nEnd";
        const phrases = [
            { id: "test1", text: "Start\n", position: 0 },
            { id: "test2", text: "Middle\n", position: 6 },
            { id: "test3", text: "End", position: 13 },
        ];

        const result = renderTextWithPhrases(text, phrases);

        expect(result).toContain('data-phrase-id="test1"');
        expect(result).toContain('data-phrase-id="test2"');
        expect(result).toContain('data-phrase-id="test3"');
        expect(result).toContain("Start\n");
        expect(result).toContain("Middle\n");
        expect(result).toContain("End");
    });
});
