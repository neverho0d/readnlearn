/**
 * Card-Based Study Session
 *
 * New study session that works with cards instead of phrases.
 * Supports both simple and cloze cards in mixed study mode.
 */

import React, { useState, useEffect, useRef } from "react";
import { getDueCards, updateCardReview } from "../../lib/cards/cardStore";
import { DueCard } from "../../lib/cards/cardStore";
import { supabase } from "../../lib/supabase/client";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

export interface CardStudyConfig {
    maxCards?: number;
    showProgress?: boolean;
}

interface ClozeInputProps {
    value: string;
    // eslint-disable-next-line no-unused-vars
    onChange: (value: string) => void;
    onEnter?: () => void;
}

const ClozeInput: React.FC<ClozeInputProps> = ({ value: inputValue, onChange, onEnter }) => {
    const spanRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (spanRef.current && spanRef.current.textContent !== inputValue) {
            spanRef.current.textContent = inputValue;
        }
    }, [inputValue]);

    // Auto-focus the contenteditable element when component mounts
    useEffect(() => {
        if (spanRef.current) {
            // Small delay to ensure the element is fully rendered
            const timer = setTimeout(() => {
                spanRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleInput = (e: React.FormEvent<HTMLSpanElement>) => {
        const text = e.currentTarget.textContent || "";
        onChange(text);
    };

    return (
        <span
            ref={spanRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    onEnter?.();
                }
            }}
            style={{
                display: "inline-block",
                minWidth: "60px",
                minHeight: "1.2em",
                padding: "2px 6px",
                margin: "0 2px",
                borderBottom: "1px solid var(--primary)",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderRadius: "0",
                backgroundColor: "var(--background-primary)",
                color: "var(--text-primary)",
                outline: "none",
                cursor: "text",
                position: "relative",
            }}
            data-placeholder="Type here..."
        />
    );
};

export interface CardStudyState {
    cards: DueCard[];
    currentCardIndex: number;
    isFlipped: boolean;
    userAnswer: string;
    showAnswer: boolean;
    completedCards: string[];
    sessionStats: {
        total: number;
        completed: number;
        correct: number;
    };
    phraseData: {
        [phraseId: string]: { text: string; translation?: string; explanation?: string };
    };
    showExplanation: boolean;
}

export function CardStudySession({ config = {} }: { config?: CardStudyConfig }) {
    const [state, setState] = useState<CardStudyState>({
        cards: [],
        currentCardIndex: 0,
        isFlipped: false,
        userAnswer: "",
        showAnswer: false,
        completedCards: [],
        sessionStats: {
            total: 0,
            completed: 0,
            correct: 0,
        },
        phraseData: {},
        showExplanation: false,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load due cards on mount
    useEffect(() => {
        loadDueCards();
    }, []);

    const loadDueCards = async () => {
        try {
            setLoading(true);
            const cards = await getDueCards(config.maxCards || 20);

            // Fetch phrase data for all cards
            const phraseIds = [...new Set(cards.map((card) => card.phrase_id))];
            const phraseData: {
                [phraseId: string]: { text: string; translation?: string; explanation?: string };
            } = {};

            if (phraseIds.length > 0) {
                const { data: phrases, error: phrasesError } = await supabase
                    .from("phrases")
                    .select("id, text, translation, explanation")
                    .in("id", phraseIds);

                if (!phrasesError && phrases) {
                    phrases.forEach((phrase) => {
                        phraseData[phrase.id] = {
                            text: phrase.text,
                            translation: phrase.translation,
                            explanation: phrase.explanation,
                        };
                    });
                } else if (phrasesError) {
                    console.error("Error fetching phrases:", phrasesError);
                }
            }

            setState((prev) => ({
                ...prev,
                cards,
                phraseData,
                currentCardIndex: 0, // Reset to first card
                isFlipped: false, // Reset flip state
                userAnswer: "", // Clear user input
                showAnswer: false, // Hide answer
                showExplanation: false, // Hide explanation
                completedCards: [], // Reset completed cards
                sessionStats: {
                    total: cards.length,
                    completed: 0, // Reset completed count
                    correct: 0, // Reset correct count
                },
            }));

            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load cards");
        } finally {
            setLoading(false);
        }
    };

    const handleFlip = () => {
        setState((prev) => ({
            ...prev,
            isFlipped: !prev.isFlipped,
        }));
    };

    const handleAnswerChange = (answer: string) => {
        setState((prev) => ({
            ...prev,
            userAnswer: answer,
        }));
    };

    const toggleExplanation = () => {
        setState((prev) => ({
            ...prev,
            showExplanation: !prev.showExplanation,
        }));
    };

    const handleGrade = async (grade: number) => {
        const currentCard = state.cards[state.currentCardIndex];
        if (!currentCard) return;

        try {
            // Update card review with grade
            await updateCardReview(currentCard.card_id, grade);

            // Update session stats
            const isCorrect = grade >= 3;
            setState((prev) => ({
                ...prev,
                completedCards: [...prev.completedCards, currentCard.card_id],
                sessionStats: {
                    ...prev.sessionStats,
                    completed: prev.sessionStats.completed + 1,
                    correct: prev.sessionStats.correct + (isCorrect ? 1 : 0),
                },
            }));

            // Move to next card
            nextCard();
        } catch (err) {
            console.error("Failed to update card review:", err);
            setError("Failed to save progress");
        }
    };

    const nextCard = () => {
        setState((prev) => {
            const nextIndex = prev.currentCardIndex + 1;
            if (nextIndex >= prev.cards.length) {
                // Session completed - advance to completion screen
                return {
                    ...prev,
                    currentCardIndex: nextIndex, // This will trigger the completion screen
                };
            }

            return {
                ...prev,
                currentCardIndex: nextIndex,
                isFlipped: false,
                userAnswer: "",
                showAnswer: false,
                showExplanation: false,
            };
        });
    };

    const skipCard = () => {
        nextCard();
    };

    const removeCard = async () => {
        const currentCard = state.cards[state.currentCardIndex];
        if (!currentCard) return;

        // Show confirmation dialog
        const confirmed = window.confirm(
            "Are you sure you want to remove this card? This action cannot be undone.",
        );

        if (!confirmed) return;

        try {
            // Delete the card from the database
            const { error } = await supabase.from("cards").delete().eq("id", currentCard.card_id);

            if (error) {
                console.error("Failed to delete card:", error);
                setError("Failed to remove card");
                return;
            }

            // Remove the card from the current session
            const updatedCards = state.cards.filter((card) => card.card_id !== currentCard.card_id);

            setState((prev) => ({
                ...prev,
                cards: updatedCards,
                sessionStats: {
                    ...prev.sessionStats,
                    total: updatedCards.length,
                },
            }));

            // If this was the last card, show completion screen
            if (updatedCards.length === 0) {
                setState((prev) => ({
                    ...prev,
                    currentCardIndex: prev.cards.length, // This will trigger completion screen
                }));
                return;
            }

            // If we removed a card before the current position, stay at the same index
            // If we removed the current card or after, move to the next card
            const newIndex =
                state.currentCardIndex >= updatedCards.length
                    ? updatedCards.length - 1
                    : state.currentCardIndex;

            setState((prev) => ({
                ...prev,
                currentCardIndex: newIndex,
                isFlipped: false,
                userAnswer: "",
                showAnswer: false,
                showExplanation: false,
            }));

            console.log("Card removed successfully");
        } catch (err) {
            console.error("Failed to remove card:", err);
            setError("Failed to remove card");
        }
    };

    if (loading) {
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <div>Loading study cards...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <div style={{ color: "var(--error-color)", marginBottom: "1rem" }}>
                    Error: {error}
                </div>
                <button
                    onClick={loadDueCards}
                    style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "var(--primary)",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (state.cards.length === 0) {
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <div style={{ marginBottom: "1rem" }}>🎉 No cards due for review!</div>
                <div style={{ color: "var(--text-secondary)" }}>
                    Great job! Come back later for more practice.
                </div>
            </div>
        );
    }

    if (state.currentCardIndex >= state.cards.length) {
        // Session completed
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <div style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>
                    🎉 Study session completed!
                </div>
                <div style={{ marginBottom: "2rem" }}>
                    <div>Cards studied: {state.sessionStats.completed}</div>
                    <div>Correct answers: {state.sessionStats.correct}</div>
                    <div>
                        Accuracy:{" "}
                        {Math.round(
                            (state.sessionStats.correct / state.sessionStats.completed) * 100,
                        )}
                        %
                    </div>
                </div>
                <button
                    onClick={loadDueCards}
                    style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "var(--primary)",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Study More Cards
                </button>
            </div>
        );
    }

    const currentCard = state.cards[state.currentCardIndex];
    const isClozeCard = currentCard.card_type === "cloze";

    // Clean up cloze text by replacing any bracketed content with [...] placeholders
    const cleanClozeText = (text: string): string => {
        return text.replace(/\[[^\]]*\]/g, "[...]");
    };

    // Parse the cloze text to find the placeholder and create editable version
    const renderClozeText = () => {
        if (!isClozeCard) {
            return currentCard.front_text;
        }

        // Clean the text first to ensure proper placeholders
        const cleanedText = cleanClozeText(currentCard.front_text);

        // Split text by [...], [...], etc. to find placeholders
        const parts = cleanedText.split(/(\[\.\.\.\])/g);

        return (
            <>
                {parts.map((part, index) => {
                    if (part === "[...]") {
                        return (
                            <ClozeInput
                                key={index}
                                value={state.userAnswer || ""}
                                onChange={handleAnswerChange}
                                onEnter={handleFlip}
                            />
                        );
                    }
                    return <span key={index}>{part}</span>;
                })}
            </>
        );
    };

    // Render the full phrase with correct answer highlighted and user input in parentheses if wrong
    const renderClozeResult = () => {
        if (!isClozeCard) {
            return currentCard.back_text;
        }

        // Get the correct answer from the back text
        const correctAnswer = currentCard.back_text;
        const userAnswer = state.userAnswer || "";
        const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

        // Clean the text first to ensure proper placeholders
        const cleanedText = cleanClozeText(currentCard.front_text);

        // Split the front text by [...], [...], etc. to find placeholders
        const parts = cleanedText.split(/(\[\.\.\.\])/g);

        return (
            <>
                {parts.map((part, index) => {
                    if (part === "[...]") {
                        return (
                            <span key={index}>
                                <span
                                    style={{
                                        backgroundColor: "var(--success-bg)",
                                        color: "var(--success-text)",
                                        padding: "2px 4px",
                                        borderRadius: "3px",
                                        fontWeight: "bold",
                                    }}
                                >
                                    {correctAnswer}
                                </span>
                                {!isCorrect && userAnswer && (
                                    <span
                                        style={{
                                            color: "var(--error-color)",
                                            fontSize: "0.9em",
                                            marginLeft: "4px",
                                        }}
                                    >
                                        (your answer: "{userAnswer}")
                                    </span>
                                )}
                            </span>
                        );
                    }
                    return <span key={index}>{part}</span>;
                })}
            </>
        );
    };

    // Get the original phrase data for the current card
    const currentPhrase = state.phraseData[currentCard.phrase_id];

    return (
        <div style={{ padding: "2rem" }}>
            {/* Progress */}
            {config.showProgress && (
                <div
                    style={{
                        marginBottom: "2rem",
                        textAlign: "center",
                        color: "var(--text-secondary)",
                    }}
                >
                    Card {state.currentCardIndex + 1} of {state.cards.length}
                </div>
            )}

            {/* Card */}
            <div
                style={{
                    backgroundColor: "var(--background-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "2rem",
                    marginBottom: "2rem",
                    minHeight: "200px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                {/* Card Front */}
                {!state.isFlipped && (
                    <div style={{ textAlign: "center" }}>
                        <div
                            style={{
                                fontSize: "1.2rem",
                                marginBottom: "1rem",
                                fontWeight: "bold",
                            }}
                        >
                            {isClozeCard ? renderClozeText() : currentCard.front_text}
                        </div>

                        {isClozeCard && currentCard.cloze_hint && (
                            <div
                                style={{
                                    color: "var(--text-secondary)",
                                    fontSize: "0.9rem",
                                    marginBottom: "1rem",
                                }}
                            >
                                Hint: {currentCard.cloze_hint}
                            </div>
                        )}

                        <button
                            onClick={handleFlip}
                            style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "transparent",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "4px",
                                cursor: "pointer",
                                marginRight: "0.5rem",
                                fontSize: "0.9rem",
                                transition: "background-color 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                            }}
                        >
                            {isClozeCard ? "Check Answer" : "Show Translation"}
                        </button>
                    </div>
                )}

                {/* Card Back */}
                {state.isFlipped && (
                    <div style={{ textAlign: "center" }}>
                        <div
                            style={{
                                fontSize: "1.2rem",
                                marginBottom: "1rem",
                                fontWeight: "bold",
                            }}
                        >
                            {isClozeCard ? renderClozeResult() : currentCard.front_text}
                        </div>

                        {/* Show translation if available */}
                        {currentPhrase && currentPhrase.translation && (
                            <div
                                style={{
                                    marginTop: "1.5rem",
                                    padding: "1rem",
                                    backgroundColor: "var(--bg-secondary)",
                                    borderRadius: "6px",
                                    border: "1px solid var(--border-color)",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "0.9rem",
                                        color: "var(--text-secondary)",
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    <strong>Translation:</strong> {currentPhrase.translation}
                                </div>

                                {/* Show explanation toggle if explanation exists */}
                                {currentPhrase.explanation && (
                                    <div style={{ marginTop: "1rem" }}>
                                        <button
                                            onClick={toggleExplanation}
                                            style={{
                                                padding: "0.5rem 1rem",
                                                backgroundColor: "transparent",
                                                color: "var(--text-primary)",
                                                border: "1px solid var(--border-color)",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "0.9rem",
                                                transition: "background-color 0.2s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                    "var(--bg-hover)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                    "transparent";
                                            }}
                                        >
                                            {state.showExplanation ? "Hide" : "Show"} Explanation
                                        </button>

                                        {state.showExplanation && (
                                            <div
                                                style={{
                                                    marginTop: "1rem",
                                                    padding: "1rem",
                                                    backgroundColor: "var(--bg-primary)",
                                                    borderRadius: "4px",
                                                    border: "1px solid var(--border-color)",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: "0.9rem",
                                                        color: "var(--text-secondary)",
                                                        marginBottom: "0.5rem",
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    💡 Explanation:
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "0.9rem",
                                                        lineHeight: "1.5",
                                                        color: "var(--text-primary)",
                                                        textAlign: "initial",
                                                    }}
                                                >
                                                    <ReactMarkdown
                                                        rehypePlugins={[rehypeRaw]}
                                                        components={{
                                                            p: ({ children }) => (
                                                                <p
                                                                    style={{
                                                                        margin: "0 0 0.5rem 0",
                                                                    }}
                                                                >
                                                                    {children}
                                                                </p>
                                                            ),
                                                            strong: ({ children }) => (
                                                                <strong
                                                                    style={{ fontWeight: "bold" }}
                                                                >
                                                                    {children}
                                                                </strong>
                                                            ),
                                                            em: ({ children }) => (
                                                                <em style={{ fontStyle: "italic" }}>
                                                                    {children}
                                                                </em>
                                                            ),
                                                        }}
                                                    >
                                                        {currentPhrase.explanation}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: "2rem" }}>
                            <div style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                                How well did you know this?
                            </div>
                            <div
                                style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}
                            >
                                <button
                                    onClick={() => handleGrade(1)}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        backgroundColor: "var(--error-bg)",
                                        color: "var(--error-color)",
                                        border: "1px solid var(--error-color)",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    Again (1)
                                </button>
                                <button
                                    onClick={() => handleGrade(2)}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        backgroundColor: "var(--warning-bg)",
                                        color: "var(--warning-color)",
                                        border: "1px solid var(--warning-color)",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    Hard (2)
                                </button>
                                <button
                                    onClick={() => handleGrade(3)}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        backgroundColor: "var(--info-bg)",
                                        color: "var(--info-color)",
                                        border: "1px solid var(--info-color)",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    Good (3)
                                </button>
                                <button
                                    onClick={() => handleGrade(4)}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        backgroundColor: "var(--success-bg)",
                                        color: "var(--success-color)",
                                        border: "1px solid var(--success-color)",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    Easy (4)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Skip button */}
            <div style={{ textAlign: "center" }}>
                <button
                    onClick={skipCard}
                    style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "transparent",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                >
                    Skip Card
                </button>
            </div>

            {/* Remove button - smaller and below with gap */}
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <button
                    onClick={removeCard}
                    style={{
                        padding: "0.3rem 0.8rem",
                        backgroundColor: "transparent",
                        color: "var(--error-color)",
                        border: "1px solid var(--error-color)",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--error-bg)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                >
                    Remove Card
                </button>
            </div>
        </div>
    );
}
