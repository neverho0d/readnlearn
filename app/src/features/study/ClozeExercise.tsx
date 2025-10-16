/**
 * Cloze Exercise Component
 *
 * Displays fill-in-the-blank exercises for phrase learning.
 * Tracks response time and accuracy for SRS updates.
 */

import React, { useState, useEffect, useRef } from "react";
import { StudyItem, ClozeResult } from "../../lib/srs/studySession";

export interface ClozeExerciseProps {
    item: StudyItem;
    exercises: ClozeResult[];
    onComplete: (isCorrect: boolean, responseTime: number) => void;
    onSkip: () => void;
}

export interface ClozeExerciseState {
    currentExercise: number;
    userAnswers: string[];
    startTime: number;
    isComplete: boolean;
    showResults: boolean;
}

export function ClozeExercise({ item, exercises, onComplete, onSkip }: ClozeExerciseProps) {
    const [state, setState] = useState<ClozeExerciseState>({
        currentExercise: 0,
        userAnswers: [],
        startTime: Date.now(),
        isComplete: false,
        showResults: false,
    });

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    /**
     * Handle input change
     */
    const handleInputChange = (index: number, value: string) => {
        setState((prev) => {
            const newAnswers = [...prev.userAnswers];
            newAnswers[index] = value;
            return { ...prev, userAnswers: newAnswers };
        });
    };

    /**
     * Handle submit
     */
    const handleSubmit = () => {
        const currentExercise = exercises[state.currentExercise];
        if (!currentExercise) return;

        const isCorrect = currentExercise.blanks.every((blank, index) => {
            const userAnswer = state.userAnswers[index]?.toLowerCase().trim();
            const correctAnswer = blank.answer.toLowerCase().trim();
            return (
                userAnswer === correctAnswer ||
                blank.alternatives.some((alt) => alt.toLowerCase().trim() === userAnswer)
            );
        });

        setState((prev) => ({ ...prev, isComplete: true, showResults: true }));

        // Calculate response time
        const responseTime = (Date.now() - state.startTime) / 1000;

        // Call onComplete after a short delay to show results
        setTimeout(() => {
            onComplete(isCorrect, responseTime);
        }, 2000);
    };

    /**
     * Handle skip
     */
    const handleSkip = () => {
        onSkip();
    };

    /**
     * Handle next exercise
     */
    const handleNext = () => {
        if (state.currentExercise < exercises.length - 1) {
            setState((prev) => ({
                ...prev,
                currentExercise: prev.currentExercise + 1,
                userAnswers: [],
                startTime: Date.now(),
                isComplete: false,
                showResults: false,
            }));
        } else {
            // All exercises complete
            onComplete(true, (Date.now() - state.startTime) / 1000);
        }
    };

    /**
     * Focus first input on mount
     */
    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [state.currentExercise]);

    const currentExercise = exercises[state.currentExercise];
    if (!currentExercise) {
        return (
            <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>No exercises available for this item.</p>
                <button
                    onClick={handleSkip}
                    style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "var(--primary)",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Continue
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "1rem" }}>
            {/* Progress indicator */}
            <div style={{ marginBottom: "1rem" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                    }}
                >
                    <span>
                        Exercise {state.currentExercise + 1} of {exercises.length}
                    </span>
                    <span>Phrase: "{item.phrase.text}"</span>
                </div>
                <div
                    style={{
                        width: "100%",
                        height: "4px",
                        backgroundColor: "var(--border)",
                        borderRadius: "2px",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: `${((state.currentExercise + 1) / exercises.length) * 100}%`,
                            height: "100%",
                            backgroundColor: "var(--primary)",
                            transition: "width 0.3s ease",
                        }}
                    />
                </div>
            </div>

            {/* Exercise content */}
            <div
                style={{
                    backgroundColor: "var(--bg-secondary)",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    marginBottom: "1rem",
                }}
            >
                <h3 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>
                    Fill in the blanks
                </h3>

                <div style={{ marginBottom: "1rem" }}>
                    {renderExerciseText(
                        currentExercise,
                        state.userAnswers,
                        handleInputChange,
                        inputRefs,
                    )}
                </div>

                {state.showResults && (
                    <div style={{ marginTop: "1rem" }}>
                        {renderResults(currentExercise, state.userAnswers)}
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                {!state.isComplete ? (
                    <>
                        <button
                            onClick={handleSubmit}
                            disabled={state.userAnswers.some((answer) => !answer.trim())}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                opacity: state.userAnswers.some((answer) => !answer.trim())
                                    ? 0.5
                                    : 1,
                            }}
                        >
                            Submit
                        </button>
                        <button
                            onClick={handleSkip}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "transparent",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--border)",
                                borderRadius: "4px",
                                cursor: "pointer",
                            }}
                        >
                            Skip
                        </button>
                    </>
                ) : (
                    <button
                        onClick={handleNext}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: "var(--primary)",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        {state.currentExercise < exercises.length - 1
                            ? "Next Exercise"
                            : "Complete"}
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Render exercise text with blanks
 */
function renderExerciseText(
    exercise: ClozeResult,
    userAnswers: string[],
    onInputChange: (index: number, value: string) => void,
    inputRefs: React.RefObject<(HTMLInputElement | null)[]>,
): React.ReactNode {
    const parts = exercise.text.split(/(\s+)/);
    let blankIndex = 0;

    return parts.map((part, index) => {
        if (part.trim() === "") {
            return <span key={index}>{part}</span>;
        }

        // Check if this word should be a blank
        const shouldBeBlank = exercise.blanks.some(
            (blank) =>
                exercise.text.indexOf(blank.answer, blank.position) ===
                exercise.text.indexOf(part.trim()),
        );

        if (shouldBeBlank) {
            const currentBlankIndex = blankIndex++;
            return (
                <input
                    key={index}
                    ref={(el) => {
                        if (inputRefs.current) {
                            inputRefs.current[currentBlankIndex] = el;
                        }
                    }}
                    type="text"
                    value={userAnswers[currentBlankIndex] || ""}
                    onChange={(e) => onInputChange(currentBlankIndex, e.target.value)}
                    style={{
                        border: "2px solid var(--border)",
                        borderRadius: "4px",
                        padding: "0.25rem 0.5rem",
                        margin: "0 0.25rem",
                        minWidth: "80px",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                    }}
                    placeholder="?"
                />
            );
        }

        return <span key={index}>{part}</span>;
    });
}

/**
 * Render results after submission
 */
function renderResults(exercise: ClozeResult, userAnswers: string[]): React.ReactNode {
    const isCorrect = exercise.blanks.every((blank, index) => {
        const userAnswer = userAnswers[index]?.toLowerCase().trim();
        const correctAnswer = blank.answer.toLowerCase().trim();
        return (
            userAnswer === correctAnswer ||
            blank.alternatives.some((alt) => alt.toLowerCase().trim() === userAnswer)
        );
    });

    return (
        <div
            style={{
                padding: "1rem",
                backgroundColor: isCorrect ? "var(--success-bg)" : "var(--error-bg)",
                borderRadius: "4px",
                border: `1px solid ${isCorrect ? "var(--success)" : "var(--error)"}`,
            }}
        >
            <div
                style={{
                    color: isCorrect ? "var(--success)" : "var(--error)",
                    fontWeight: "bold",
                    marginBottom: "0.5rem",
                }}
            >
                {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
            </div>

            {!isCorrect && (
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    <p>Correct answers:</p>
                    <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
                        {exercise.blanks.map((blank, index) => (
                            <li key={index}>
                                <strong>{blank.answer}</strong>
                                {blank.alternatives.length > 0 && (
                                    <span> (or {blank.alternatives.join(", ")})</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {exercise.explanation && (
                <div
                    style={{
                        marginTop: "0.5rem",
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        fontStyle: "italic",
                    }}
                >
                    {exercise.explanation}
                </div>
            )}
        </div>
    );
}
