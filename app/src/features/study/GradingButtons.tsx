/**
 * Grading Buttons Component
 *
 * Provides 1-4 scale grading interface for SRS system.
 * Each grade corresponds to different difficulty levels.
 */

import React, { useState } from "react";
import { getGradeDescription, getGradeColor } from "../../lib/srs/sm2";

export interface GradingButtonsProps {
    onGrade: (grade: number) => void;
    disabled?: boolean;
    showDescriptions?: boolean;
    compact?: boolean;
}

export interface GradingButtonProps {
    grade: number;
    isSelected: boolean;
    onClick: () => void;
    disabled: boolean;
    showDescription: boolean;
    compact: boolean;
}

export function GradingButtons({
    onGrade,
    disabled = false,
    showDescriptions = true,
    compact = false,
}: GradingButtonsProps) {
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

    /**
     * Handle grade selection
     */
    const handleGradeSelect = (grade: number) => {
        if (disabled) return;

        setSelectedGrade(grade);

        // Auto-submit after selection
        setTimeout(() => {
            onGrade(grade);
        }, 500);
    };

    const grades = [1, 2, 3, 4];

    return (
        <div
            style={{
                display: "flex",
                gap: compact ? "0.5rem" : "1rem",
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
            }}
        >
            {grades.map((grade) => (
                <GradingButton
                    key={grade}
                    grade={grade}
                    isSelected={selectedGrade === grade}
                    onClick={() => handleGradeSelect(grade)}
                    disabled={disabled}
                    showDescription={showDescriptions}
                    compact={compact}
                />
            ))}
        </div>
    );
}

/**
 * Individual grading button
 */
function GradingButton({
    grade,
    isSelected,
    onClick,
    disabled,
    showDescription,
    compact,
}: GradingButtonProps) {
    const description = getGradeDescription(grade);
    const color = getGradeColor(grade);
    const gradeText = getGradeText(grade);

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: compact ? "0.75rem 1rem" : "1rem 1.5rem",
                backgroundColor: isSelected ? color : "transparent",
                color: isSelected ? "white" : color,
                border: `2px solid ${color}`,
                borderRadius: "8px",
                cursor: disabled ? "not-allowed" : "pointer",
                fontSize: compact ? "0.9rem" : "1rem",
                fontWeight: "bold",
                minWidth: compact ? "80px" : "120px",
                transition: "all 0.2s ease",
                opacity: disabled ? 0.5 : 1,
                transform: isSelected ? "scale(1.05)" : "scale(1)",
                boxShadow: isSelected ? `0 4px 8px ${color}40` : "none",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.25rem",
                }}
            >
                <div style={{ fontSize: compact ? "1.2rem" : "1.5rem" }}>
                    {getGradeEmoji(grade)}
                </div>
                <div style={{ fontWeight: "bold" }}>{gradeText}</div>
                {showDescription && !compact && (
                    <div
                        style={{
                            fontSize: "0.8rem",
                            textAlign: "center",
                            lineHeight: "1.2",
                            opacity: 0.8,
                        }}
                    >
                        {description}
                    </div>
                )}
            </div>
        </button>
    );
}

/**
 * Get grade text
 */
function getGradeText(grade: number): string {
    switch (grade) {
        case 1:
            return "Again";
        case 2:
            return "Hard";
        case 3:
            return "Good";
        case 4:
            return "Easy";
        default:
            return "Unknown";
    }
}

/**
 * Get grade emoji
 */
function getGradeEmoji(grade: number): string {
    switch (grade) {
        case 1:
            return "😞";
        case 2:
            return "😐";
        case 3:
            return "😊";
        case 4:
            return "😄";
        default:
            return "❓";
    }
}

/**
 * Grading instructions component
 */
export function GradingInstructions({ compact = false }: { compact?: boolean }) {
    return (
        <div
            style={{
                marginTop: "1rem",
                padding: "1rem",
                backgroundColor: "var(--info-bg)",
                borderRadius: "4px",
                border: "1px solid var(--info)",
                fontSize: compact ? "0.8rem" : "0.9rem",
                color: "var(--info-text)",
            }}
        >
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                How to grade your performance:
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: getGradeColor(1), fontWeight: "bold" }}>1 - Again:</span>
                    <span>Complete blackout, couldn't remember at all</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: getGradeColor(2), fontWeight: "bold" }}>2 - Hard:</span>
                    <span>Incorrect response, but remembered after seeing the answer</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: getGradeColor(3), fontWeight: "bold" }}>3 - Good:</span>
                    <span>Correct response after some hesitation</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: getGradeColor(4), fontWeight: "bold" }}>4 - Easy:</span>
                    <span>Perfect response, no hesitation</span>
                </div>
            </div>
        </div>
    );
}

/**
 * Compact grading buttons for mobile
 */
export function CompactGradingButtons({
    onGrade,
    disabled = false,
}: {
    onGrade: (grade: number) => void;
    disabled?: boolean;
}) {
    return (
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            {[1, 2, 3, 4].map((grade) => (
                <button
                    key={grade}
                    onClick={() => onGrade(grade)}
                    disabled={disabled}
                    style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        border: `2px solid ${getGradeColor(grade)}`,
                        backgroundColor: "transparent",
                        color: getGradeColor(grade),
                        cursor: disabled ? "not-allowed" : "pointer",
                        fontSize: "1.2rem",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: disabled ? 0.5 : 1,
                        transition: "all 0.2s ease",
                    }}
                >
                    {grade}
                </button>
            ))}
        </div>
    );
}
