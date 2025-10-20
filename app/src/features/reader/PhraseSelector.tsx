import React, { useState } from "react";
import { useI18n } from "../../lib/i18n/I18nContext";

interface PhraseSelectorProps {
    selectedText: string;
    // eslint-disable-next-line no-unused-vars
    onPhraseSelect: (data: { phrase: string; tags: string[]; translation: string }) => void;
    onClear: () => void;
    suggestedTags?: string[];
}

export const PhraseSelector: React.FC<PhraseSelectorProps> = ({
    selectedText,
    onPhraseSelect,
    onClear,
    suggestedTags = [],
}) => {
    const { t } = useI18n();
    const phrase = selectedText;
    const [tags, setTags] = useState<string>(suggestedTags.join(", "));

    const handleSavePhrase = () => {
        if (!phrase.trim()) {
            return;
        }
        const parsedTags = tags
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        onPhraseSelect({ phrase, tags: parsedTags, translation: "" });
        setTags("");
        onClear();
    };

    return (
        <div
            style={{
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "var(--panel)",
                position: "fixed",
                right: "20px",
                bottom: "20px",
                maxWidth: "min(92vw, 480px)",
                width: "480px",
                zIndex: 1100,
                boxShadow: `0 10px 25px var(--dropdown-shadow)`,
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Phrase (read-only display without label/border) */}
                    <div
                        style={{
                            width: "100%",
                            fontSize: "16px",
                            fontWeight: 600,
                            color: "var(--text)",
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                        }}
                    >
                        {phrase || "—"}
                    </div>

                    {/* Tags (editable, comma-separated) */}
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "14px",
                                fontWeight: 500,
                                marginBottom: "4px",
                            }}
                        >
                            Tags (comma-separated)
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="e.g. travel, greeting"
                            style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid var(--border-color)",
                                borderRadius: "4px",
                                fontSize: "14px",
                                boxSizing: "border-box",
                                backgroundColor: "var(--panel)",
                                color: "var(--text)",
                                boxShadow: "none",
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                        onClick={onClear}
                        style={{
                            padding: "6px 10px",
                            backgroundColor: "transparent",
                            color: "var(--primary)",
                            border: "1px solid var(--primary)",
                            borderRadius: "4px",
                            cursor: "pointer",
                            height: 30,
                            lineHeight: "16px",
                            fontSize: 12,
                        }}
                    >
                        {t.cancel}
                    </button>
                    <button
                        onClick={handleSavePhrase}
                        disabled={!phrase.trim()}
                        style={{
                            padding: "6px 12px",
                            backgroundColor: phrase.trim()
                                ? "var(--primary)"
                                : "var(--border-color)",
                            color: "var(--primary-contrast)",
                            border: "none",
                            borderRadius: "44px",
                            cursor: phrase.trim() ? "pointer" : "not-allowed",
                            height: 30,
                            lineHeight: "16px",
                            fontSize: 12,
                        }}
                    >
                        {t.savePhrase}
                    </button>
                </div>
            </div>
        </div>
    );
};
