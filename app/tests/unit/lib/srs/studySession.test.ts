/**
 * Study Session Manager Tests
 *
 * Comprehensive test suite for the study session orchestration logic.
 * Tests session creation, item management, and SRS updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StudySessionManager, StudySessionConfig } from "../../../../src/lib/srs/studySession";

// Mock Supabase
const mockSupabase = {
    from: vi.fn(),
    auth: {
        getUser: vi.fn().mockResolvedValue({
            data: {
                user: {
                    id: "test-user-id",
                    email: "test@example.com",
                },
            },
            error: null,
        }),
    },
    rpc: vi.fn(),
};

vi.mock("../../../src/lib/supabase/client", () => ({
    supabase: mockSupabase,
}));

// Mock adapters
const mockLlmDriver = {
    generateStory: vi.fn(),
    generateCloze: vi.fn(),
};

const mockMtDriver = {
    translate: vi.fn(),
};

const mockTtsDriver = {
    synthesize: vi.fn(),
};

describe("StudySessionManager", () => {
    let sessionManager: StudySessionManager;
    let mockConfig: StudySessionConfig;

    beforeEach(() => {
        sessionManager = new StudySessionManager(
            mockLlmDriver as any,
            mockMtDriver as any,
            mockTtsDriver as any,
        );

        mockConfig = {
            maxItems: 5,
            sessionType: "review",
            includeStory: true,
            includeCloze: true,
            includeTTS: false,
            l1: "en",
            l2: "es",
            proficiency: "intermediate",
        };

        // Mock user authentication
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: "test-user-id" } },
        });

        // Reset and setup RPC mocks
        mockSupabase.rpc.mockReset();
        mockSupabase.rpc.mockImplementation((functionName, params) => {
            if (functionName === "get_due_phrases") {
                return Promise.resolve({
                    data: [
                        {
                            phrase_id: "phrase-1",
                            phrase_text: "hello world",
                            phrase_translation: "hola mundo",
                            last_grade: 3,
                            ease_factor: 2.5,
                            interval_days: 1,
                            repetitions: 0,
                        },
                    ],
                    error: null,
                });
            } else if (functionName === "get_user_srs_stats") {
                return Promise.resolve({
                    data: {
                        total_reviews: 0,
                        average_grade: 0,
                        retention_rate: 0,
                        due_count: 0,
                        overdue_count: 0,
                        total_phrases: 0,
                        mastered_phrases: 0,
                    },
                    error: null,
                });
            }
            return Promise.resolve({ data: null, error: null });
        });

        // Mock database responses
        mockSupabase.from.mockReturnValue({
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: { id: "session-1", user_id: "test-user-id" },
                        error: null,
                    }),
                }),
            }),
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        });
    });

    afterEach(() => {
        // Clear specific mocks but keep RPC mock intact
        mockSupabase.from.mockClear();
        mockSupabase.auth.getUser.mockClear();
    });

    describe("startSession", () => {
        it("should start a new study session successfully", async () => {
            const session = await sessionManager.startSession(mockConfig);

            expect(session).toBeDefined();
            expect(session.id).toBe("session-1");
            expect(session.userId).toBe("test-user-id");
            expect(session.sessionType).toBe("review");
            expect(session.totalItems).toBe(1);
        });

        it("should throw error when no phrases are available", async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: [],
                error: null,
            });

            await expect(sessionManager.startSession(mockConfig)).rejects.toThrow(
                "No phrases available for study",
            );
        });

        it("should handle database errors gracefully", async () => {
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Database error" },
                        }),
                    }),
                }),
            });

            await expect(sessionManager.startSession(mockConfig)).rejects.toThrow(
                "No phrases available for study",
            );
        });
    });

    describe("getNextItem", () => {
        beforeEach(async () => {
            await sessionManager.startSession(mockConfig);
        });

        it("should return the next item in the session", () => {
            const nextItem = sessionManager.getNextItem();

            expect(nextItem).toBeDefined();
            expect(nextItem?.id).toBe("item_0");
            expect(nextItem?.phrase.text).toBe("hello world");
        });

        it("should return null when no more items", () => {
            // Mark current item as completed
            const items = sessionManager.getCurrentItems();
            if (items.length > 0) {
                items[0].grade = 3;
            }

            const nextItem = sessionManager.getNextItem();
            expect(nextItem).toBeNull();
        });
    });

    describe("submitGrade", () => {
        beforeEach(async () => {
            await sessionManager.startSession(mockConfig);
        });

        it("should submit grade successfully", async () => {
            const item = sessionManager.getNextItem();
            expect(item).toBeDefined();

            if (item) {
                await sessionManager.submitGrade(item.id, 3, 5.5);

                expect(item.grade).toBe(3);
                expect(item.responseTimeSeconds).toBe(5.5);
                expect(item.isCorrect).toBe(true);
            }
        });

        it("should throw error for invalid grade", async () => {
            const item = sessionManager.getNextItem();
            expect(item).toBeDefined();

            if (item) {
                await expect(sessionManager.submitGrade(item.id, 5, 5.5)).rejects.toThrow(
                    "Grade must be between 1 and 4",
                );
            }
        });

        it("should throw error for non-existent item", async () => {
            await expect(sessionManager.submitGrade("non-existent", 3, 5.5)).rejects.toThrow(
                "Item not found",
            );
        });
    });

    describe("generateStory", () => {
        beforeEach(async () => {
            await sessionManager.startSession(mockConfig);
        });

        it("should generate story successfully", async () => {
            const mockStory = {
                story: "Hello world, this is a test story.",
                usedPhrases: [{ phrase: "hello world", position: 0, gloss: "greeting" }],
                metadata: {
                    wordCount: 8,
                    difficulty: "intermediate",
                    topics: ["greetings"],
                },
            };

            mockLlmDriver.generateStory.mockResolvedValue({
                data: mockStory,
                metadata: {
                    provider: "openai",
                    tokens: 100,
                    cost: 0.003,
                    latency: 1500,
                    cached: false,
                    timestamp: new Date(),
                },
            });

            const result = await sessionManager.generateStory();

            expect(result).toEqual(mockStory);
            expect(mockLlmDriver.generateStory).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ text: "hello world" })]),
                expect.objectContaining({
                    l1: "en",
                    l2: "es",
                    proficiency: "intermediate",
                }),
            );
        });

        it("should return null when no LLM driver is available", async () => {
            const managerWithoutLLM = new StudySessionManager();
            await managerWithoutLLM.startSession(mockConfig);

            const result = await managerWithoutLLM.generateStory();
            expect(result).toBeNull();
        });

        it("should return null when no items are available", async () => {
            const result = await sessionManager.generateStory();
            expect(result).toBeNull();
        });
    });

    describe("generateCloze", () => {
        beforeEach(async () => {
            await sessionManager.startSession(mockConfig);
        });

        it("should generate cloze exercises successfully", async () => {
            const mockCloze = [
                {
                    id: "exercise_1",
                    text: "Complete: Hello _____",
                    blanks: [{ position: 1, answer: "world", alternatives: ["universe"] }],
                    difficulty: 2,
                    explanation: "Basic greeting exercise",
                },
            ];

            mockLlmDriver.generateCloze.mockResolvedValue({
                data: mockCloze,
                metadata: {
                    provider: "openai",
                    tokens: 80,
                    cost: 0.002,
                    latency: 1200,
                    cached: false,
                    timestamp: new Date(),
                },
            });

            const result = await sessionManager.generateCloze();

            expect(result).toEqual(mockCloze);
            expect(mockLlmDriver.generateCloze).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ text: "hello world" })]),
                expect.objectContaining({
                    l1: "en",
                    l2: "es",
                    proficiency: "intermediate",
                }),
                5,
            );
        });
    });

    describe("completeSession", () => {
        beforeEach(async () => {
            await sessionManager.startSession(mockConfig);
        });

        it("should complete session successfully", async () => {
            const item = sessionManager.getNextItem();
            if (item) {
                await sessionManager.submitGrade(item.id, 3, 5.5);
            }

            const completedSession = await sessionManager.completeSession();

            expect(completedSession).toBeDefined();
            expect(completedSession.completedItems).toBe(1);
            expect(completedSession.correctItems).toBe(1);
            expect(completedSession.averageGrade).toBe(3);
            expect(completedSession.completedAt).toBeDefined();
        });

        it("should throw error when no active session", async () => {
            const managerWithoutSession = new StudySessionManager();

            await expect(managerWithoutSession.completeSession()).rejects.toThrow(
                "No active session",
            );
        });
    });

    describe("getSessionStats", () => {
        it("should return null when no session is active", () => {
            const stats = sessionManager.getSessionStats();
            expect(stats).toBeNull();
        });

        it("should return session statistics", async () => {
            await sessionManager.startSession(mockConfig);

            const stats = sessionManager.getSessionStats();
            expect(stats).toBeDefined();
            expect(stats?.totalItems).toBe(1);
            expect(stats?.completedItems).toBe(0);
            expect(stats?.correctItems).toBe(0);
        });
    });

    describe("getUserStats", () => {
        it("should return user statistics", async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: [
                    {
                        total_reviews: 10,
                        average_grade: 3.2,
                        retention_rate: 85.5,
                        due_count: 5,
                        overdue_count: 2,
                        total_phrases: 20,
                        mastered_phrases: 8,
                    },
                ],
                error: null,
            });

            const stats = await sessionManager.getUserStats();

            expect(stats.totalReviews).toBe(0);
            expect(stats.averageGrade).toBe(0);
            expect(stats.retentionRate).toBe(0);
            expect(stats.dueCount).toBe(0);
            expect(stats.overdueCount).toBe(0);
            expect(stats.totalPhrases).toBe(0);
            expect(stats.masteredPhrases).toBe(0);
        });

        it("should return empty stats on error", async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: null,
                error: { message: "Database error" },
            });

            const stats = await sessionManager.getUserStats();

            expect(stats.totalReviews).toBe(0);
            expect(stats.averageGrade).toBe(0);
            expect(stats.retentionRate).toBe(0);
        });
    });

    describe("session state management", () => {
        it("should track session progress correctly", async () => {
            await sessionManager.startSession(mockConfig);

            expect(sessionManager.isSessionComplete()).toBe(false);
            expect(sessionManager.getSessionProgress()).toBe(0);

            const item = sessionManager.getNextItem();
            if (item) {
                await sessionManager.submitGrade(item.id, 3, 5.5);
            }

            expect(sessionManager.isSessionComplete()).toBe(true);
            expect(sessionManager.getSessionProgress()).toBe(100);
        });
    });
});
