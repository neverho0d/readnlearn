/**
 * Story Modal Component
 *
 * Modal for generating, viewing, and managing stories for phrases.
 * Used in dictionary mode via phrase dropdown menu.
 */

import React, { useState, useEffect } from "react";
import {
    generateStoryForPhrase,
    getStoryForPhrase,
    deleteStoryForPhrase,
    PhraseStory,
} from "../../lib/stories/storyGenerator";

export interface StoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    phraseId: string;
    phraseText: string;
}

export function StoryModal({ isOpen, onClose, phraseId, phraseText }: StoryModalProps) {
    const [story, setStory] = useState<PhraseStory | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [action, setAction] = useState<"generate" | "regenerate" | "append" | "delete">(
        "generate",
    );

    // Load existing story on mount
    useEffect(() => {
        if (isOpen) {
            loadExistingStory();
        }
    }, [isOpen, phraseId]);

    const loadExistingStory = async () => {
        try {
            setLoading(true);
            const existingStory = await getStoryForPhrase(phraseId);
            setStory(existingStory);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load story");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (actionType: "generate" | "regenerate" | "append") => {
        try {
            setLoading(true);
            setError(null);

            const newStory = await generateStoryForPhrase(phraseId, actionType);
            setStory(newStory);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate story");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setLoading(true);
            setError(null);

            await deleteStoryForPhrase(phraseId);
            setStory(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete story");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "var(--overlay-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    backgroundColor: "var(--background-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "2rem",
                    maxWidth: "600px",
                    maxHeight: "80vh",
                    overflow: "auto",
                    position: "relative",
                }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        background: "none",
                        border: "none",
                        fontSize: "1.5rem",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                    }}
                >
                    ×
                </button>

                {/* Header */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>
                        Story for: "{phraseText}"
                    </h3>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        Generate contextual stories to help with reading comprehension
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div
                        style={{
                            backgroundColor: "var(--error-bg)",
                            color: "var(--error-color)",
                            padding: "0.75rem",
                            borderRadius: "4px",
                            marginBottom: "1rem",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ marginBottom: "1.5rem" }}>
                    {!story ? (
                        <button
                            onClick={() => handleGenerate("generate")}
                            disabled={loading}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: loading ? "not-allowed" : "pointer",
                                marginRight: "0.5rem",
                                opacity: loading ? 0.6 : 1,
                            }}
                        >
                            {loading ? "Generating..." : "Generate Story"}
                        </button>
                    ) : (
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                                onClick={() => handleGenerate("regenerate")}
                                disabled={loading}
                                style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "var(--info-bg)",
                                    color: "var(--info-color)",
                                    border: "1px solid var(--info-color)",
                                    borderRadius: "4px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? "Regenerating..." : "Regenerate"}
                            </button>
                            <button
                                onClick={() => handleGenerate("append")}
                                disabled={loading}
                                style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "var(--success-bg)",
                                    color: "var(--success-color)",
                                    border: "1px solid var(--success-color)",
                                    borderRadius: "4px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? "Appending..." : "Append New Story"}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "var(--error-bg)",
                                    color: "var(--error-color)",
                                    border: "1px solid var(--error-color)",
                                    borderRadius: "4px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? "Deleting..." : "Delete Story"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Story content */}
                {story && (
                    <div
                        style={{
                            backgroundColor: "var(--background-secondary)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            padding: "1rem",
                            marginBottom: "1rem",
                        }}
                    >
                        <div
                            style={{
                                color: "var(--text-primary)",
                                lineHeight: "1.6",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {story.story}
                        </div>
                        <div
                            style={{
                                color: "var(--text-secondary)",
                                fontSize: "0.8rem",
                                marginTop: "0.5rem",
                                borderTop: "1px solid var(--border-color)",
                                paddingTop: "0.5rem",
                            }}
                        >
                            Generated: {new Date(story.created_at).toLocaleString()}
                            {story.updated_at !== story.created_at && (
                                <span>
                                    {" "}
                                    • Updated: {new Date(story.updated_at).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Loading indicator */}
                {loading && (
                    <div
                        style={{
                            textAlign: "center",
                            color: "var(--text-secondary)",
                            padding: "1rem",
                        }}
                    >
                        <div>Generating story...</div>
                        <div style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                            This may take a few moments
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
