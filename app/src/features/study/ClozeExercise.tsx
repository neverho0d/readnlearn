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
    // eslint-disable-next-line no-unused-vars
    onComplete: (isCorrect: boolean, responseTime: number) => void;
    onSkip: () => void;
}

export interface ClozeExerciseState {
    currentExercise: number;
    userAnswers: string[];
    startTime: number;
    isComplete: boolean;
    showResults: boolean;
    inputValidation: Array<{
        isCorrect: boolean;
        userInput: string;
        expectedAnswer: string;
        alternatives: string[];
    }>;
}

export function ClozeExercise({ item, exercises, onComplete, onSkip }: ClozeExerciseProps) {
    const [state, setState] = useState<ClozeExerciseState>({
        currentExercise: 0,
        userAnswers: [],
        startTime: Date.now(),
        isComplete: false,
        showResults: false,
        inputValidation: [],
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

        // Validate each input and store validation results
        const validation = currentExercise.blanks.map((blank, index) => {
            const userAnswer = state.userAnswers[index]?.toLowerCase().trim() || "";
            const correctAnswer = blank.answer.toLowerCase().trim();
            const isCorrect =
                userAnswer === correctAnswer ||
                blank.alternatives.some((alt) => alt.toLowerCase().trim() === userAnswer);

            return {
                isCorrect,
                userInput: state.userAnswers[index] || "",
                expectedAnswer: blank.answer,
                alternatives: blank.alternatives,
            };
        });

        const isFullyCorrect = validation.every((v) => v.isCorrect);

        setState((prev) => ({
            ...prev,
            isComplete: true,
            showResults: true,
            inputValidation: validation,
        }));

        // Calculate response time
        const responseTime = (Date.now() - state.startTime) / 1000;

        // Call onComplete after a short delay to show results
        setTimeout(() => {
            onComplete(isFullyCorrect, responseTime);
        }, 3000); // Increased delay to show results
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
                inputValidation: [],
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
                        backgroundColor: "var(--border-color)",
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
                        {renderResults(currentExercise, state.userAnswers, state.inputValidation)}
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
                                border: "1px solid var(--border-color)",
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
                        border: "2px solid var(--border-color)",
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
function renderResults(
    exercise: ClozeResult,
    _userAnswers: string[],
    inputValidation: Array<{
        isCorrect: boolean;
        userInput: string;
        expectedAnswer: string;
        alternatives: string[];
    }>,
): React.ReactNode {
    const isFullyCorrect = inputValidation.every((v) => v.isCorrect);
    const correctCount = inputValidation.filter((v) => v.isCorrect).length;
    const totalCount = inputValidation.length;

    return (
        <div
            style={{
                padding: "1.5rem",
                backgroundColor: isFullyCorrect ? "var(--success-bg)" : "var(--error-bg)",
                borderRadius: "8px",
                border: `2px solid ${isFullyCorrect ? "var(--success)" : "var(--error)"}`,
                marginBottom: "1rem",
            }}
        >
            {/* Header with score */}
            <div
                style={{
                    color: isFullyCorrect ? "var(--success)" : "var(--error)",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    marginBottom: "1rem",
                    textAlign: "center",
                }}
            >
                {isFullyCorrect ? "🎉 Perfect!" : `📝 ${correctCount}/${totalCount} Correct`}
            </div>

            {/* Full phrase with highlighted answers */}
            <div style={{ marginBottom: "1rem" }}>
                <div
                    style={{
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                    }}
                >
                    Complete phrase:
                </div>
                <div
                    style={{
                        fontSize: "1.1rem",
                        lineHeight: "1.6",
                        padding: "1rem",
                        backgroundColor: "var(--bg-primary)",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                    }}
                >
                    {renderFullPhraseWithHighlights(exercise, inputValidation)}
                </div>
            </div>

            {/* Detailed feedback for each blank */}
            {!isFullyCorrect && (
                <div style={{ fontSize: "0.9rem" }}>
                    <div
                        style={{
                            color: "var(--text-secondary)",
                            marginBottom: "0.5rem",
                            fontWeight: "bold",
                        }}
                    >
                        Feedback:
                    </div>
                    {inputValidation.map((validation, index) => (
                        <div
                            key={index}
                            style={{
                                marginBottom: "0.5rem",
                                padding: "0.5rem",
                                backgroundColor: validation.isCorrect
                                    ? "var(--success-bg)"
                                    : "var(--error-bg)",
                                borderRadius: "4px",
                                border: `1px solid ${validation.isCorrect ? "var(--success)" : "var(--error)"}`,
                            }}
                        >
                            <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
                                {validation.isCorrect ? "✓" : "✗"} Blank {index + 1}
                            </div>
                            <div style={{ fontSize: "0.85rem" }}>
                                <strong>Correct:</strong> {validation.expectedAnswer}
                                {validation.alternatives.length > 0 && (
                                    <span> (or {validation.alternatives.join(", ")})</span>
                                )}
                            </div>
                            {!validation.isCorrect && validation.userInput && (
                                <div style={{ fontSize: "0.85rem", color: "var(--error)" }}>
                                    <strong>Your answer:</strong> "{validation.userInput}"
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {exercise.explanation && (
                <div
                    style={{
                        marginTop: "1rem",
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        fontStyle: "italic",
                        padding: "0.75rem",
                        backgroundColor: "var(--bg-primary)",
                        borderRadius: "4px",
                        border: "1px solid var(--border-color)",
                    }}
                >
                    💡 {exercise.explanation}
                </div>
            )}
        </div>
    );
}

/**
 * Render full phrase with highlighted correct answers and user input mismatches
 */
function renderFullPhraseWithHighlights(
    exercise: ClozeResult,
    inputValidation: Array<{
        isCorrect: boolean;
        userInput: string;
        expectedAnswer: string;
        alternatives: string[];
    }>,
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
            const validation = inputValidation[currentBlankIndex];

            if (validation.isCorrect) {
                // Show correct answer in green
                return (
                    <span
                        key={index}
                        style={{
                            backgroundColor: "var(--success-bg)",
                            color: "var(--success)",
                            padding: "0.1rem 0.3rem",
                            borderRadius: "3px",
                            fontWeight: "bold",
                            border: "1px solid var(--success)",
                        }}
                    >
                        {validation.expectedAnswer}
                    </span>
                );
            } else {
                // Show correct answer with user's incorrect input in parentheses
                return (
                    <span key={index}>
                        <span
                            style={{
                                backgroundColor: "var(--error-bg)",
                                color: "var(--error)",
                                padding: "0.1rem 0.3rem",
                                borderRadius: "3px",
                                fontWeight: "bold",
                                border: "1px solid var(--error)",
                            }}
                        >
                            {validation.expectedAnswer}
                        </span>
                        {validation.userInput && (
                            <span
                                style={{
                                    color: "var(--text-secondary)",
                                    fontSize: "0.9em",
                                    marginLeft: "0.25rem",
                                }}
                            >
                                (you: "{validation.userInput}")
                            </span>
                        )}
                    </span>
                );
            }
        }

        return <span key={index}>{part}</span>;
    });
}
