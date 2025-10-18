/**
 * PhraseControl Component
 *
 * Displays source file information and action menu (Edit/Remove)
 * for phrase management in Dictionary mode.
 */

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis, faFile } from "@fortawesome/free-solid-svg-icons";
import { faPenToSquare, faTrashCan } from "@fortawesome/free-regular-svg-icons";

export interface PhraseControlProps {
    phraseId: string;
    sourceFile?: string;
    onEdit?: (phraseId: string) => void;
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
                <span style={{ margin: "0 6px", color: "var(--border)" }}>|</span>
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
                                background: "var(--bg)",
                                border: "1px solid var(--border)",
                                borderRadius: 6,
                                boxShadow: "none",
                                zIndex: 10,
                                minWidth: 140,
                                overflow: "hidden",
                            }}
                            onMouseLeave={() => setMenuOpen(false)}
                        >
                            {onEdit && (
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onEdit(phraseId);
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        width: "100%",
                                        background: "transparent",
                                        border: "none",
                                        boxShadow: "none",
                                        padding: "8px 10px",
                                        color: "var(--text)",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        transition: "background 0.15s ease",
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = "var(--bg-hover)")
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
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        width: "100%",
                                        background: "transparent",
                                        border: "none",
                                        boxShadow: "none",
                                        padding: "8px 10px",
                                        color: "var(--danger)",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        transition: "background 0.15s ease",
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = "var(--bg-hover)")
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
