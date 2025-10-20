/**
 * Dictionary Tags Bar Component
 *
 * Provides tag-based filtering for the Dictionary mode.
 * Features:
 * - Displays all available tags as labeled checkboxes
 * - Allows multiple tag selection for filtering
 * - Shows tag counts for better UX
 * - Responsive layout with proper styling
 *
 * Props:
 * - availableTags: Array of all unique tags from phrases
 * - selectedTags: Set of currently selected tag names
 * - onTagToggle: Callback when a tag is toggled
 * - tagCounts: Optional map of tag names to their usage counts
 */

import React from "react";

interface DictionaryTagsBarProps {
    availableTags: string[];
    selectedTags: Set<string>;
    onTagToggle: (tag: string) => void; // eslint-disable-line no-unused-vars
}

export const DictionaryTagsBar: React.FC<DictionaryTagsBarProps> = ({
    availableTags,
    selectedTags,
    onTagToggle,
}) => {
    // Sort tags alphabetically for consistent display
    const sortedTags = [...availableTags].sort();

    if (sortedTags.length === 0) {
        return (
            <div
                style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-color)",
                    background: "var(--bg)",
                    color: "var(--muted)",
                    fontSize: "14px",
                    fontStyle: "italic",
                }}
            >
                No tags available
            </div>
        );
    }

    return (
        <div
            style={{
                padding: "12px 16px",
                background: "var(--bg)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    alignItems: "center",
                }}
            >
                <span
                    style={{
                        color: "var(--text-light)",
                        fontSize: "14px",
                        fontWeight: "500",
                        marginRight: 8,
                    }}
                >
                    Filter by tags:
                </span>
                {sortedTags.map((tag) => {
                    const isSelected = selectedTags.has(tag);

                    return (
                        <label
                            key={tag}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 8px",
                                borderRadius: 4,
                                background: isSelected ? "var(--primary)" : "var(--bg-secondary)",
                                color: isSelected ? "white" : "var(--text)",
                                cursor: "pointer",
                                fontSize: "13px",
                                border: "none",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = "var(--bg-hover)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = "var(--bg-secondary)";
                                }
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onTagToggle(tag)}
                                style={{
                                    margin: 0,
                                    cursor: "pointer",
                                }}
                            />
                            <span style={{ fontWeight: isSelected ? "500" : "400" }}>#{tag}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};
