/**
 * Learning Mode Component
 *
 * Main entry point for the Learning mode. Displays user statistics,
 * due phrases, and available stories for study sessions.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useSettings } from "../../lib/settings/SettingsContext";
import { StudySessionComponent } from "./StudySession";
// import { StudyStats } from "./StudyStats";
import { getStoryForContent, getStoryStatus, retryFailedStory } from "../../lib/phrases/storyQueue";
import { loadPhrasesByContentHash, generateContentHash } from "../../lib/db/phraseStore";
import { StudySessionManager } from "../../lib/srs/studySession";

export interface LearningModeProps {
    currentText?: string;
    sourceFile?: string;
}

export interface UserStats {
    totalPhrases: number;
    duePhrases: number;
    masteredPhrases: number;
    averageGrade: number;
    retentionRate: number;
}

export interface ContentStory {
    contentHash: string;
    sourceFile: string;
    phraseCount: number;
    storyStatus: "ready" | "generating" | "failed" | "not_found";
    phraseStories?: Array<{
        phraseId: string;
        phrase: string;
        translation: string;
        story: string;
        context: string;
    }>;
}

export const LearningMode: React.FC<LearningModeProps> = ({ currentText, sourceFile }) => {
    const { settings } = useSettings();
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [contentStories, setContentStories] = useState<ContentStory[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStory, setSelectedStory] = useState<ContentStory | null>(null);
    const [showStudySession, setShowStudySession] = useState(false);

    // Load user statistics and available stories
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load user statistics
            const sessionManager = new StudySessionManager();
            const stats = await sessionManager.getUserStats();
            setUserStats({
                totalPhrases: stats.totalPhrases,
                duePhrases: stats.dueCount,
                masteredPhrases: stats.masteredPhrases,
                averageGrade: stats.averageGrade,
                retentionRate: stats.retentionRate,
            });

            // Load stories for current content if available
            if (currentText) {
                const contentHash = generateContentHash(currentText);
                const phrases = await loadPhrasesByContentHash(contentHash);

                if (phrases.length > 0) {
                    const storyStatus = await getStoryStatus(contentHash);
                    const phraseStories =
                        storyStatus === "ready" ? await getStoryForContent(contentHash) : undefined;

                    setContentStories([
                        {
                            contentHash,
                            sourceFile: sourceFile || "Current File",
                            phraseCount: phrases.length,
                            storyStatus,
                            phraseStories: phraseStories || undefined,
                        },
                    ]);
                }
            }

            // TODO: Load stories for other content files
            // This would involve scanning all user's content hashes and checking for stories
        } catch (error) {
            console.error("Failed to load learning data:", error);
        } finally {
            setLoading(false);
        }
    }, [currentText, sourceFile]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Start study session with selected story
    const handleStartStudy = useCallback((story: ContentStory) => {
        setSelectedStory(story);
        setShowStudySession(true);
    }, []);

    // Generate story on-demand
    const handleGenerateStory = useCallback(
        async (contentHash: string) => {
            try {
                console.log("Generating story for content:", contentHash);
                await retryFailedStory(contentHash);
                // Refresh data to show updated status
                await loadData();
            } catch (error) {
                console.error("Failed to generate story:", error);
            }
        },
        [loadData],
    );

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "400px",
                    color: "var(--text-secondary)",
                }}
            >
                <div style={{ textAlign: "center" }}>
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            border: "4px solid var(--border)",
                            borderTop: "4px solid var(--primary)",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            margin: "0 auto 1rem",
                        }}
                    ></div>
                    <p>Loading learning data...</p>
                </div>
            </div>
        );
    }

    if (showStudySession && selectedStory) {
        return (
            <StudySessionComponent
                config={{
                    maxItems: 10,
                    sessionType: "mixed",
                    includeStory: true,
                    includeCloze: true,
                    includeTTS: false, // TTS not implemented yet
                    l1: settings.l1,
                    l2: settings.l2,
                    proficiency:
                        (settings.userLevel as "beginner" | "intermediate" | "advanced") ||
                        "intermediate",
                }}
                onSessionComplete={(session) => {
                    console.log("Study session completed:", session);
                    setShowStudySession(false);
                    setSelectedStory(null);
                    loadData(); // Refresh data
                }}
                onSessionCancel={() => {
                    setShowStudySession(false);
                    setSelectedStory(null);
                }}
            />
        );
    }

    return (
        <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
            <h1 style={{ marginBottom: "2rem", color: "var(--text-primary)" }}>Learning Mode</h1>

            {/* User Statistics */}
            {userStats && (
                <div style={{ marginBottom: "2rem" }}>
                    <h2 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>
                        Your Progress
                    </h2>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "1rem",
                            marginBottom: "2rem",
                        }}
                    >
                        <div
                            style={{
                                padding: "1rem",
                                backgroundColor: "var(--panel)",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                            }}
                        >
                            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>
                                Total Phrases
                            </h3>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: "1.5rem",
                                    fontWeight: "bold",
                                    color: "var(--primary)",
                                }}
                            >
                                {userStats.totalPhrases}
                            </p>
                        </div>
                        <div
                            style={{
                                padding: "1rem",
                                backgroundColor: "var(--panel)",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                            }}
                        >
                            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>
                                Due for Review
                            </h3>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: "1.5rem",
                                    fontWeight: "bold",
                                    color: "var(--warning)",
                                }}
                            >
                                {userStats.duePhrases}
                            </p>
                        </div>
                        <div
                            style={{
                                padding: "1rem",
                                backgroundColor: "var(--panel)",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                            }}
                        >
                            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>
                                Mastered
                            </h3>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: "1.5rem",
                                    fontWeight: "bold",
                                    color: "var(--success)",
                                }}
                            >
                                {userStats.masteredPhrases}
                            </p>
                        </div>
                        <div
                            style={{
                                padding: "1rem",
                                backgroundColor: "var(--panel)",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                            }}
                        >
                            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>
                                Retention Rate
                            </h3>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: "1.5rem",
                                    fontWeight: "bold",
                                    color: "var(--primary)",
                                }}
                            >
                                {Math.round(userStats.retentionRate)}%
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Available Stories */}
            <div>
                <h2 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>
                    Available Study Content
                </h2>

                {contentStories.length === 0 ? (
                    <div
                        style={{
                            padding: "2rem",
                            textAlign: "center",
                            color: "var(--text-secondary)",
                            backgroundColor: "var(--panel)",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                        }}
                    >
                        <p>No study content available yet.</p>
                        <p>Save some phrases from your reading to generate stories for study!</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {contentStories.map((story) => (
                            <div
                                key={story.contentHash}
                                style={{
                                    padding: "1rem",
                                    backgroundColor: "var(--panel)",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <h3
                                            style={{
                                                margin: "0 0 0.5rem 0",
                                                color: "var(--text-primary)",
                                            }}
                                        >
                                            {story.sourceFile}
                                        </h3>
                                        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                                            {story.phraseCount} phrases
                                        </p>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "1rem",
                                        }}
                                    >
                                        {story.storyStatus === "ready" && (
                                            <button
                                                onClick={() => handleStartStudy(story)}
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    backgroundColor: "var(--primary)",
                                                    color: "var(--primary-contrast)",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Start Study
                                            </button>
                                        )}
                                        {story.storyStatus === "generating" && (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "16px",
                                                        height: "16px",
                                                        border: "2px solid var(--border)",
                                                        borderTop: "2px solid var(--primary)",
                                                        borderRadius: "50%",
                                                        animation: "spin 1s linear infinite",
                                                    }}
                                                ></div>
                                                <span style={{ color: "var(--text-secondary)" }}>
                                                    Generating story...
                                                </span>
                                            </div>
                                        )}
                                        {story.storyStatus === "failed" && (
                                            <button
                                                onClick={() =>
                                                    handleGenerateStory(story.contentHash)
                                                }
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    backgroundColor: "var(--warning)",
                                                    color: "var(--warning-contrast)",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Retry Generation
                                            </button>
                                        )}
                                        {story.storyStatus === "not_found" && (
                                            <button
                                                onClick={() =>
                                                    handleGenerateStory(story.contentHash)
                                                }
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    backgroundColor: "var(--secondary)",
                                                    color: "var(--secondary-contrast)",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Generate Story
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {story.phraseStories && story.phraseStories.length > 0 && (
                                    <div style={{ marginTop: "1rem" }}>
                                        <h4
                                            style={{
                                                margin: "0 0 0.5rem 0",
                                                color: "var(--text-primary)",
                                            }}
                                        >
                                            Individual Phrase Stories ({story.phraseStories.length})
                                        </h4>
                                        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                            {story.phraseStories.map((phraseStory) => (
                                                <div
                                                    key={phraseStory.phraseId}
                                                    style={{
                                                        marginBottom: "1rem",
                                                        padding: "0.5rem",
                                                        border: "1px solid var(--border-color)",
                                                        borderRadius: "4px",
                                                        backgroundColor:
                                                            "var(--background-secondary)",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontWeight: "bold",
                                                            marginBottom: "0.25rem",
                                                        }}
                                                    >
                                                        "{phraseStory.phrase}" →{" "}
                                                        {phraseStory.translation}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "0.9em",
                                                            color: "var(--text-secondary)",
                                                            maxHeight: "60px",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                    >
                                                        {phraseStory.story.substring(0, 150)}...
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
