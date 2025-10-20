/**
 * Story View Component
 *
 * Displays the generated story with highlighted phrases and glosses.
 * Provides audio playback if TTS is available.
 */

import React, { useState, useEffect } from "react";
import { StoryResult } from "../../lib/srs/studySession";

export interface StoryViewProps {
    story: StoryResult;
    onPhraseClick?: (phrase: string) => void;
    showGlosses?: boolean;
    enableTTS?: boolean;
}

export interface StoryViewState {
    isPlaying: boolean;
    currentPhrase: string | null;
    showAllGlosses: boolean;
}

export function StoryView({
    story,
    onPhraseClick,
    showGlosses = true,
    enableTTS = false,
}: StoryViewProps) {
    const [state, setState] = useState<StoryViewState>({
        isPlaying: false,
        currentPhrase: null,
        showAllGlosses: false,
    });

    /**
     * Handle phrase click
     */
    const handlePhraseClick = (phrase: string) => {
        setState((prev) => ({
            ...prev,
            currentPhrase: prev.currentPhrase === phrase ? null : phrase,
        }));

        if (onPhraseClick) {
            onPhraseClick(phrase);
        }
    };

    /**
     * Toggle audio playback
     */
    const toggleAudio = () => {
        setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
        // TODO: Implement TTS playback
    };

    /**
     * Toggle all glosses visibility
     */
    const toggleAllGlosses = () => {
        setState((prev) => ({ ...prev, showAllGlosses: !prev.showAllGlosses }));
    };

    /**
     * Render story with highlighted phrases
     */
    const renderStory = () => {
        let storyText = story.story;
        let lastIndex = 0;
        const elements: React.ReactNode[] = [];

        // Sort phrases by position to render in order
        const sortedPhrases = [...story.usedPhrases].sort((a, b) => a.position - b.position);

        sortedPhrases.forEach((phraseData, index) => {
            const { phrase, position, gloss } = phraseData;

            // Add text before the phrase
            if (position > lastIndex) {
                elements.push(
                    <span key={`text-${index}`}>{storyText.substring(lastIndex, position)}</span>,
                );
            }

            // Add the highlighted phrase
            elements.push(
                <span
                    key={`phrase-${index}`}
                    onClick={() => handlePhraseClick(phrase)}
                    style={{
                        backgroundColor:
                            state.currentPhrase === phrase
                                ? "var(--highlight)"
                                : "var(--phrase-bg)",
                        color: "var(--phrase-text)",
                        padding: "0.125rem 0.25rem",
                        borderRadius: "3px",
                        cursor: "pointer",
                        border: "1px solid var(--phrase-border)",
                        transition: "all 0.2s ease",
                        position: "relative",
                    }}
                    title={showGlosses ? gloss : undefined}
                >
                    {phrase}
                    {showGlosses && (state.showAllGlosses || state.currentPhrase === phrase) && (
                        <span
                            style={{
                                position: "absolute",
                                top: "-1.5rem",
                                left: "0",
                                backgroundColor: "var(--gloss-bg)",
                                color: "var(--gloss-text)",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                                whiteSpace: "nowrap",
                                zIndex: 10,
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                        >
                            {gloss}
                        </span>
                    )}
                </span>,
            );

            lastIndex = position + phrase.length;
        });

        // Add remaining text
        if (lastIndex < storyText.length) {
            elements.push(<span key="text-end">{storyText.substring(lastIndex)}</span>);
        }

        return elements;
    };

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem" }}>
            {/* Story header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                    paddingBottom: "0.5rem",
                    borderBottom: "1px solid var(--border-color)",
                }}
            >
                <h2 style={{ margin: 0, color: "var(--text-primary)" }}>Generated Story</h2>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {enableTTS && (
                        <button
                            onClick={toggleAudio}
                            style={{
                                padding: "0.5rem",
                                backgroundColor: state.isPlaying
                                    ? "var(--error)"
                                    : "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                            }}
                        >
                            {state.isPlaying ? "⏸️" : "▶️"}
                            {state.isPlaying ? "Pause" : "Play"}
                        </button>
                    )}
                    <button
                        onClick={toggleAllGlosses}
                        style={{
                            padding: "0.5rem",
                            backgroundColor: state.showAllGlosses
                                ? "var(--primary)"
                                : "transparent",
                            color: state.showAllGlosses ? "white" : "var(--text-secondary)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        {state.showAllGlosses ? "Hide" : "Show"} All Glosses
                    </button>
                </div>
            </div>

            {/* Story metadata */}
            <div
                style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1rem",
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                }}
            >
                <span>Words: {story.metadata.wordCount}</span>
                <span>Difficulty: {story.metadata.difficulty}</span>
                <span>Topics: {story.metadata.topics.join(", ")}</span>
            </div>

            {/* Story content */}
            <div
                style={{
                    backgroundColor: "var(--bg-secondary)",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    lineHeight: "1.6",
                    fontSize: "1.1rem",
                    color: "var(--text-primary)",
                    marginBottom: "1rem",
                }}
            >
                {renderStory()}
            </div>

            {/* Phrase list */}
            <div style={{ marginTop: "1rem" }}>
                <h3 style={{ marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                    Phrases in this story:
                </h3>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "0.5rem",
                    }}
                >
                    {story.usedPhrases.map((phraseData, index) => (
                        <div
                            key={index}
                            onClick={() => handlePhraseClick(phraseData.phrase)}
                            style={{
                                padding: "0.5rem",
                                backgroundColor:
                                    state.currentPhrase === phraseData.phrase
                                        ? "var(--highlight)"
                                        : "var(--bg-tertiary)",
                                borderRadius: "4px",
                                cursor: "pointer",
                                border: "1px solid var(--border-color)",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
                                {phraseData.phrase}
                            </div>
                            <div
                                style={{
                                    fontSize: "0.9rem",
                                    color: "var(--text-secondary)",
                                    fontStyle: "italic",
                                }}
                            >
                                {phraseData.gloss}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Instructions */}
            <div
                style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    backgroundColor: "var(--info-bg)",
                    borderRadius: "4px",
                    border: "1px solid var(--info)",
                    fontSize: "0.9rem",
                    color: "var(--info-text)",
                }}
            >
                <strong>💡 Tip:</strong> Click on highlighted phrases to see their meanings. This
                story was generated to help you learn the phrases you've saved.
            </div>
        </div>
    );
}
