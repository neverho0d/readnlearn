import React from "react";
import { useI18n, getSampleTextForLanguage } from "../../lib/i18n/I18nContext";
import { useSettings } from "../../lib/settings/SettingsContext";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PhraseSelector } from "./PhraseSelector";
import { savePhrase, generateContentHash } from "../../lib/db/phraseStore";

interface TextReaderProps {
    content?: string;
    // eslint-disable-next-line no-unused-vars
    onPhraseSelect?: (phrase: string, context: string) => void;
    onLoadSampleText?: () => void;
    isLoading?: boolean;
    // eslint-disable-next-line no-unused-vars
    onTextChange?: (text: string) => void;
    sourceFile?: string;
    savedPhrases?: Array<{ id: string; text: string; position: number }>;
}

export const TextReader: React.FC<TextReaderProps> = ({
    content = "",
    onPhraseSelect,
    onLoadSampleText,
    isLoading = false,
    onTextChange,
    sourceFile,
    savedPhrases = [],
}) => {
    const { t } = useI18n();
    const { settings } = useSettings();
    const [text, setText] = React.useState(content);
    const [selectedText, setSelectedText] = React.useState("");
    const [showInstructions, setShowInstructions] = React.useState(() => {
        return localStorage.getItem("readnlearn-instructions-dismissed") !== "true";
    });
    const [hasLoadedSample, setHasLoadedSample] = React.useState(false);
    // savedPhrases are now passed as props from App.tsx

    // No direct textarea editing in reader-only mode; text is controlled via loaders

    // Sync external content when provided (file open)
    React.useEffect(() => {
        if (content && content !== text) {
            setText(content);
            setShowInstructions(false);
        }
    }, [content]);

    // Notify parent of text changes
    React.useEffect(() => {
        if (onTextChange) {
            onTextChange(text);
        }
    }, [text, onTextChange]);

    // Listen to clicks from dictionary marker → blink phrase in text
    React.useEffect(() => {
        const handler = (e: Event) => {
            const custom = e as CustomEvent<{ id: string }>;
            const phrase = savedPhrases.find((p) => p.id === custom.detail?.id);
            if (!phrase) return;
            // Find the displayed element: we used phrase.id substring(0,4) as marker; use position to locate anchor
            // Build a CSS selector for anchors near the text position
            const anchors = Array.from(
                document.querySelectorAll(".phrase-anchor"),
            ) as HTMLElement[];
            if (!anchors.length) return;
            // Choose the anchor whose marker sup text matches
            const target = anchors.find((a) => {
                const sup = a.querySelector(".phrase-marker");
                return sup && sup.textContent === phrase.id.substring(0, 4);
            });
            if (target) {
                // Reset any previous inline style and use computed color as baseline
                target.style.backgroundColor = "";
                const computed = getComputedStyle(target).backgroundColor;
                target.style.backgroundColor = "rgba(180,180,180,0.35)";
                setTimeout(() => {
                    target.style.backgroundColor = computed;
                }, 1000);
                target.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        };
        window.addEventListener("readnlearn:jump-to-phrase-in-text", handler as EventListener);
        return () =>
            window.removeEventListener(
                "readnlearn:jump-to-phrase-in-text",
                handler as EventListener,
            );
    }, [savedPhrases]);

    // savedPhrases are now managed by App.tsx and passed as props

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
        // Compute stable (line, column) for the first exact/ci match
        const idxExact = text.indexOf(payload.phrase);
        const idx =
            idxExact >= 0 ? idxExact : text.toLowerCase().indexOf(payload.phrase.toLowerCase());
        let lineNo: number | undefined;
        let colOffset: number | undefined;
        if (idx >= 0) {
            const before = text.slice(0, idx);
            const lines = before.split(/\n/);
            lineNo = lines.length; // 1-based line number
            colOffset = lines[lines.length - 1].length; // 0-based column offset in line
        }
        // Persist locally for now
        // Cleanup tags: strip leading '#'
        const cleanedTags = (payload.tags || []).map((t) => t.replace(/^#+/u, ""));

        await savePhrase({
            lang: settings.l2AutoDetect ? "es" : settings.l2,
            text: payload.phrase,
            translation: payload.translation,
            context,
            tags: cleanedTags,
            sourceFile: sourceFile,
            contentHash: generateContentHash(text),
            lineNo,
            colOffset,
        });

        // Debug logging
        // if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") {
        //     console.log("Phrase saved:", {
        //         phrase: payload.phrase,
        //         textLength: text.length,
        //         textPreview: text.substring(0, 100),
        //         phraseInText: text.toLowerCase().includes(payload.phrase.toLowerCase()),
        //     });
        // }

        if (onPhraseSelect) onPhraseSelect(payload.phrase, context);

        // Trigger the global event to update other components
        try {
            window.dispatchEvent(new CustomEvent("readnlearn:phrases-updated"));
        } catch {
            // Ignore dispatch errors in non-browser contexts
        }
    };

    const getContextAroundPhrase = (phrase: string, fullText: string): string => {
        const phraseIndex = fullText.indexOf(phrase);
        if (phraseIndex === -1) return "";
        const start = Math.max(0, phraseIndex - 50);
        const end = Math.min(fullText.length, phraseIndex + phrase.length + 50);
        return fullText.substring(start, end);
    };

    // Render text with visual decorations for saved phrases
    const renderTextWithPhrases = (
        text: string,
        phrases: Array<{ id: string; text: string; position: number }>,
    ) => {
        if (phrases.length === 0) return text;

        // Process phrases in reverse order to maintain correct positions
        const sortedPhrases = [...phrases].sort((a, b) => b.position - a.position);
        let result = text;

        for (const phrase of sortedPhrases) {
            const start = Math.max(0, phrase.position);
            const end = Math.min(result.length, start + phrase.text.length);

            if (start >= 0 && end > start) {
                // Use the original substring at this position to preserve casing/punctuation
                const original = result.substring(start, end);
                // Create decorated phrase with superscript marker and data attribute for scroll following
                const decoratedPhrase = `<span class="phrase-anchor" data-phrase-id="${phrase.id}">${original}<sup class="phrase-marker">${phrase.id.substring(0, 4)}</sup></span>`;

                // Replace the phrase in the text
                result = result.substring(0, start) + decoratedPhrase + result.substring(end);
            }
        }

        return result;
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
                    className="main-pane"
                    style={{
                        border: "none",
                        borderRadius: "8px",
                        padding: "16px",
                        minHeight: "400px",
                        cursor: "text",
                        fontFamily: settings.font,
                        fontSize: settings.fontSize,
                    }}
                    onMouseUp={handleTextSelection}
                    onTouchEnd={handleTextSelection}
                >
                    <MarkdownRenderer content={renderTextWithPhrases(text, savedPhrases)} />
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
