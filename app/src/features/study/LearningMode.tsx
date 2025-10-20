/**
 * Learning Mode Component
 *
 * Card-based learning interface that shows user statistics and study sessions.
 * Replaces the old phrase-based system with a more focused card approach.
 */

import React, { useState, useEffect, useCallback } from "react";
// import { useSettings } from "../../lib/settings/SettingsContext";
import { CardStudySession } from "./CardStudySession";
import { getCardStats } from "../../lib/cards/cardStore";
import { generateCardsForAllPhrases, fixExistingClozeCards } from "../../lib/cards/cardGenerator";
import { statusStore } from "../../lib/status/StatusStore";

export interface LearningModeProps {
    currentText?: string;
    sourceFile?: string;
}

export interface UserStats {
    total_cards: number;
    due_cards: number;
    mastered_cards: number;
    average_grade: number;
    retention_rate: number;
}

export const LearningMode: React.FC<LearningModeProps> = () => {
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showStudySession, setShowStudySession] = useState(false);
    const [generatingCards, setGeneratingCards] = useState(false);
    const [fixingCards, setFixingCards] = useState(false);

    // Load user statistics
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const stats = await getCardStats();
            setUserStats(stats);
        } catch (error) {
            console.error("Failed to load learning data:", error);

            // Set default stats if loading fails
            setUserStats({
                total_cards: 0,
                due_cards: 0,
                mastered_cards: 0,
                average_grade: 0,
                retention_rate: 0,
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStartStudy = () => {
        setShowStudySession(true);
    };

    const handleGenerateCards = async () => {
        setGeneratingCards(true);

        // Add status task for card generation
        const taskId = statusStore.addTask({
            type: "card_generation",
            status: "processing",
            phrase: "Generating learning cards for all phrases",
            phraseId: "all-phrases",
        });

        try {
            await generateCardsForAllPhrases(taskId);

            // Mark task as completed
            statusStore.completeTask(taskId, "completed");

            // Reload stats to show updated card counts
            await loadData();
        } catch (error) {
            console.error("Failed to generate cards:", error);

            // Mark task as failed
            statusStore.completeTask(
                taskId,
                "failed",
                error instanceof Error ? error.message : "Unknown error",
            );
        } finally {
            setGeneratingCards(false);
        }
    };

    const handleFixClozeCards = async () => {
        setFixingCards(true);

        // Add status task for card fixing
        const taskId = statusStore.addTask({
            type: "card_generation", // Use existing type since card_fix doesn't exist
            status: "processing",
            phrase: "Fixing cloze card placeholders",
            phraseId: "all-cloze-cards",
        });

        try {
            await fixExistingClozeCards();

            // Mark task as completed
            statusStore.completeTask(taskId, "completed");

            console.log("Cloze cards fixed successfully!");
        } catch (error) {
            console.error("Failed to fix cloze cards:", error);

            // Mark task as failed
            statusStore.completeTask(
                taskId,
                "failed",
                error instanceof Error ? error.message : "Unknown error",
            );
        } finally {
            setFixingCards(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <div>Loading learning data...</div>
            </div>
        );
    }

    if (showStudySession) {
        return (
            <div>
                <div
                    style={{
                        padding: "1rem",
                        borderBottom: "1px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Study Session</h3>
                    <button
                        onClick={() => setShowStudySession(false)}
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
                        Back to Overview
                    </button>
                </div>
                <CardStudySession config={{ maxCards: 20, showProgress: true }} />
            </div>
        );
    }

    return (
        <div style={{ padding: "2rem" }}>
            {/* User Statistics */}
            {userStats && (
                <div
                    style={{
                        backgroundColor: "var(--background-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "1.5rem",
                        marginBottom: "2rem",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                            gap: "1rem",
                        }}
                    >
                        <div style={{ textAlign: "center" }}>
                            <div
                                style={{
                                    fontSize: "2rem",
                                    fontWeight: "bold",
                                    color: "var(--primary)",
                                }}
                            >
                                {userStats.total_cards}
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                Total Cards
                            </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div
                                style={{
                                    fontSize: "2rem",
                                    fontWeight: "bold",
                                    color: "var(--warning-color)",
                                }}
                            >
                                {userStats.due_cards}
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                Due for Review
                            </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div
                                style={{
                                    fontSize: "2rem",
                                    fontWeight: "bold",
                                    color: "var(--success-color)",
                                }}
                            >
                                {userStats.mastered_cards}
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                Mastered
                            </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div
                                style={{
                                    fontSize: "2rem",
                                    fontWeight: "bold",
                                    color: "var(--info-color)",
                                }}
                            >
                                {isNaN(userStats.retention_rate)
                                    ? "0%"
                                    : `${Math.round(userStats.retention_rate * 100)}%`}
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                Retention Rate
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Study Actions */}
            <div
                style={{
                    backgroundColor: "var(--background-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    textAlign: "center",
                }}
            >
                <h3 style={{ margin: "0 0 1rem 0", color: "var(--text-primary)" }}>
                    Start Learning
                </h3>
                <p style={{ color: "var(--text-secondary)", margin: "0 0 1.5rem 0" }}>
                    Practice with your saved phrases using spaced repetition. Mix of simple phrase
                    cards and cloze exercises.
                </p>

                {userStats && userStats.total_cards === 0 ? (
                    <div style={{ color: "var(--text-secondary)" }}>
                        <div style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
                            📚 No learning cards yet
                        </div>
                        <div style={{ marginBottom: "1.5rem" }}>
                            Generate cards from your saved phrases to start learning with spaced
                            repetition.
                        </div>
                        <button
                            onClick={handleGenerateCards}
                            disabled={generatingCards}
                            style={{
                                padding: "1rem 2rem",
                                fontSize: "1.1rem",
                                backgroundColor: generatingCards
                                    ? "var(--text-secondary)"
                                    : "var(--primary)",
                                color: "white",
                                border: "1px solid var(--primary)",
                                borderRadius: "6px",
                                cursor: generatingCards ? "not-allowed" : "pointer",
                                fontWeight: "bold",
                                opacity: generatingCards ? 0.6 : 1,
                            }}
                        >
                            {generatingCards ? "Generating..." : "Generate Learning Cards"}
                        </button>

                        <button
                            onClick={handleFixClozeCards}
                            disabled={fixingCards}
                            style={{
                                padding: "0.75rem 1.5rem",
                                fontSize: "1rem",
                                backgroundColor: fixingCards
                                    ? "var(--text-secondary)"
                                    : "var(--muted)",
                                color: "white",
                                border: "1px solid var(--muted)",
                                borderRadius: "6px",
                                cursor: fixingCards ? "not-allowed" : "pointer",
                                fontWeight: "bold",
                                opacity: fixingCards ? 0.6 : 1,
                                marginTop: "0.5rem",
                            }}
                        >
                            {fixingCards ? "Fixing..." : "Fix Cloze Cards"}
                        </button>
                    </div>
                ) : userStats && userStats.due_cards > 0 ? (
                    <button
                        onClick={handleStartStudy}
                        style={{
                            padding: "1rem 2rem",
                            fontSize: "1.1rem",
                            backgroundColor: "var(--primary)",
                            color: "white",
                            border: "1px solid var(--primary)",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "bold",
                        }}
                    >
                        Start Study Session ({userStats.due_cards} cards due)
                    </button>
                ) : (
                    <div style={{ color: "var(--text-secondary)" }}>
                        <div style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                            🎉 No cards due for review!
                        </div>
                        <div>Great job! Come back later for more practice.</div>
                    </div>
                )}
            </div>

            {/* Learning Tips */}
            <div
                style={{
                    backgroundColor: "var(--info-bg)",
                    border: "1px solid var(--info-color)",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginTop: "2rem",
                }}
            >
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--info-color)" }}>
                    💡 Learning Tips
                </h4>
                <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "var(--text-primary)" }}>
                    <li>Study regularly for best results</li>
                    <li>Be honest with your self-assessment (grades 1-4)</li>
                    <li>Focus on understanding, not just memorization</li>
                    <li>Use the context from your reading to help remember</li>
                </ul>
            </div>
        </div>
    );
};
