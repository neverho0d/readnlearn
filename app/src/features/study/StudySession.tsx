/**
 * Study Session Component
 *
 * Main orchestrator for study sessions. Manages the flow between
 * cloze exercises, story generation, and grading.
 */

import { useState, useEffect, useCallback } from "react";
import {
    StudySessionManager,
    StudySession,
    StudyItem,
    StoryResult,
    ClozeResult,
} from "../../lib/srs/studySession";
import { StudyStats } from "./StudyStats";
import { ClozeExercise } from "./ClozeExercise";
import { StoryView } from "./StoryView";
import { GradingButtons } from "./GradingButtons";
import { getStoryForContent } from "../../lib/phrases/storyQueue";
import { generateContentHash } from "../../lib/db/phraseStore";

export interface StudySessionProps {
    config: {
        maxItems: number;
        sessionType: "review" | "new" | "mixed";
        includeStory: boolean;
        includeCloze: boolean;
        includeTTS: boolean;
        l1: string;
        l2: string;
        proficiency: "beginner" | "intermediate" | "advanced";
    };
    currentText?: string; // Text content to load stories for
    // eslint-disable-next-line no-unused-vars
    onSessionComplete: (session: StudySession) => void;
    onSessionCancel: () => void;
}

export interface StudySessionState {
    phase: "loading" | "cloze" | "story" | "grading" | "complete";
    currentItem?: StudyItem;
    story?: StoryResult;
    clozeExercises: ClozeResult[];
    session?: StudySession;
    error?: string;
}

export function StudySessionComponent({
    config,
    currentText,
    onSessionComplete,
    onSessionCancel,
}: StudySessionProps) {
    const [state, setState] = useState<StudySessionState>({
        phase: "loading",
        clozeExercises: [],
    });

    const [sessionManager] = useState(() => new StudySessionManager());

    /**
     * Start the study session
     */
    const startSession = useCallback(async () => {
        try {
            setState((prev) => ({ ...prev, phase: "loading", error: undefined }));

            const session = await sessionManager.startSession(config);

            // Determine initial phase based on configuration
            if (config.includeCloze) {
                setState((prev) => ({ ...prev, session, phase: "cloze" }));

                // Move to first item for cloze exercises
                const firstItem = sessionManager.getNextItem();
                if (firstItem) {
                    setState((prev) => ({ ...prev, currentItem: firstItem, phase: "cloze" }));
                } else {
                    setState((prev) => ({ ...prev, phase: "story" }));
                }
            } else {
                // Skip cloze exercises, go directly to story phase
                setState((prev) => ({ ...prev, session, phase: "story" }));

                // Load stories for the story phase
                if (config.includeStory) {
                    const story = await loadStories();
                    if (story) {
                        setState((prev) => ({ ...prev, story, phase: "grading" }));
                    } else {
                        // No stories available, go to completion
                        setState((prev) => ({ ...prev, phase: "complete" }));
                    }
                } else {
                    // No story phase, go to completion
                    setState((prev) => ({ ...prev, phase: "complete" }));
                }
            }
        } catch (error) {
            console.error("Failed to start session:", error);
            setState((prev) => ({
                ...prev,
                error: error instanceof Error ? error.message : "Failed to start session",
                phase: "loading",
            }));
        }
    }, [sessionManager, config]);

    /**
     * Handle cloze exercise completion
     */
    const handleClozeComplete = useCallback(
        async (itemId: string, isCorrect: boolean, responseTime: number) => {
            try {
                // Submit grade (1-4 based on performance)
                const grade = isCorrect ? (responseTime < 5 ? 4 : 3) : responseTime < 10 ? 2 : 1;
                await sessionManager.submitGrade(itemId, grade, responseTime);

                // Move to next item or story phase
                const nextItem = sessionManager.getNextItem();
                if (nextItem) {
                    setState((prev) => ({ ...prev, currentItem: nextItem }));
                } else {
                    setState((prev) => ({ ...prev, phase: "story" }));
                }
            } catch (error) {
                console.error("Failed to submit grade:", error);
                setState((prev) => ({ ...prev, error: "Failed to submit grade" }));
            }
        },
        [sessionManager],
    );

    /**
     * Load stories for the current text content
     */
    const loadStories = useCallback(async () => {
        if (!currentText) {
            console.log("No current text provided, skipping story loading");
            return null;
        }

        try {
            const contentHash = generateContentHash(currentText);
            const stories = await getStoryForContent(contentHash);

            if (stories && stories.length > 0) {
                // Convert PhraseStory[] to StoryResult format
                const combinedStory = stories.map((s) => s.story).join("\n\n");
                const wordCount = combinedStory.split(/\s+/).length;

                const storyResult: StoryResult = {
                    story: combinedStory,
                    usedPhrases: stories.map((s) => ({
                        phrase: s.phrase,
                        position: 0, // Position not available from database
                        gloss: s.translation,
                    })),
                    metadata: {
                        wordCount: wordCount,
                        difficulty: "intermediate", // Default difficulty
                        topics: stories.map((s) => s.phrase), // Use phrases as topics
                    },
                };

                console.log("Loaded stories for study session:", stories.length);
                return storyResult;
            } else {
                console.log("No stories found for content");
                return null;
            }
        } catch (error) {
            console.error("Failed to load stories:", error);
            return null;
        }
    }, [currentText]);

    /**
     * Handle story grading
     */
    const handleStoryGrading = useCallback(
        async (grade: number) => {
            try {
                // Grade the overall story
                const items = sessionManager.getCurrentItems();
                for (const item of items) {
                    if (item.grade === undefined) {
                        await sessionManager.submitGrade(item.id, grade, 0);
                    }
                }

                // Complete the session
                const completedSession = await sessionManager.completeSession();
                setState((prev) => ({ ...prev, session: completedSession, phase: "complete" }));

                onSessionComplete(completedSession);
            } catch (error) {
                console.error("Failed to complete session:", error);
                setState((prev) => ({ ...prev, error: "Failed to complete session" }));
            }
        },
        [sessionManager, onSessionComplete],
    );

    /**
     * Cancel the session
     */
    const handleCancel = useCallback(() => {
        onSessionCancel();
    }, [onSessionCancel]);

    // Start session on mount
    useEffect(() => {
        startSession();
    }, [startSession]);

    // Render loading state
    if (state.phase === "loading") {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2rem",
                    minHeight: "400px",
                }}
            >
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        border: "4px solid var(--border-color)",
                        borderTop: "4px solid var(--primary)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        marginBottom: "1rem",
                    }}
                />
                <p>Preparing your study session...</p>
                {state.error && (
                    <div style={{ color: "var(--error)", marginTop: "1rem" }}>{state.error}</div>
                )}
            </div>
        );
    }

    // Render error state
    if (state.error && state.phase !== "complete") {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2rem",
                    minHeight: "400px",
                }}
            >
                <div style={{ color: "var(--error)", marginBottom: "1rem" }}>{state.error}</div>
                <button
                    onClick={startSession}
                    style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "var(--primary)",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Try Again
                </button>
                <button
                    onClick={handleCancel}
                    style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "transparent",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                        cursor: "pointer",
                        marginTop: "0.5rem",
                    }}
                >
                    Cancel
                </button>
            </div>
        );
    }

    // Render cloze exercise phase
    if (state.phase === "cloze" && state.currentItem) {
        return (
            <div style={{ padding: "1rem" }}>
                <StudyStats session={sessionManager.getSessionStats()} />
                <ClozeExercise
                    item={state.currentItem}
                    exercises={state.clozeExercises}
                    onComplete={(isCorrect, responseTime) =>
                        handleClozeComplete(state.currentItem!.id, isCorrect, responseTime)
                    }
                    onSkip={() => {
                        const nextItem = sessionManager.getNextItem();
                        if (nextItem) {
                            setState((prev) => ({ ...prev, currentItem: nextItem }));
                        } else {
                            setState((prev) => ({ ...prev, phase: "story" }));
                        }
                    }}
                />
            </div>
        );
    }

    // Render story phase
    if (state.phase === "story") {
        return (
            <div style={{ padding: "1rem" }}>
                <StudyStats session={sessionManager.getSessionStats()} />
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <h2>Study Session Complete!</h2>
                    <p>You've completed all the exercises for this session.</p>
                    <div style={{ marginTop: "2rem" }}>
                        <button
                            onClick={() => {
                                const session = sessionManager.getSessionStats();
                                if (session) {
                                    onSessionComplete(session);
                                }
                            }}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "1rem",
                                marginRight: "1rem",
                            }}
                        >
                            Complete Session
                        </button>
                        <button
                            onClick={onSessionCancel}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "var(--secondary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "1rem",
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render grading phase
    if (state.phase === "grading" && state.story) {
        return (
            <div style={{ padding: "1rem" }}>
                <StudyStats session={sessionManager.getSessionStats()} />
                <StoryView story={state.story} />
                <div style={{ marginTop: "2rem", textAlign: "center" }}>
                    <h3>How well did you understand the story?</h3>
                    <GradingButtons onGrade={handleStoryGrading} />
                </div>
            </div>
        );
    }

    // Render completion phase
    if (state.phase === "complete" && state.session) {
        return (
            <div style={{ padding: "1rem" }}>
                <div style={{ textAlign: "center" }}>
                    <h2>Session Complete!</h2>
                    <StudyStats session={state.session} />
                    <div style={{ marginTop: "2rem" }}>
                        <button
                            onClick={() => onSessionComplete(state.session!)}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "1rem",
                                marginRight: "1rem",
                            }}
                        >
                            Continue
                        </button>
                        <button
                            onClick={handleCancel}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "transparent",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "1rem",
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
