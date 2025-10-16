/**
 * Study Session Component
 *
 * Main orchestrator for study sessions. Manages the flow between
 * cloze exercises, story generation, and grading.
 */

import React, { useState, useEffect, useCallback } from "react";
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
            setState((prev) => ({ ...prev, session, phase: "cloze" }));

            // Generate cloze exercises if enabled
            if (config.includeCloze) {
                const clozeExercises = await sessionManager.generateCloze();
                setState((prev) => ({ ...prev, clozeExercises }));
            }

            // Move to first item
            const firstItem = sessionManager.getNextItem();
            if (firstItem) {
                setState((prev) => ({ ...prev, currentItem: firstItem, phase: "cloze" }));
            } else {
                setState((prev) => ({ ...prev, phase: "story" }));
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
     * Generate story for the session
     */
    const generateStory = useCallback(async () => {
        try {
            setState((prev) => ({ ...prev, phase: "loading" }));

            const story = await sessionManager.generateStory();
            if (story) {
                setState((prev) => ({ ...prev, story, phase: "grading" }));
            } else {
                setState((prev) => ({ ...prev, phase: "complete" }));
            }
        } catch (error) {
            console.error("Failed to generate story:", error);
            setState((prev) => ({ ...prev, error: "Failed to generate story" }));
        }
    }, [sessionManager]);

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
                        await sessionManager.submitGrade(item.id, grade);
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
                        border: "4px solid var(--border)",
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
                        border: "1px solid var(--border)",
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
                    <h2>Great job! Now let's review the story.</h2>
                    <button
                        onClick={generateStory}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: "var(--primary)",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "1rem",
                        }}
                    >
                        Generate Story
                    </button>
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
                                border: "1px solid var(--border)",
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
