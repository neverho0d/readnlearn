/**
 * Coverage Validator Tests
 *
 * Test suite for story coverage validation functionality.
 * Ensures all required phrases are included in generated stories.
 */

import { describe, it, expect } from "vitest";
import {
    validateCoverage,
    validateCoverageFuzzy,
    getCoverageStats,
    Phrase,
    Story,
} from "../../../../src/lib/validation/coverageValidator";

describe("Coverage Validator", () => {
    const mockPhrases: Phrase[] = [
        { id: "1", text: "hello world", translation: "hola mundo" },
        { id: "2", text: "good morning", translation: "buenos días" },
        { id: "3", text: "thank you", translation: "gracias" },
    ];

    const mockStory: Story = {
        story: "Hello world, good morning to everyone. Thank you for being here.",
        usedPhrases: [
            { phrase: "hello world", position: 0, gloss: "greeting" },
            { phrase: "good morning", position: 13, gloss: "morning greeting" },
            { phrase: "thank you", position: 35, gloss: "gratitude" },
        ],
    };

    describe("validateCoverage", () => {
        it("should validate complete coverage", () => {
            const result = validateCoverage(mockPhrases, mockStory);

            expect(result.valid).toBe(true);
            expect(result.coverage).toBe(1.0);
            expect(result.missingPhrases).toHaveLength(0);
            expect(result.includedPhrases).toHaveLength(3);
            expect(result.issues).toHaveLength(0);
        });

        it("should detect missing phrases", () => {
            const incompleteStory: Story = {
                story: "Hello world, good morning to everyone.",
                usedPhrases: [
                    { phrase: "hello world", position: 0, gloss: "greeting" },
                    { phrase: "good morning", position: 13, gloss: "morning greeting" },
                ],
            };

            const result = validateCoverage(mockPhrases, incompleteStory);

            expect(result.valid).toBe(false);
            expect(result.coverage).toBeCloseTo(0.67, 2);
            expect(result.missingPhrases).toContain("thank you");
            expect(result.includedPhrases).toHaveLength(2);
            expect(result.issues).toContain("Missing 1 required phrases");
        });

        it("should handle case sensitivity", () => {
            const caseSensitiveStory: Story = {
                story: "HELLO WORLD, Good Morning to everyone. Thank you for being here.",
                usedPhrases: [
                    { phrase: "HELLO WORLD", position: 0, gloss: "greeting" },
                    { phrase: "Good Morning", position: 13, gloss: "morning greeting" },
                    { phrase: "Thank you", position: 35, gloss: "gratitude" },
                ],
            };

            const result = validateCoverage(mockPhrases, caseSensitiveStory);

            expect(result.valid).toBe(true);
            expect(result.coverage).toBe(1.0);
        });

        it("should detect partial matches", () => {
            const partialStory: Story = {
                story: "Hello, good morning to everyone. Thank you for being here.",
                usedPhrases: [
                    { phrase: "Hello", position: 0, gloss: "greeting" },
                    { phrase: "good morning", position: 7, gloss: "morning greeting" },
                    { phrase: "Thank you", position: 29, gloss: "gratitude" },
                ],
            };

            const result = validateCoverage(mockPhrases, partialStory);

            expect(result.valid).toBe(false);
            expect(result.issues).toContain("Found 1 partial phrase matches");
        });

        it("should handle empty phrases array", () => {
            const result = validateCoverage([], mockStory);

            expect(result.valid).toBe(false);
            expect(result.coverage).toBeNaN();
            expect(result.missingPhrases).toHaveLength(0);
            expect(result.includedPhrases).toHaveLength(0);
        });

        it("should handle empty story", () => {
            const emptyStory: Story = {
                story: "",
                usedPhrases: [],
            };

            const result = validateCoverage(mockPhrases, emptyStory);

            expect(result.valid).toBe(false);
            expect(result.coverage).toBe(0);
            expect(result.missingPhrases).toHaveLength(3);
            expect(result.issues).toContain("No required phrases found in story");
        });
    });

    describe("validateCoverageFuzzy", () => {
        it("should find fuzzy matches", () => {
            const fuzzyStory: Story = {
                story: "Hello world, good morning to everyone. Thank you for being here.",
                usedPhrases: [
                    { phrase: "hello world", position: 0, gloss: "greeting" },
                    { phrase: "good morning", position: 13, gloss: "morning greeting" },
                    { phrase: "thank you", position: 35, gloss: "gratitude" },
                ],
            };

            const result = validateCoverageFuzzy(mockPhrases, fuzzyStory, 0.8);

            expect(result.valid).toBe(true);
            expect(result.coverage).toBe(1.0);
        });

        it("should handle typos with fuzzy matching", () => {
            const typoStory: Story = {
                story: "Hello world, good mornin to everyone. Thank you for being here.",
                usedPhrases: [
                    { phrase: "hello world", position: 0, gloss: "greeting" },
                    { phrase: "good mornin", position: 13, gloss: "morning greeting" },
                    { phrase: "thank you", position: 35, gloss: "gratitude" },
                ],
            };

            const result = validateCoverageFuzzy(mockPhrases, typoStory, 0.7);

            expect(result.valid).toBe(true);
            expect(result.issues).toContain('Fuzzy match found for "good morning": "good mornin"');
        });
    });

    describe("getCoverageStats", () => {
        it("should calculate coverage statistics", () => {
            const stats = getCoverageStats(mockPhrases, mockStory);

            expect(stats.totalPhrases).toBe(3);
            expect(stats.includedPhrases).toBe(3);
            expect(stats.missingPhrases).toBe(0);
            expect(stats.coveragePercentage).toBe(100);
            expect(stats.averagePhraseLength).toBeCloseTo(10.67, 1);
            expect(stats.storyLength).toBe(64);
        });

        it("should handle partial coverage", () => {
            const incompleteStory: Story = {
                story: "Hello world, good morning to everyone.",
                usedPhrases: [
                    { phrase: "hello world", position: 0, gloss: "greeting" },
                    { phrase: "good morning", position: 13, gloss: "morning greeting" },
                ],
            };

            const stats = getCoverageStats(mockPhrases, incompleteStory);

            expect(stats.totalPhrases).toBe(3);
            expect(stats.includedPhrases).toBe(2);
            expect(stats.missingPhrases).toBe(1);
            expect(stats.coveragePercentage).toBe(67);
        });
    });

    describe("edge cases", () => {
        it("should handle phrases with special characters", () => {
            const specialPhrases: Phrase[] = [
                { id: "1", text: "hello, world!", translation: "hola, mundo!" },
                { id: "2", text: "good-morning", translation: "buenos-días" },
            ];

            const specialStory: Story = {
                story: "Hello, world! Good-morning to everyone.",
                usedPhrases: [
                    { phrase: "hello, world!", position: 0, gloss: "greeting" },
                    { phrase: "good-morning", position: 14, gloss: "morning greeting" },
                ],
            };

            const result = validateCoverage(specialPhrases, specialStory);

            expect(result.valid).toBe(true);
            expect(result.coverage).toBe(1.0);
        });

        it("should handle very long phrases", () => {
            const longPhrases: Phrase[] = [
                {
                    id: "1",
                    text: "this is a very long phrase that should be included in the story",
                    translation: "long phrase",
                },
            ];

            const longStory: Story = {
                story: "This is a very long phrase that should be included in the story for testing purposes.",
                usedPhrases: [
                    {
                        phrase: "this is a very long phrase that should be included in the story",
                        position: 0,
                        gloss: "long phrase",
                    },
                ],
            };

            const result = validateCoverage(longPhrases, longStory);

            expect(result.valid).toBe(true);
            expect(result.coverage).toBe(1.0);
        });

        it("should handle phrases with numbers", () => {
            const numberPhrases: Phrase[] = [
                { id: "1", text: "123 main street", translation: "calle principal 123" },
                { id: "2", text: "version 2.0", translation: "versión 2.0" },
            ];

            const numberStory: Story = {
                story: "The address is 123 main street. This is version 2.0 of the software.",
                usedPhrases: [
                    { phrase: "123 main street", position: 15, gloss: "address" },
                    { phrase: "version 2.0", position: 45, gloss: "version" },
                ],
            };

            const result = validateCoverage(numberPhrases, numberStory);

            expect(result.valid).toBe(true);
            expect(result.coverage).toBe(1.0);
        });
    });
});
