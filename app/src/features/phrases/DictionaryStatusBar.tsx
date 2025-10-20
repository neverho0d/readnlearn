/**
 * Dictionary Status Bar Component
 *
 * Displays search results information and scope for the Dictionary mode.
 * Features:
 * - Shows total number of records in search results
 * - Displays search scope (current file vs all files)
 * - Provides scope toggle functionality
 * - Clean, informative design
 *
 * Props:
 * - totalRecords: Total number of phrases matching current filters
 * - currentScope: Current search scope ('current' or 'all')
 * - onScopeChange: Callback when scope is changed
 * - hasCurrentFile: Whether a file is currently loaded
 */

import React from "react";

interface DictionaryStatusBarProps {
    totalRecords: number;
    currentScope: "current" | "all";
    onScopeChange: (scope: "current" | "all") => void; // eslint-disable-line no-unused-vars
    hasCurrentFile: boolean;
    sourceFile?: string | null;
}

export const DictionaryStatusBar: React.FC<DictionaryStatusBarProps> = ({
    totalRecords,
    currentScope,
    onScopeChange,
    hasCurrentFile,
    sourceFile,
}) => {
    const formatRecordCount = (count: number): string => {
        if (count === 0) return "No phrases found";
        if (count === 1) return "1 phrase found";
        return `${count.toLocaleString()} phrases found`;
    };

    const getScopeDescription = (): string => {
        if (currentScope === "current") {
            return hasCurrentFile && sourceFile
                ? `Searching in current file: ${sourceFile}`
                : "No file loaded - switch to Reading mode to load a file";
        }
        return "Searching in all files";
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
                borderBottom: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                fontSize: "13px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                }}
            >
                <span
                    style={{
                        color: "var(--text)",
                        fontWeight: "500",
                    }}
                >
                    {formatRecordCount(totalRecords)}
                </span>
                <span
                    style={{
                        color: "var(--muted)",
                    }}
                >
                    {getScopeDescription()}
                </span>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <span
                    style={{
                        color: "var(--text-light)",
                        fontSize: "12px",
                    }}
                >
                    Scope:
                </span>
                <div
                    style={{
                        display: "flex",
                        background: "var(--bg)",
                        borderRadius: 4,
                        overflow: "hidden",
                    }}
                >
                    <button
                        onClick={() => onScopeChange("current")}
                        style={{
                            padding: "4px 12px",
                            background:
                                currentScope === "current" ? "var(--primary)" : "transparent",
                            color: currentScope === "current" ? "white" : "var(--text)",
                            border: "none",
                            boxShadow: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: currentScope === "current" ? "500" : "400",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (currentScope !== "current") {
                                e.currentTarget.style.background = "var(--bg-hover)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentScope !== "current") {
                                e.currentTarget.style.background = "transparent";
                            }
                        }}
                    >
                        Current file
                    </button>
                    <button
                        onClick={() => onScopeChange("all")}
                        style={{
                            padding: "4px 12px",
                            background: currentScope === "all" ? "var(--primary)" : "transparent",
                            color: currentScope === "all" ? "white" : "var(--text)",
                            border: "none",
                            boxShadow: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: currentScope === "all" ? "500" : "400",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (currentScope !== "all") {
                                e.currentTarget.style.background = "var(--bg-hover)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentScope !== "all") {
                                e.currentTarget.style.background = "transparent";
                            }
                        }}
                    >
                        All files
                    </button>
                </div>
            </div>
        </div>
    );
};
