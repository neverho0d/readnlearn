/**
 * OpenAI Driver Tests
 *
 * Comprehensive test suite for the OpenAI LLM adapter.
 * Tests story generation, cloze exercises, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIDriver } from "../../../src/adapters/llm/OpenAIDriver";
import { ProviderConfig } from "../../../src/adapters/base/types";

// Mock OpenAI
vi.mock("openai", () => ({
    default: vi.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: vi.fn(),
            },
        },
        models: {
            list: vi.fn(),
        },
    })),
}));

describe("OpenAIDriver", () => {
    let driver: OpenAIDriver;
    let mockConfig: ProviderConfig;

    beforeEach(() => {
        mockConfig = {
            apiKey: "test-api-key",
            baseUrl: "https://api.openai.com/v1",
            timeout: 30000,
            retries: 3,
            cache: true,
        };
        driver = new OpenAIDriver(mockConfig, "gpt-4");
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("constructor", () => {
        it("should initialize with correct provider and config", () => {
            expect(driver.provider).toBe("openai");
            expect(driver.config).toBe(mockConfig);
        });

        it("should use default model if not specified", () => {
            const defaultDriver = new OpenAIDriver(mockConfig);
            expect(defaultDriver).toBeDefined();
        });
    });

    describe("testConnection", () => {
        it("should return true for successful connection", async () => {
            const mockResponse = { data: [{ id: "gpt-4" }] };
            (driver as any).client.models.list = vi.fn().mockResolvedValue(mockResponse);

            const result = await driver.testConnection();
            expect(result).toBe(true);
        });

        it("should return false for failed connection", async () => {
            (driver as any).client.models.list = vi
                .fn()
                .mockRejectedValue(new Error("Connection failed"));

            const result = await driver.testConnection();
            expect(result).toBe(false);
        });
    });

    describe("generateStory", () => {
        const mockPhrases = [
            { id: "1", text: "hello world", translation: "hola mundo" },
            { id: "2", text: "good morning", translation: "buenos días" },
        ];

        const mockContext = {
            l1: "en",
            l2: "es",
            proficiency: "intermediate" as const,
        };

        it("should generate story successfully", async () => {
            const mockResponse = {
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                story: "Hello world, good morning to everyone!",
                                usedPhrases: [
                                    { phrase: "hello world", position: 0, gloss: "greeting" },
                                    {
                                        phrase: "good morning",
                                        position: 13,
                                        gloss: "morning greeting",
                                    },
                                ],
                                metadata: {
                                    wordCount: 6,
                                    difficulty: "intermediate",
                                    topics: ["greetings"],
                                },
                            }),
                        },
                    },
                ],
                usage: { total_tokens: 100 },
            };

            (driver as any).client.chat.completions.create = vi
                .fn()
                .mockResolvedValue(mockResponse);

            const result = await driver.generateStory(mockPhrases, mockContext);

            expect(result.data.story).toBe("Hello world, good morning to everyone!");
            expect(result.data.usedPhrases).toHaveLength(2);
            expect(result.metadata.provider).toBe("openai");
            expect(result.metadata.tokens).toBe(100);
        });

        it("should handle API errors gracefully", async () => {
            (driver as any).client.chat.completions.create = vi
                .fn()
                .mockRejectedValue(new Error("API rate limit exceeded"));

            await expect(driver.generateStory(mockPhrases, mockContext)).rejects.toThrow();
        });

        it("should handle invalid JSON response", async () => {
            const mockResponse = {
                choices: [
                    {
                        message: {
                            content: "Invalid JSON response",
                        },
                    },
                ],
                usage: { total_tokens: 50 },
            };

            (driver as any).client.chat.completions.create = vi
                .fn()
                .mockResolvedValue(mockResponse);

            await expect(driver.generateStory(mockPhrases, mockContext)).rejects.toThrow();
        });
    });

    describe("generateCloze", () => {
        const mockPhrases = [{ id: "1", text: "hello world", translation: "hola mundo" }];

        const mockContext = {
            l1: "en",
            l2: "es",
            proficiency: "intermediate" as const,
        };

        it("should generate cloze exercises successfully", async () => {
            const mockResponse = {
                choices: [
                    {
                        message: {
                            content: JSON.stringify([
                                {
                                    id: "exercise_1",
                                    text: "Complete: Hello _____",
                                    blanks: [
                                        {
                                            position: 1,
                                            answer: "world",
                                            alternatives: ["universe"],
                                        },
                                    ],
                                    difficulty: 2,
                                    explanation: "Basic greeting exercise",
                                },
                            ]),
                        },
                    },
                ],
                usage: { total_tokens: 80 },
            };

            (driver as any).client.chat.completions.create = vi
                .fn()
                .mockResolvedValue(mockResponse);

            const result = await driver.generateCloze(mockPhrases, mockContext, 1);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].id).toBe("exercise_1");
            expect(result.data[0].blanks).toHaveLength(1);
        });
    });

    describe("validateStory", () => {
        const mockStory = {
            story: "Hello world, good morning!",
            usedPhrases: [
                { phrase: "hello world", position: 0, gloss: "greeting" },
                { phrase: "good morning", position: 13, gloss: "morning greeting" },
            ],
        };

        const mockPhrases = [
            { id: "1", text: "hello world" },
            { id: "2", text: "good morning" },
        ];

        it("should validate story successfully", async () => {
            const mockResponse = {
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                valid: true,
                                issues: [],
                                coverage: 1.0,
                            }),
                        },
                    },
                ],
                usage: { total_tokens: 60 },
            };

            (driver as any).client.chat.completions.create = vi
                .fn()
                .mockResolvedValue(mockResponse);

            const result = await driver.validateStory(mockStory.story, mockPhrases);

            expect(result.data.valid).toBe(true);
            expect(result.data.coverage).toBe(1.0);
        });
    });

    describe("explainPhrase", () => {
        const mockPhrase = {
            id: "1",
            text: "hello world",
            context: "greeting",
        };

        const mockContext = {
            l1: "en",
            l2: "es",
            proficiency: "intermediate" as const,
        };

        it("should explain phrase successfully", async () => {
            const mockResponse = {
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                explanation: "A common greeting phrase",
                                examples: ["Hello world!", "Hello world, how are you?"],
                                grammar: "Noun phrase",
                                tips: ["Use in informal settings"],
                            }),
                        },
                    },
                ],
                usage: { total_tokens: 70 },
            };

            (driver as any).client.chat.completions.create = vi
                .fn()
                .mockResolvedValue(mockResponse);

            const result = await driver.explainPhrase(mockPhrase, mockContext, "normal");

            expect(result.data.explanation).toBe("A common greeting phrase");
            expect(result.data.examples).toHaveLength(2);
        });
    });

    describe("getUsage", () => {
        it("should return usage statistics", async () => {
            const result = await driver.getUsage();

            expect(result.provider).toBe("openai");
            expect(result.period).toBe("daily");
            expect(typeof result.tokensUsed).toBe("number");
            expect(typeof result.costUsd).toBe("number");
        });
    });

    describe("error handling", () => {
        it("should create provider error with correct properties", () => {
            const error = new Error("Test error");
            const providerError = (driver as any).createProviderError(error);

            expect(providerError.name).toBe("OpenAIError");
            expect(providerError.provider).toBe("openai");
            expect(providerError.message).toBe("Test error");
        });

        it("should handle retryable errors", async () => {
            const mockResponse = {
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                story: "Test story",
                                usedPhrases: [],
                                metadata: { wordCount: 2, difficulty: "easy", topics: [] },
                            }),
                        },
                    },
                ],
                usage: { total_tokens: 50 },
            };

            // First call fails, second succeeds
            (driver as any).client.chat.completions.create = vi
                .fn()
                .mockRejectedValueOnce(new Error("Rate limit"))
                .mockResolvedValueOnce(mockResponse);

            const result = await driver.generateStory([{ id: "1", text: "test" }], {
                l1: "en",
                l2: "es",
                proficiency: "beginner",
            });

            expect(result.data.story).toBe("Test story");
            expect((driver as any).client.chat.completions.create).toHaveBeenCalledTimes(2);
        });
    });

    describe("cost calculation", () => {
        it("should calculate cost correctly for different models", () => {
            const gpt4Driver = new OpenAIDriver(mockConfig, "gpt-4");
            const gpt35Driver = new OpenAIDriver(mockConfig, "gpt-3.5-turbo");

            const gpt4Cost = (gpt4Driver as any).calculateCost(1000);
            const gpt35Cost = (gpt35Driver as any).calculateCost(1000);

            expect(gpt4Cost).toBeGreaterThan(gpt35Cost);
            expect(gpt4Cost).toBeCloseTo(0.03, 2); // $0.03 per 1K tokens
            expect(gpt35Cost).toBeCloseTo(0.002, 3); // $0.002 per 1K tokens
        });
    });
});
