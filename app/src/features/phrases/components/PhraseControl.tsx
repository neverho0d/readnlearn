/**
 * PhraseControl Component
 *
 * Displays source file information and action menu (Edit/Remove)
 * for phrase management in Dictionary mode.
 */

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis, faFile, faMagic } from "@fortawesome/free-solid-svg-icons";
import { faPenToSquare, faTrashCan } from "@fortawesome/free-regular-svg-icons";

export interface PhraseControlProps {
    phraseId: string;
    sourceFile?: string;
    // eslint-disable-next-line no-unused-vars
    onEdit?: (phraseId: string) => void;
    // eslint-disable-next-line no-unused-vars
    onRemove?: (phraseId: string) => void;
}

export const PhraseControl: React.FC<PhraseControlProps> = ({
    phraseId,
    sourceFile,
    onEdit,
    onRemove,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                color: "var(--text-light)",
                fontSize: "0.82em",
                marginBottom: 6,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FontAwesomeIcon icon={faFile} style={{ color: "var(--muted)", fontSize: 12 }} />
                <span style={{ color: "var(--link-blue)" }}>{sourceFile || "Unknown source"}</span>
                <span style={{ margin: "0 6px", color: "var(--border-color)" }}>|</span>
                <div style={{ position: "relative" }}>
                    <button
                        onClick={() => setMenuOpen((prev) => !prev)}
                        style={{
                            background: "transparent",
                            border: "none",
                            boxShadow: "none",
                            color: "var(--text-light)",
                            cursor: "pointer",
                            padding: 4,
                            lineHeight: 1,
                            borderRadius: 4,
                        }}
                        aria-label="More actions"
                        title="More actions"
                        className="icon-button"
                    >
                        <FontAwesomeIcon icon={faEllipsis} />
                    </button>
                    {menuOpen && (
                        <div
                            style={{
                                position: "absolute",
                                right: 0,
                                top: 22,
                                background: "var(--dropdown-bg)",
                                border: "1px solid var(--dropdown-border)",
                                borderRadius: 6,
                                boxShadow: "0 6px 18px var(--dropdown-shadow)",
                                zIndex: 10,
                                minWidth: 140,
                                overflow: "hidden",
                            }}
                            onMouseLeave={() => setMenuOpen(false)}
                        >
                            {/* Manual story generation (dictionary mode only) */}
                            <button
                                onClick={async () => {
                                    try {
                                        setMenuOpen(false);
                                        const { generateStoryForPhrase } = await import(
                                            "../../../lib/stories/storyGenerator"
                                        );
                                        const { statusStore } = await import(
                                            "../../../lib/status/StatusStore"
                                        );
                                        const taskId = statusStore.addTask({
                                            type: "story_generation",
                                            phrase: "Generating story…",
                                            phraseId: phraseId,
                                            status: "processing",
                                        });
                                        await generateStoryForPhrase(phraseId, "generate");
                                        statusStore.completeTask(taskId, "completed");
                                    } catch (e) {
                                        console.error(e);
                                        const { statusStore } = await import(
                                            "../../../lib/status/StatusStore"
                                        );
                                        statusStore.addTask({
                                            type: "story_generation",
                                            phrase: "Story generation failed",
                                            phraseId: phraseId,
                                            status: "failed",
                                        });
                                    }
                                }}
                                className="dropdown-option"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    width: "100%",
                                    background: "transparent",
                                    color: "var(--text-primary)",
                                    padding: "6px 8px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    fontSize: 12,
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = "var(--menu-hover-bg)")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "transparent")
                                }
                            >
                                <FontAwesomeIcon icon={faMagic} />
                                <span>Generate Story</span>
                            </button>

                            {onEdit && (
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onEdit(phraseId);
                                    }}
                                    className="dropdown-option"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        width: "100%",
                                        background: "transparent",
                                        color: "var(--text-primary)",
                                        padding: "6px 8px",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: 12,
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = "var(--menu-hover-bg)")
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background = "transparent")
                                    }
                                >
                                    <FontAwesomeIcon icon={faPenToSquare} />
                                    <span>Edit</span>
                                </button>
                            )}
                            {onRemove && (
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onRemove(phraseId);
                                    }}
                                    className="dropdown-option"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        width: "100%",
                                        background: "transparent",
                                        color: "var(--error-color)",
                                        padding: "6px 8px",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: 12,
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = "var(--menu-hover-bg)")
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background = "transparent")
                                    }
                                >
                                    <FontAwesomeIcon icon={faTrashCan} />
                                    <span>Remove</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
