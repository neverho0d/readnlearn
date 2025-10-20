/**
 * PhraseCard Component
 *
 * Core phrase display component showing phrase, translation, and explanation
 * with expand/collapse functionality for each section.
 */

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { StoryModal } from "../StoryModal";

export interface PhraseCardProps {
    id: string;
    text: string;
    translation?: string | null;
    explanation?: string | null;
    tags?: string[];
    isTranslating?: boolean;
    // eslint-disable-next-line no-unused-vars
    onJumpToPhrase?: (phraseId: string) => void;
    onEdit?: (phraseId: string) => void;
    onDelete?: (phraseId: string) => void;
}

export const PhraseCard: React.FC<PhraseCardProps> = ({
    id,
    text,
    translation,
    explanation,
    tags = [],
    isTranslating = false,
    onJumpToPhrase,
    onEdit,
    onDelete,
}) => {
    // Per-phrase expand/collapse state
    const [expandedPhrase, setExpandedPhrase] = useState(false);
    const [expandedTranslation, setExpandedTranslation] = useState(false);
    const [expandedExplanation, setExpandedExplanation] = useState(false);

    // Dropdown menu state
    const [showDropdown, setShowDropdown] = useState(false);
    const [showStoryModal, setShowStoryModal] = useState(false);

    const toggleExpand = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        setter((prev) => !prev);
    };

    const phraseMarker = id.substring(0, 4);
    const cardRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Listen for jump events to blink this specific phrase card
    useEffect(() => {
        const handleJump = (ev: Event) => {
            const custom = ev as CustomEvent<{ marker?: string }>;
            const marker = custom.detail?.marker || "";
            if (marker && id.startsWith(marker)) {
                const element = cardRef.current;
                if (!element) return;

                // Clear any previous inline color to avoid stacking residuals
                element.style.backgroundColor = "";
                const computed = getComputedStyle(element).backgroundColor;
                element.style.backgroundColor = "rgba(180,180,180,0.25)";
                setTimeout(() => {
                    element.style.backgroundColor = computed;
                }, 1000);

                try {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                } catch {
                    // ignore
                }
            }
        };

        window.addEventListener("readnlearn:jump-to-phrase", handleJump);
        return () => {
            window.removeEventListener("readnlearn:jump-to-phrase", handleJump);
        };
    }, [id]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDropdown]);

    return (
        <div
            ref={cardRef}
            key={id}
            id={`phrase-card-${id}`}
            style={{
                border: "none",
                borderRadius: 8,
                background: "var(--bg)",
                padding: 12,
            }}
        >
            {/* Row 1: Phrase */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span
                    style={{
                        color: "var(--primary)",
                        fontSize: "0.7em",
                        marginTop: 2,
                        cursor: "pointer",
                    }}
                    title={id}
                    onClick={() => onJumpToPhrase?.(id)}
                >
                    {phraseMarker}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            whiteSpace: expandedPhrase ? "normal" : "nowrap",
                            overflow: expandedPhrase ? "visible" : "hidden",
                            textOverflow: expandedPhrase ? "clip" : "ellipsis",
                            maxWidth: "100%",
                            wordBreak: expandedPhrase ? "break-word" : undefined,
                            cursor: "pointer",
                        }}
                        title={expandedPhrase ? "Click to collapse" : "Click to expand"}
                        onClick={() => toggleExpand(setExpandedPhrase)}
                    >
                        {text}
                    </div>
                </div>
            </div>

            {/* Row 2: Translation */}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginTop: 6,
                }}
            >
                <span style={{ width: 24, color: "var(--muted)", fontSize: 12 }}>
                    <svg
                        aria-hidden="true"
                        focusable="false"
                        width="12"
                        height="12"
                        viewBox="0 0 512 512"
                    >
                        <path
                            fill="currentColor"
                            d="M410.3 231l11.3-11.3c18.7-18.7 18.7-49.1 0-67.9L360.1 90.3c-18.7-18.7-49.1-18.7-67.9 0L281 101.7 410.3 231zM256 126.6L58.6 324c-6.1 6.1-10.4 13.7-12.6 22L32 448c-1.1 4.5 .3 9.2 3.6 12.4s7.9 4.7 12.4 3.6l101.9-14c8.3-2.3 15.9-6.6 22-12.6L369.4 240 256 126.6z"
                        />
                    </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            whiteSpace: expandedTranslation ? "normal" : "nowrap",
                            overflow: expandedTranslation ? "visible" : "hidden",
                            textOverflow: expandedTranslation ? "clip" : "ellipsis",
                            maxWidth: "100%",
                            wordBreak: expandedTranslation ? "break-word" : undefined,
                            color: "var(--text)",
                            cursor: "pointer",
                            fontSize: "0.92em",
                            fontStyle: "italic",
                        }}
                        title={expandedTranslation ? "Click to collapse" : "Click to expand"}
                        onClick={() => toggleExpand(setExpandedTranslation)}
                    >
                        {isTranslating ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div
                                    style={{
                                        width: 12,
                                        height: 12,
                                        border: "2px solid var(--muted)",
                                        borderTop: "2px solid var(--primary)",
                                        borderRadius: "50%",
                                        animation: "spin 1s linear infinite",
                                    }}
                                />
                                <span style={{ color: "var(--muted)", fontSize: "0.9em" }}>
                                    Translating...
                                </span>
                            </div>
                        ) : (
                            translation || "—"
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Explanation */}
            {explanation && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        marginTop: 6,
                    }}
                >
                    <span style={{ width: 24, color: "var(--muted)", fontSize: 12 }}>💡</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                whiteSpace: expandedExplanation ? "normal" : "nowrap",
                                overflow: expandedExplanation ? "visible" : "hidden",
                                textOverflow: expandedExplanation ? "clip" : "ellipsis",
                                maxWidth: "100%",
                                wordBreak: expandedExplanation ? "break-word" : undefined,
                                color: "var(--text)",
                                cursor: "pointer",
                                fontSize: "0.92em",
                                lineHeight: 1.4,
                            }}
                            title={expandedExplanation ? "Click to collapse" : "Click to expand"}
                            onClick={() => toggleExpand(setExpandedExplanation)}
                        >
                            {expandedExplanation ? (
                                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                                    {explanation}
                                </ReactMarkdown>
                            ) : (
                                explanation
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Row 4: Tags */}
            {tags.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        marginTop: 6,
                    }}
                >
                    <span style={{ width: 24, color: "var(--muted)", fontSize: 12 }}>#</span>
                    <div style={{ flex: 1, color: "#7dd3fc", fontSize: "0.92em" }}>
                        {`#${tags.join(", #")}`}
                    </div>
                    <div style={{ width: 24 }} />
                </div>
            )}

            {/* Row 5: Actions Menu */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    marginTop: 8,
                    position: "relative",
                }}
            >
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "4px",
                        fontSize: "16px",
                    }}
                    title="More options"
                >
                    ⋯
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                    <div
                        ref={dropdownRef}
                        style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            backgroundColor: "var(--background-secondary)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                            zIndex: 1000,
                            minWidth: "150px",
                        }}
                    >
                        <button
                            onClick={() => {
                                setShowStoryModal(true);
                                setShowDropdown(false);
                            }}
                            style={{
                                width: "100%",
                                padding: "8px 12px",
                                background: "none",
                                border: "none",
                                textAlign: "left",
                                cursor: "pointer",
                                color: "var(--text-primary)",
                                fontSize: "14px",
                            }}
                        >
                            Generate Story
                        </button>
                        {onEdit && (
                            <button
                                onClick={() => {
                                    onEdit(id);
                                    setShowDropdown(false);
                                }}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    color: "var(--text-primary)",
                                    fontSize: "14px",
                                }}
                            >
                                Edit
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => {
                                    onDelete(id);
                                    setShowDropdown(false);
                                }}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    color: "var(--error-color)",
                                    fontSize: "14px",
                                }}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Story Modal */}
            <StoryModal
                isOpen={showStoryModal}
                onClose={() => setShowStoryModal(false)}
                phraseId={id}
                phraseText={text}
            />
        </div>
    );
};
