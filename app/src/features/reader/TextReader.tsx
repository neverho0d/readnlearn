import React from "react";
import { useI18n, getSampleTextForLanguage } from "../../lib/i18n/I18nContext";
import { useSettings } from "../../lib/settings/SettingsContext";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PhraseSelector } from "./PhraseSelector";
import { savePhrase } from "../../lib/db/phraseStore";

interface TextReaderProps {
    content?: string;
    // eslint-disable-next-line no-unused-vars
    onPhraseSelect?: (phrase: string, context: string) => void;
    onLoadSampleText?: () => void;
    isLoading?: boolean;
}

export const TextReader: React.FC<TextReaderProps> = ({
    content = "",
    onPhraseSelect,
    onLoadSampleText,
    isLoading = false,
}) => {
    const { t } = useI18n();
    const { settings } = useSettings();
    const [text, setText] = React.useState(content);
    const [selectedText, setSelectedText] = React.useState("");
    const [showInstructions, setShowInstructions] = React.useState(() => {
        return localStorage.getItem("readnlearn-instructions-dismissed") !== "true";
    });
    const [hasLoadedSample, setHasLoadedSample] = React.useState(false);

    // No direct textarea editing in reader-only mode; text is controlled via loaders

    // Sync external content when provided (file open)
    React.useEffect(() => {
        if (content && content !== text) {
            setText(content);
            setShowInstructions(false);
        }
    }, [content]);

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            setSelectedText(selection.toString().trim());
        }
    };

    const handleSavePhrase = async (payload: {
        phrase: string;
        tags: string[];
        translation: string;
    }) => {
        const context = getContextAroundPhrase(payload.phrase, text);
        // Persist locally for now
        await savePhrase({
            lang: settings.l2AutoDetect ? "es" : settings.l2,
            text: payload.phrase,
            translation: payload.translation,
            context,
            tags: payload.tags,
        });
        if (onPhraseSelect) onPhraseSelect(payload.phrase, context);
    };

    const getContextAroundPhrase = (phrase: string, fullText: string): string => {
        const phraseIndex = fullText.indexOf(phrase);
        if (phraseIndex === -1) return "";
        const start = Math.max(0, phraseIndex - 50);
        const end = Math.min(fullText.length, phraseIndex + phrase.length + 50);
        return fullText.substring(start, end);
    };

    const isSampleText = (val: string): boolean => {
        const indicators = [
            "Mi Viaje a España",
            "My Trip to Spain",
            "Mon Voyage en Espagne",
            "Meine Reise nach Spanien",
            "Il Mio Viaggio in Spagna",
            "Minha Viagem à Espanha",
        ];
        return indicators.some((x) => val.includes(x));
    };

    // Initial sample text load when instructions shown
    React.useEffect(() => {
        if (!hasLoadedSample && showInstructions && !text) {
            const l2 = settings.l2AutoDetect ? "es" : settings.l2;
            const sample = getSampleTextForLanguage(l2);
            setText(sample);
            setHasLoadedSample(true);
        }
    }, [hasLoadedSample, showInstructions, text, settings.l2, settings.l2AutoDetect]);

    // Update sample text on L2 change if sample is currently displayed
    React.useEffect(() => {
        if (text && showInstructions && isSampleText(text)) {
            const l2 = settings.l2AutoDetect ? "es" : settings.l2;
            const sample = getSampleTextForLanguage(l2);
            setText(sample);
        }
    }, [settings.l2, settings.l2AutoDetect]);

    // Load on demand from top bar
    React.useEffect(() => {
        if (onLoadSampleText && isLoading) {
            const l2 = settings.l2AutoDetect ? "es" : settings.l2;
            const sample = getSampleTextForLanguage(l2);
            setTimeout(() => {
                setText(sample);
                setHasLoadedSample(true);
                alert("Sample text loaded");
            }, 800);
        }
    }, [isLoading, onLoadSampleText, settings.l2, settings.l2AutoDetect]);

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {showInstructions && (
                    <div
                        style={{
                            padding: "16px",
                            backgroundColor: "#ebf8ff",
                            borderRadius: "8px",
                            border: "1px solid #bee3f8",
                            position: "relative",
                        }}
                    >
                        <button
                            onClick={() => {
                                setShowInstructions(false);
                                localStorage.setItem("readnlearn-instructions-dismissed", "true");
                            }}
                            style={{
                                position: "absolute",
                                top: "8px",
                                right: "8px",
                                backgroundColor: "transparent",
                                border: "none",
                                color: "#2b6cb0",
                                cursor: "pointer",
                                fontSize: "12px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                            }}
                            title={t.dontShowAgain}
                        >
                            ✕
                        </button>
                        <h3
                            style={{
                                margin: "0 0 8px 0",
                                color: "#2b6cb0",
                                paddingRight: "40px",
                            }}
                        >
                            {t.instructions}
                        </h3>
                        <p style={{ margin: 0, color: "#2c5282" }}>{t.instructionsText}</p>
                        <button
                            onClick={() => {
                                setShowInstructions(false);
                                localStorage.setItem("readnlearn-instructions-dismissed", "true");
                            }}
                            style={{
                                marginTop: "8px",
                                backgroundColor: "transparent",
                                border: "1px solid #2b6cb0",
                                color: "#2b6cb0",
                                cursor: "pointer",
                                fontSize: "12px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                            }}
                        >
                            {t.dontShowAgain}
                        </button>
                    </div>
                )}

                <div
                    style={{
                        border: "none",
                        borderRadius: "8px",
                        padding: "16px",
                        minHeight: "400px",
                        cursor: "text",
                    }}
                    onMouseUp={handleTextSelection}
                    onTouchEnd={handleTextSelection}
                >
                    <MarkdownRenderer content={text} />
                </div>

                {selectedText && (
                    <PhraseSelector
                        selectedText={selectedText}
                        onPhraseSelect={handleSavePhrase}
                        onClear={() => setSelectedText("")}
                    />
                )}
            </div>
        </div>
    );
};
