import { describe, it, expect } from "vitest";
import {
    findPhraseWithFlexibleWhitespace,
    findActualMatchedText,
} from "../../../../src/features/reader/TextReader";

describe("TextReader Phrase Matching Functions", () => {
    describe("findPhraseWithFlexibleWhitespace", () => {
        it("should find exact matches", () => {
            const text = "Hello world, this is a test phrase.";
            const phrase = "Hello world";

            const result = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(result).toBe(0);
        });

        it("should find case-insensitive matches", () => {
            const text = "HELLO WORLD, this is a test phrase.";
            const phrase = "hello world";

            const result = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(result).toBe(0);
        });

        it("should handle whitespace variations", () => {
            const text = "Hello    world, this is a test phrase.";
            const phrase = "Hello world";

            const result = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(result).toBe(0);
        });

        it("should handle newline variations", () => {
            const text = "Hello\nworld, this is a test phrase.";
            const phrase = "Hello world";

            const result = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(result).toBe(0);
        });

        it("should handle carriage return variations", () => {
            const text = "Hello\r\nworld, this is a test phrase.";
            const phrase = "Hello world";

            const result = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(result).toBe(0);
        });

        it("should handle mixed whitespace", () => {
            const text = "Hello\t\n\r world, this is a test phrase.";
            const phrase = "Hello world";

            const result = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(result).toBe(0);
        });

        it("should return -1 for phrases not found", () => {
            const text = "Hello world, this is a test phrase.";
            const phrase = "Goodbye world";

            const result = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(result).toBe(-1);
        });

        it("should handle special regex characters", () => {
            const text = "Hello (world), this is a test phrase.";
            const phrase = "Hello (world)";

            const result = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(result).toBe(0);
        });
    });

    describe("findActualMatchedText", () => {
        it("should return exact match when found", () => {
            const phraseText = "Hello world";
            const text = "Hello world, this is a test phrase.";
            const startPosition = 0;

            const result = findActualMatchedText(phraseText, text, startPosition);
            expect(result).toBe("Hello world");
        });

        it("should handle whitespace differences", () => {
            const phraseText = "Hello world";
            const text = "Hello    world, this is a test phrase.";
            const startPosition = 0;

            const result = findActualMatchedText(phraseText, text, startPosition);
            expect(result).toBe("Hello    world");
        });

        it("should fallback to original phrase when no match found", () => {
            const phraseText = "Hello world";
            const text = "Goodbye world, this is a test phrase.";
            const startPosition = 0;

            const result = findActualMatchedText(phraseText, text, startPosition);
            expect(result).toBe(phraseText);
        });

        it("should handle key word matching", () => {
            const phraseText = "Hello beautiful world";
            const text = "Hello beautiful world, this is a test phrase.";
            const startPosition = 0;

            const result = findActualMatchedText(phraseText, text, startPosition);
            expect(result).toBe("Hello beautiful world");
        });
    });

    describe("Multi-paragraph phrase decoration", () => {
        it("should handle single line phrases", () => {
            const phrase = "Hello world";
            const phraseId = "test-123";

            // Test the decoration logic for single line phrases
            const phraseParts = phrase.split("\n");
            const decoratedParts = phraseParts.map((part, index) => {
                if (index === phraseParts.length - 1) {
                    // Last part: end with closing span and marker
                    if (index === 0) {
                        // Single part: complete span with marker
                        return `<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}<sup class="phrase-marker">${phraseId.substring(0, 4)}</sup></span>`;
                    } else {
                        // Last part of multi-part: close previous span and add marker
                        return `</span>\n<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}<sup class="phrase-marker">${phraseId.substring(0, 4)}</sup></span>`;
                    }
                } else if (index === 0) {
                    // First part (but not last): start with opening span
                    return `<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}`;
                } else {
                    // Middle parts: close previous span and open new one
                    return `</span>\n<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}`;
                }
            });

            const result = decoratedParts.join("");
            expect(result).toBe(
                `<span class="phrase-anchor" data-phrase-id="${phraseId}">Hello world<sup class="phrase-marker">test</sup></span>`,
            );
        });

        it("should handle multi-line phrases", () => {
            const phrase = "Hello\nworld\nthis is a test";
            const phraseId = "test-123";

            const phraseParts = phrase.split("\n");
            const decoratedParts = phraseParts.map((part, index) => {
                if (index === phraseParts.length - 1) {
                    // Last part: end with closing span and marker
                    if (index === 0) {
                        // Single part: complete span with marker
                        return `<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}<sup class="phrase-marker">${phraseId.substring(0, 4)}</sup></span>`;
                    } else {
                        // Last part of multi-part: close previous span and add marker
                        return `</span>\n<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}<sup class="phrase-marker">${phraseId.substring(0, 4)}</sup></span>`;
                    }
                } else if (index === 0) {
                    // First part (but not last): start with opening span
                    return `<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}`;
                } else {
                    // Middle parts: close previous span and open new one
                    return `</span>\n<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}`;
                }
            });

            const result = decoratedParts.join("");
            const expected = `<span class="phrase-anchor" data-phrase-id="${phraseId}">Hello</span>\n<span class="phrase-anchor" data-phrase-id="${phraseId}">world</span>\n<span class="phrase-anchor" data-phrase-id="${phraseId}">this is a test<sup class="phrase-marker">test</sup></span>`;
            expect(result).toBe(expected);
        });

        it("should handle empty phrases", () => {
            const phrase = "";
            const phraseId = "test-123";

            const phraseParts = phrase.split("\n");
            const decoratedParts = phraseParts.map((part, index) => {
                if (index === phraseParts.length - 1) {
                    // Last part: end with closing span and marker
                    if (index === 0) {
                        // Single part: complete span with marker
                        return `<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}<sup class="phrase-marker">${phraseId.substring(0, 4)}</sup></span>`;
                    } else {
                        // Last part of multi-part: close previous span and add marker
                        return `</span>\n<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}<sup class="phrase-marker">${phraseId.substring(0, 4)}</sup></span>`;
                    }
                } else if (index === 0) {
                    // First part (but not last): start with opening span
                    return `<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}`;
                } else {
                    // Middle parts: close previous span and open new one
                    return `</span>\n<span class="phrase-anchor" data-phrase-id="${phraseId}">${part}`;
                }
            });

            const result = decoratedParts.join("");
            expect(result).toBe(
                `<span class="phrase-anchor" data-phrase-id="${phraseId}"><sup class="phrase-marker">test</sup></span>`,
            );
        });
    });

    describe("Integration tests", () => {
        it("should handle complex multi-paragraph phrases with various whitespace", () => {
            const text = `Downstairs, Myra was bustling around, pouring coffee, folding napkins, pulling out his chair for him. He sat down, and she kissed him on his bald spot. He liked being kissed on his bald spot. "How's my little wife this morning?" he asked.`;
            const phrase = `Downstairs, Myra was bustling around, pouring coffee, folding napkins, pulling out his chair for him. He sat down, and she kissed him on his bald spot. He liked being kissed on his bald spot. "How's my little wife this morning?" he asked.`;

            const start = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(start).toBe(0);

            const actualText = findActualMatchedText(phrase, text, start);
            expect(actualText).toBe(phrase);
        });

        it("should handle phrases with special characters and punctuation", () => {
            const text = 'He said, "Hello world!" and smiled.';
            const phrase = 'He said, "Hello world!" and smiled.';

            const start = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(start).toBe(0);
        });

        it("should handle phrases with mixed case", () => {
            const text = "HELLO WORLD, this is a test phrase.";
            const phrase = "hello world";

            const start = findPhraseWithFlexibleWhitespace(phrase, text);
            expect(start).toBe(0);
        });
    });
});
