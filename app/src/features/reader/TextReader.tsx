import React from "react";
import { useI18n, getSampleTextForLanguage } from "../../lib/i18n/I18nContext";
import { useSettings } from "../../lib/settings/SettingsContext";
import { ContentRenderer } from "./ContentRenderer";
import { PhraseSelector } from "./PhraseSelector";
import { savePhrase, generateContentHash } from "../../lib/db/phraseStore";
import { queueTranslate } from "../../lib/phrases/mtQueue";

/**
 * Find phrase in text using flexible whitespace regex matching
 * Handles any combination of spaces, newlines, tabs, and other whitespace
 *
 * @param phraseText - The phrase text to search for
 * @param text - The text content to search in
 * @returns The position of the phrase in the text, or -1 if not found
 */
export function findPhraseWithFlexibleWhitespace(phraseText: string, text: string): number {
    // 1) Try exact match first (fastest)
    let position = text.indexOf(phraseText);
    if (position >= 0) {
        return position;
    }

    // 2) Try case-insensitive exact match
    position = text.toLowerCase().indexOf(phraseText.toLowerCase());
    if (position >= 0) {
        return position;
    }

    // 3) Build flexible regex pattern for whitespace variations
    const words = phraseText.trim().split(/\s+/);
    if (words.length === 0) {
        return -1;
    }

    // Escape special regex characters in each word
    const escapedWords = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    // Create regex pattern: word1(\s+|\n+|\r+|\r\n)word2(\s+|\n+|\r+|\r\n)word3...
    // This allows any combination of whitespace between words
    const regexPattern = escapedWords.join("(\\s+|\\n+|\\r+|\\r\\n|\\t+)+");

    try {
        const regex = new RegExp(regexPattern, "gi");
        const match = text.match(regex);

        if (match) {
            return text.search(regex);
        }
    } catch {
        // Regex error, continue to fallback
    }

    // 4) Try with normalized whitespace as fallback
    const normalizedPhrase = phraseText
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const normalizedText = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    position = normalizedText.toLowerCase().indexOf(normalizedPhrase.toLowerCase());
    if (position >= 0) {
        // Map back to original text position
        let originalIndex = 0;
        let normalizedIndex = 0;

        while (originalIndex < text.length && normalizedIndex < normalizedText.length) {
            if (normalizedIndex === position) {
                return originalIndex;
            }

            const originalChar = text[originalIndex];
            const normalizedChar = normalizedText[normalizedIndex];

            if (originalChar === normalizedChar) {
                originalIndex++;
                normalizedIndex++;
            } else if (/\s/.test(originalChar)) {
                // Skip whitespace in original that gets normalized
                originalIndex++;
            } else {
                originalIndex++;
                normalizedIndex++;
            }
        }
    }

    return -1;
}

/**
 * Find the actual matched text at the given position
 * This handles cases where the phrase text differs from the actual text due to whitespace
 *
 * @param phraseText - The phrase text to search for
 * @param text - The text content to search in
 * @param startPosition - The starting position to search from
 * @returns The actual matched text from the content
 */
export function findActualMatchedText(
    phraseText: string,
    text: string,
    startPosition: number,
): string {
    // Try to find the phrase using the same flexible regex approach
    const words = phraseText.trim().split(/\s+/);
    const escapedWords = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regexPattern = escapedWords.join("(\\s+|\\n+|\\r+|\\r\\n|\\t+)+");

    try {
        const regex = new RegExp(regexPattern, "gi");
        // Search within the limited text scope from startPosition
        const textFromPosition = text.substring(startPosition);
        const match = textFromPosition.match(regex);

        if (match && match[0]) {
            return match[0];
        }
    } catch {
        // Regex error, continue to fallback
    }

    // Enhanced fallback: try to find the phrase by searching for the longest possible match
    const approaches = [
        // 1) Try exact match from position
        () => {
            const exactMatch = text.substring(startPosition, startPosition + phraseText.length);
            if (exactMatch === phraseText) {
                return exactMatch;
            }
            return null;
        },

        // 2) Try case-insensitive match
        () => {
            const lowerPhrase = phraseText.toLowerCase();
            const lowerText = text.toLowerCase();
            const matchIndex = lowerText.indexOf(lowerPhrase, startPosition);
            if (matchIndex === startPosition) {
                return text.substring(startPosition, startPosition + phraseText.length);
            }
            return null;
        },

        // 3) Try to find the phrase by searching for key words
        () => {
            const keyWords = phraseText.split(/\s+/).filter((word) => word.length > 3);
            if (keyWords.length > 0) {
                const firstWord = keyWords[0];
                const lastWord = keyWords[keyWords.length - 1];

                const firstWordIndex = text.indexOf(firstWord, startPosition);
                const lastWordIndex = text.indexOf(lastWord, firstWordIndex);

                if (firstWordIndex >= 0 && lastWordIndex >= 0) {
                    // Find the end of the last word
                    const lastWordEnd = lastWordIndex + lastWord.length;
                    return text.substring(startPosition, lastWordEnd);
                }
            }
            return null;
        },
    ];

    for (const approach of approaches) {
        const result = approach();
        if (result) {
            return result;
        }
    }

    // Final fallback: use original phrase text
    return phraseText;
}

interface TextReaderProps {
    content?: string;
    // eslint-disable-next-line no-unused-vars
    onPhraseSelect?: (phrase: string, context: string) => void;
    onLoadSampleText?: () => void;
    isLoading?: boolean;
    // eslint-disable-next-line no-unused-vars
    onTextChange?: (text: string) => void;
    sourceFile?: string;
    fileFormat?: "text" | "markdown";
    savedPhrases?: Array<{ id: string; text: string; position: number; formulaPosition?: number }>;
    followText?: boolean;
    // eslint-disable-next-line no-unused-vars
    onVisiblePhrasesChange?: (_visiblePhrases: Set<string>) => void;
}

export const TextReader: React.FC<TextReaderProps> = ({
    content = "",
    onPhraseSelect,
    onLoadSampleText,
    isLoading = false,
    onTextChange,
    sourceFile,
    fileFormat = "text",
    savedPhrases = [],
    followText = false,
    onVisiblePhrasesChange,
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

    // Content preparation state to prevent flashing
    const [isContentPrepared, setIsContentPrepared] = React.useState(false);

    // Scroll position persistence
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const isProgrammaticScroll = React.useRef(false);

    // No direct textarea editing in reader-only mode; text is controlled via loaders

    // Sync external content when provided (file open)
    React.useEffect(() => {
        if (content && content !== text) {
            setText(content);
            setShowInstructions(false);
            // Mark content as prepared immediately to prevent decoration flickering
            setIsContentPrepared(true);
        }
    }, [content, text]);

    // Save scroll position to localStorage
    const saveScrollPosition = React.useCallback(() => {
        if (scrollContainerRef.current) {
            const scrollTop = scrollContainerRef.current.scrollTop;
            const scrollData = {
                position: scrollTop,
                fontSize: settings.fontSize,
                timestamp: Date.now(),
            };
            localStorage.setItem("readnlearn-scroll-position", JSON.stringify(scrollData));
        }
    }, [settings.fontSize]);

    // Restore scroll position from localStorage
    const restoreScrollPosition = React.useCallback(() => {
        const savedData = localStorage.getItem("readnlearn-scroll-position");
        if (savedData && scrollContainerRef.current) {
            try {
                const scrollData = JSON.parse(savedData);
                const savedPosition = scrollData.position;
                const savedFontSize = scrollData.fontSize;

                // Adjust position based on font size change
                let adjustedPosition = savedPosition;
                if (savedFontSize && savedFontSize !== settings.fontSize) {
                    const fontSizeRatio = settings.fontSize / savedFontSize;
                    adjustedPosition = Math.round(savedPosition * fontSizeRatio);
                }

                isProgrammaticScroll.current = true;
                scrollContainerRef.current.scrollTop = adjustedPosition;
                // Reset flag after a short delay
                setTimeout(() => {
                    isProgrammaticScroll.current = false;
                }, 100);
            } catch {
                // Fallback to old format (just a number)
                const position = parseInt(savedData, 10);
                if (!isNaN(position)) {
                    isProgrammaticScroll.current = true;
                    scrollContainerRef.current.scrollTop = position;
                    setTimeout(() => {
                        isProgrammaticScroll.current = false;
                    }, 100);
                }
            }
        }
    }, [settings.fontSize]);

    // Handle scroll events
    const handleScroll = React.useCallback(() => {
        // Only save scroll position if it's not a programmatic scroll
        if (!isProgrammaticScroll.current) {
            saveScrollPosition();
        }
    }, [saveScrollPosition]);

    // Restore scroll position when text changes
    React.useEffect(() => {
        if (text && scrollContainerRef.current) {
            // Use setTimeout to ensure DOM is updated
            setTimeout(() => {
                restoreScrollPosition();
                // Mark content as prepared after scroll position is restored
                setIsContentPrepared(true);

                // Emit event when TextReader UI is fully ready
                const checkAndEmitReady = () => {
                    // Wait for phrase decoration to complete
                    const phraseAnchors = document.querySelectorAll(".phrase-anchor");
                    const expectedPhrases = savedPhrases.length;

                    if (phraseAnchors.length >= expectedPhrases || expectedPhrases === 0) {
                        const event = new CustomEvent("readnlearn:ui-ready");
                        window.dispatchEvent(event);
                    } else {
                        // If not ready, wait a bit more
                        setTimeout(checkAndEmitReady, 100);
                    }
                };

                // Start checking after a delay to allow for all transformations
                setTimeout(checkAndEmitReady, 200);
            }, 50);
        } else if (!text) {
            // No content to load, mark as prepared immediately
            setIsContentPrepared(true);

            // Emit event for empty content
            const event = new CustomEvent("readnlearn:ui-ready");
            window.dispatchEvent(event);
        }
    }, [text, restoreScrollPosition, savedPhrases]);

    // Detect visible phrases for follow text functionality
    const detectVisiblePhrases = React.useCallback(() => {
        if (!followText || !scrollContainerRef.current) return;

        const scrollContainer = scrollContainerRef.current;
        const rect = scrollContainer.getBoundingClientRect();

        const viewportTop = rect.top;
        const viewportBottom = rect.bottom;

        const phraseAnchors = document.querySelectorAll(".phrase-anchor");
        const visible = new Set<string>();

        phraseAnchors.forEach((anchor) => {
            const anchorRect = anchor.getBoundingClientRect();
            const isVisible = anchorRect.bottom > viewportTop && anchorRect.top < viewportBottom;
            const phraseId = anchor.getAttribute("data-phrase-id");

            if (isVisible && phraseId) {
                visible.add(phraseId);
            }
        });

        if (onVisiblePhrasesChange) {
            onVisiblePhrasesChange(visible);
        }
    }, [followText, onVisiblePhrasesChange]);

    // Set up scroll event listeners for phrase visibility detection
    React.useEffect(() => {
        if (!followText || !scrollContainerRef.current) return;

        const scrollContainer = scrollContainerRef.current;

        // Throttle scroll events for better performance
        let timeoutId: ReturnType<typeof setTimeout>;
        const handleScroll = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(detectVisiblePhrases, 50);
        };

        scrollContainer.addEventListener("scroll", handleScroll);
        window.addEventListener("resize", handleScroll);

        // Initial detection with a small delay to ensure DOM is ready
        setTimeout(detectVisiblePhrases, 100);

        return () => {
            scrollContainer.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleScroll);
            clearTimeout(timeoutId);
        };
    }, [followText, detectVisiblePhrases]);

    // Update visible phrases when followText changes
    React.useEffect(() => {
        if (followText) {
            detectVisiblePhrases();
        } else if (onVisiblePhrasesChange) {
            onVisiblePhrasesChange(new Set());
        }
    }, [followText, detectVisiblePhrases, onVisiblePhrasesChange]);

    // Re-detect visible phrases when savedPhrases change (new phrase added)
    React.useEffect(() => {
        if (followText && savedPhrases.length > 0) {
            // Small delay to ensure DOM is updated with new phrases
            setTimeout(detectVisiblePhrases, 100);
        }
    }, [savedPhrases, followText, detectVisiblePhrases]);

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

            // Find all anchors with the same phrase ID (for multi-line phrases)
            const allAnchors = Array.from(
                document.querySelectorAll(`[data-phrase-id="${phrase.id}"]`),
            ) as HTMLElement[];

            if (!allAnchors.length) return;

            // Highlight all segments of the multi-line phrase
            const originalBackgrounds: string[] = [];

            allAnchors.forEach((anchor) => {
                // Store original background
                anchor.style.backgroundColor = "";
                const computed = getComputedStyle(anchor).backgroundColor;
                originalBackgrounds.push(computed);

                // Apply highlight
                anchor.style.backgroundColor = "rgba(180,180,180,0.35)";
            });

            // Scroll to the first segment
            if (allAnchors.length > 0) {
                isProgrammaticScroll.current = true;
                allAnchors[0].scrollIntoView({ behavior: "smooth", block: "center" });
                // Reset flag after scroll animation completes
                setTimeout(() => {
                    isProgrammaticScroll.current = false;
                }, 1000);
            }

            // Reset all segments after 1 second
            setTimeout(() => {
                allAnchors.forEach((anchor, index) => {
                    anchor.style.backgroundColor = originalBackgrounds[index];
                });
            }, 1000);
        };
        window.addEventListener("readnlearn:jump-to-phrase-in-text", handler);
        return () => window.removeEventListener("readnlearn:jump-to-phrase-in-text", handler);
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
        // Compute stable (line, column) for the first occurrence with robust matching
        // 1) exact; 2) case-insensitive; 3) whitespace-flexible regex matching
        const idxExact = text.indexOf(payload.phrase);
        let idx =
            idxExact >= 0 ? idxExact : text.toLowerCase().indexOf(payload.phrase.toLowerCase());
        if (idx < 0) {
            try {
                const escaped = payload.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const pattern = escaped.replace(/\s+/g, "\\s+");
                const re = new RegExp(pattern, "i");
                const m = re.exec(text);
                if (m && typeof m.index === "number") idx = m.index;
            } catch {
                // ignore regex errors; idx stays -1
            }
        }
        if (idx < 0) throw new Error("Cannot locate phrase position in source text");

        const before = text.slice(0, idx);
        const lines = before.split(/\n/);
        const lineNo = lines.length; // 1-based line number
        const colOffset = lines[lines.length - 1].length; // 0-based column offset in line
        // Persist locally for now
        // Cleanup tags: strip leading '#'
        const cleanedTags = (payload.tags || []).map((t) => t.replace(/^#+/u, ""));

        const saved = await savePhrase({
            lang: settings.l2AutoDetect ? "es" : settings.l2,
            text: payload.phrase,
            translation: payload.translation,
            context,
            tags: cleanedTags,
            sourceFile: sourceFile,
            contentHash: generateContentHash(text),
            fileFormat: fileFormat,
            lineNo,
            colOffset,
        });

        // Enqueue background translation using LLM with context
        try {
            await queueTranslate({
                phraseId: saved.id,
                text: payload.phrase,
                context: context,
                l1: settings.l1,
                l2: settings.l2,
                level: settings.userLevel || "A2",
                difficulties: settings.userDifficulties || [],
            });
        } catch {
            // non-blocking
        }

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

        // Get up to 1000 characters before and after, respecting sentence boundaries
        const beforeStart = Math.max(0, phraseIndex - 1000);
        const afterEnd = Math.min(fullText.length, phraseIndex + phrase.length + 1000);

        // Helper to check if char is a sentence terminator
        const isTerminator = (ch: string) =>
            ch === "." || ch === "!" || ch === "?" || ch === "…" || ch === "\n";

        // Start boundary: choose the FIRST sentence boundary inside the window
        // so that we include as many complete sentences as possible before the phrase
        let contextStart = beforeStart;
        for (let i = beforeStart; i < phraseIndex; i++) {
            if (isTerminator(fullText[i])) {
                contextStart = i + 1;
                // do not break; keep earliest boundary found (first inside window)
                break;
            }
        }

        // End boundary: choose the LAST sentence boundary inside the window after the phrase
        // so that we include as many complete sentences as possible after the phrase
        let contextEnd = afterEnd;
        for (let i = afterEnd - 1; i >= phraseIndex + phrase.length; i--) {
            if (isTerminator(fullText[i])) {
                contextEnd = i + 1;
                break;
            }
        }

        const context = fullText.substring(contextStart, contextEnd).trim();
        console.log("Context extraction:", {
            phrase: phrase,
            phraseIndex: phraseIndex,
            beforeStart: beforeStart,
            afterEnd: afterEnd,
            contextStart: contextStart,
            contextEnd: contextEnd,
            context: context,
        });
        return context;
    };

    // Render text with visual decorations for saved phrases
    const renderTextWithPhrases = (
        text: string,
        phrases: Array<{ id: string; text: string; position: number; formulaPosition?: number }>,
    ) => {
        if (phrases.length === 0) {
            return text;
        }

        // Process phrases in reverse order to maintain correct positions
        // Use formulaPosition for consistent ordering (descending - last to first)
        const sortedPhrases = [...phrases].sort(
            (a, b) => (b.formulaPosition || 0) - (a.formulaPosition || 0),
        );
        let result = text;
        let lastProcessedEnd = text.length; // Track the end of the last processed phrase for optimization

        // console.log("sortedPhrases before decoration:", sortedPhrases);
        for (const phrase of sortedPhrases) {
            // console.log("phrase:", phrase, "lastProcessedEnd:", lastProcessedEnd);
            // Use robust regex-based phrase finding instead of relying on saved positions
            // Optimize: only search up to the end of the last processed phrase
            const searchText = result.substring(0, lastProcessedEnd);
            const start = findPhraseWithFlexibleWhitespace(phrase.text, searchText);
            if (start === -1) {
                continue;
            }

            // Find the actual matched text to get the correct length
            // Pass the full result text and the actual start position in the full text
            const actualMatchedText = findActualMatchedText(phrase.text, result, start);
            // console.log("actualMatchedText:", actualMatchedText);
            const actualLength = actualMatchedText.length;

            // Calculate end position using actual matched text length
            let end = Math.min(result.length, start + actualLength);

            if (start >= 0 && end > start) {
                // Use the original substring at this position to preserve casing/punctuation
                const original = result.substring(start, end);

                // Use the elegant solution: wrap newlines with span tags to handle multi-paragraph phrases
                // This ensures proper HTML structure while maintaining visual consistency
                const phraseParts = original.split("\n");
                const decoratedParts = phraseParts.map((part, index) => {
                    if (index === phraseParts.length - 1) {
                        // Last part: end with closing span and marker
                        if (index === 0) {
                            // Single part: complete span with marker
                            return `<span class="phrase-anchor" data-phrase-id="${phrase.id}">${part}<sup class="phrase-marker">${phrase.id.substring(0, 4)}</sup></span>`;
                        } else {
                            // Last part of multi-part: close previous span and add marker
                            // return `</span>\n<span class="phrase-anchor" data-phrase-id="${phrase.id}">${part}<sup class="phrase-marker">${phrase.id.substring(0, 4)}</sup></span>`;
                            return `</span> <span class="phrase-anchor" data-phrase-id="${phrase.id}">${part}<sup class="phrase-marker">${phrase.id.substring(0, 4)}</sup></span>`;
                        }
                    } else if (index === 0) {
                        // First part (but not last): start with opening span
                        return `<span class="phrase-anchor" data-phrase-id="${phrase.id}">${part}`;
                    } else {
                        // Middle parts: close previous span and open new one
                        // return `</span>\n<span class="phrase-anchor" data-phrase-id="${phrase.id}">${part}`;
                        return `</span> <span class="phrase-anchor" data-phrase-id="${phrase.id}">${part}`;
                    }
                });

                const decoratedPhrase = decoratedParts.join("");
                result = result.substring(0, start) + decoratedPhrase + result.substring(end);

                // Update the last processed end position for optimization
                lastProcessedEnd = end;
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
                    ref={scrollContainerRef}
                    className="main-pane"
                    style={{
                        border: "none",
                        borderRadius: "8px",
                        padding: "16px",
                        minHeight: "400px",
                        cursor: "text",
                        fontFamily: settings.font,
                        fontSize: settings.fontSize,
                        overflowY: "auto",
                        maxHeight: "calc(100vh - 200px)",
                        opacity: isContentPrepared ? 1 : 0,
                        transition: "opacity 0.2s ease-in-out",
                    }}
                    onMouseUp={handleTextSelection}
                    onTouchEnd={handleTextSelection}
                    onScroll={handleScroll}
                >
                    {isContentPrepared ? (
                        <ContentRenderer
                            key={`${text.length}-${savedPhrases.length}-${fileFormat}`}
                            content={renderTextWithPhrases(text, savedPhrases)}
                            format={fileFormat}
                            onClick={handleTextSelection}
                        />
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "200px",
                                color: "var(--muted)",
                            }}
                        >
                            Loading...
                        </div>
                    )}
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
