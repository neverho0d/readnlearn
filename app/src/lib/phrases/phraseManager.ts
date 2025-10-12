// Centralized phrase management system
import { generateContentHash, SavedPhrase } from "../db/phraseStore";

export interface PhraseWithPosition {
    id: string;
    text: string;
    position: number;
    formulaPosition?: number;
    translation?: string;
    tags?: string[];
    sourceFile?: string;
    contentHash?: string;
}

export interface PhraseManagerOptions {
    content: string;
    sourceFile?: string;
    contentHash?: string;
}

/**
 * Calculate phrase position in text using multiple strategiesa
 * Enhanced to use context for ubiquitous phrases and proper ordering
 */
export function calculatePhrasePosition(phrase: SavedPhrase, text: string): number {
    console.log(`🔍 calculatePhrasePosition called for: "${phrase.text.substring(0, 50)}..."`);

    // 1) Use saved line/column position as primary method (most accurate)
    if (phrase.lineNo !== undefined && phrase.lineNo > 0) {
        // Use the line_no * 100000 + col_offset formula for consistent positioning
        const calculatedPosition = (phrase.lineNo || 0) * 100000 + (phrase.colOffset || 0);

        // For actual text decoration, we still need to find the real position in the text
        // but we use the formula for ordering consistency
        const lines = text.split(/\n/);
        const lineIndex = Math.max(0, Math.min(lines.length - 1, phrase.lineNo - 1));
        const before = lines.slice(0, lineIndex).join("\n");
        const actualTextPosition =
            before.length + (lineIndex > 0 ? 1 : 0) + (phrase.colOffset || 0);

        // Verify the calculated position is correct
        const textAtPosition = text.substring(
            actualTextPosition,
            actualTextPosition + phrase.text.length,
        );
        if (textAtPosition === phrase.text) {
            return actualTextPosition;
        }

        // If exact match fails, try case-insensitive
        const textAtPositionLower = textAtPosition.toLowerCase();
        const phraseLower = phrase.text.toLowerCase();
        if (textAtPositionLower === phraseLower) {
            return actualTextPosition;
        }

        console.log(`⚠️ Saved position doesn't match, trying other methods...`);
    }

    // 2) Use context for ubiquitous phrases (like "and", "I", etc.)
    if (phrase.context && phrase.context.trim()) {
        console.log(`🔍 Using context for phrase lookup: "${phrase.context.substring(0, 50)}..."`);

        const contextPosition = findPhraseWithContext(phrase.text, phrase.context, text);
        if (contextPosition >= 0) {
            console.log(`✅ Found phrase using context at position: ${contextPosition}`);
            return contextPosition;
        }
    }

    // 3) Exact match in original text
    let position = text.indexOf(phrase.text);
    console.log(`📍 Exact match result: ${position}`);
    if (position >= 0) {
        console.log(`✅ Found exact match at position: ${position}`);
        return position;
    }

    // 4) Case-insensitive match
    position = text.toLowerCase().indexOf(phrase.text.toLowerCase());
    console.log(`📍 Case-insensitive match result: ${position}`);
    if (position >= 0) {
        console.log(`✅ Found case-insensitive match at position: ${position}`);
        return position;
    }

    // 5) Normalized whitespace match
    const normalizedPhrase = phrase.text
        .replace(/\r\n/g, "\n") // Normalize line endings
        .replace(/\r/g, "\n") // Convert carriage returns to newlines
        .replace(/\n+/g, " ") // Replace newlines with spaces
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();

    const normalizedText = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    position = normalizedText.toLowerCase().indexOf(normalizedPhrase.toLowerCase());
    console.log(`📍 Normalized whitespace match result: ${position}`);
    if (position >= 0) {
        console.log(`✅ Found normalized match at position: ${position}`);

        // Instead of mapping back, find the phrase directly in original text
        // using a more robust approach
        const originalPosition = findPhraseInOriginalText(phrase.text, text);
        console.log(`📍 Found in original text at position: ${originalPosition}`);
        return originalPosition;
    }

    // 6) Try to find phrase with markdown syntax stripped and normalized whitespace
    // This handles cases where the phrase was selected from rendered text
    const strippedText = text
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.*?)\*/g, "$1") // Remove italic
        .replace(/`(.*?)`/g, "$1") // Remove code
        .replace(/#{1,6}\s+/g, "") // Remove headers
        .replace(/\n+/g, " ") // Normalize whitespace
        .replace(/\s+/g, " "); // Normalize spaces

    // Also normalize the phrase text for comparison
    const strippedPhrase = phrase.text
        .replace(/\n+/g, " ") // Normalize newlines
        .replace(/\s+/g, " ") // Normalize spaces
        .trim();

    position = strippedText.indexOf(strippedPhrase);
    if (position >= 0) {
        // Map back to original text position
        const originalPosition = mapStrippedPositionToOriginal(text, strippedText, position);
        if (originalPosition >= 0) return originalPosition;
    }

    // 7) Try fuzzy matching for multi-line phrases
    // This handles cases where the phrase spans multiple lines with different whitespace
    const fuzzyPhrase = phrase.text
        .replace(/\s+/g, "\\s+") // Convert spaces to flexible whitespace regex
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape regex special characters

    const fuzzyRegex = new RegExp(fuzzyPhrase, "i");
    const fuzzyMatch = text.match(fuzzyRegex);
    if (fuzzyMatch) {
        console.log(`✅ Found fuzzy match at position: ${fuzzyMatch.index}`);
        return fuzzyMatch.index || -1;
    }

    console.log(`❌ Could not find phrase in text`);
    return -1;
}

/**
 * Find phrase using context for better accuracy with ubiquitous phrases
 */
function findPhraseWithContext(phraseText: string, context: string, text: string): number {
    console.log(
        `🔍 findPhraseWithContext called for: "${phraseText}" with context: "${context.substring(0, 50)}..."`,
    );

    // Normalize context and phrase
    const normalizedContext = context
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

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

    // Find context in text
    const contextPosition = normalizedText.toLowerCase().indexOf(normalizedContext.toLowerCase());
    if (contextPosition >= 0) {
        console.log(`📍 Found context at position: ${contextPosition}`);

        // Look for phrase within the context
        const contextStart = contextPosition;
        const contextEnd = contextStart + normalizedContext.length;
        const contextSubstring = normalizedText.substring(contextStart, contextEnd);
        const phraseInContext = contextSubstring
            .toLowerCase()
            .indexOf(normalizedPhrase.toLowerCase());

        if (phraseInContext >= 0) {
            const absolutePosition = contextStart + phraseInContext;
            console.log(`📍 Found phrase within context at position: ${absolutePosition}`);

            // Map back to original text position
            return mapNormalizedPositionToOriginal(text, normalizedText, absolutePosition);
        }
    }

    console.log(`❌ Could not find phrase using context`);
    return -1;
}

/**
 * Map normalized position back to original text position
 */
function mapNormalizedPositionToOriginal(
    originalText: string,
    normalizedText: string,
    normalizedPosition: number,
): number {
    let originalIndex = 0;
    let normalizedIndex = 0;

    while (originalIndex < originalText.length && normalizedIndex < normalizedText.length) {
        if (normalizedIndex === normalizedPosition) {
            return originalIndex;
        }

        const originalChar = originalText[originalIndex];
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

    return -1;
}

function findPhraseInOriginalText(phraseText: string, originalText: string): number {
    console.log(`🔍 findPhraseInOriginalText called for: "${phraseText.substring(0, 50)}..."`);

    // 1) Try exact match first
    let position = originalText.indexOf(phraseText);
    if (position >= 0) {
        console.log(`✅ Found exact match in original text at position: ${position}`);
        return position;
    }

    // 2) Try case-insensitive match
    position = originalText.toLowerCase().indexOf(phraseText.toLowerCase());
    if (position >= 0) {
        console.log(`✅ Found case-insensitive match in original text at position: ${position}`);
        return position;
    }

    // 3) Try with normalized whitespace
    const normalizedPhrase = phraseText
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const normalizedText = originalText
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    position = normalizedText.toLowerCase().indexOf(normalizedPhrase.toLowerCase());
    if (position >= 0) {
        // Map this position back to original text using a simple approach
        // Find the corresponding position in original text
        let originalIndex = 0;
        let normalizedIndex = 0;

        while (originalIndex < originalText.length && normalizedIndex < normalizedText.length) {
            if (normalizedIndex === position) {
                console.log(
                    `✅ Mapped normalized position ${position} to original position ${originalIndex}`,
                );
                return originalIndex;
            }

            const originalChar = originalText[originalIndex];
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

    console.log(`❌ Could not find phrase in original text`);
    return -1;
}

function mapStrippedPositionToOriginal(
    originalText: string,
    strippedText: string,
    strippedPosition: number,
): number {
    let originalIndex = 0;
    let strippedIndex = 0;

    while (originalIndex < originalText.length && strippedIndex < strippedText.length) {
        if (strippedIndex === strippedPosition) {
            return originalIndex;
        }

        const originalChar = originalText[originalIndex];
        const strippedChar = strippedText[strippedIndex];

        if (originalChar === strippedChar) {
            originalIndex++;
            strippedIndex++;
        } else if (/[*#`]/.test(originalChar)) {
            // Skip markdown characters
            originalIndex++;
        } else {
            originalIndex++;
            strippedIndex++;
        }
    }

    return -1;
}

/**
 * Load and filter phrases for specific content
 * Optimized to only load phrases that belong to the current content
 */
export async function loadPhrasesForContent(
    options: PhraseManagerOptions,
): Promise<PhraseWithPosition[]> {
    const { content, sourceFile, contentHash } = options;

    if (!content.trim()) {
        return [];
    }

    try {
        const currentContentHash = contentHash || generateContentHash(content);

        // Import the new optimized functions
        const { loadPhrasesByContentHash, loadPhrasesBySource } = await import("../db/phraseStore");

        let relevantPhrases: SavedPhrase[] = [];

        // Try to load by content hash first (most accurate)
        if (currentContentHash) {
            try {
                relevantPhrases = await loadPhrasesByContentHash(currentContentHash);
                console.log("✅ Loaded phrases by content hash:", relevantPhrases.length);
            } catch (error) {
                console.warn("Failed to load by content hash, trying source file:", error);
            }
        }

        // If no phrases found by content hash, try by source file
        if (relevantPhrases.length === 0 && sourceFile) {
            try {
                relevantPhrases = await loadPhrasesBySource(sourceFile);
                console.log("✅ Loaded phrases by source file:", relevantPhrases.length);
            } catch (error) {
                console.warn("Failed to load by source file:", error);
            }
        }

        console.log("📊 Phrase filtering results:", {
            relevantPhrases: relevantPhrases.length,
            currentContentHash,
            sourceFile,
        });

        // Sort phrases using the line_no * 100000 + col_offset formula for consistent ordering
        // This ensures proper visual order regardless of how positions are calculated
        const sortedPhrases = relevantPhrases.sort((a, b) => {
            const positionA = (a.lineNo || 0) * 100000 + (a.colOffset || 0);
            const positionB = (b.lineNo || 0) * 100000 + (b.colOffset || 0);
            return positionB - positionA; // Sort in descending order (last to first for decoration)
        });

        console.log(
            "📋 Phrases sorted by line/column (last to first):",
            sortedPhrases.map((p) => ({
                id: p.id,
                text: p.text.substring(0, 30) + "...",
                lineNo: p.lineNo,
                colOffset: p.colOffset,
                context: p.context?.substring(0, 30) + "...",
            })),
        );

        // Calculate positions using the formula for consistent ordering
        const phrasesWithPositions = sortedPhrases
            .map((phrase) => {
                console.log(
                    `🔍 Calculating position for phrase: "${phrase.text.substring(0, 50)}..."`,
                );

                // Use the formula position for consistent ordering
                const formulaPosition = (phrase.lineNo || 0) * 100000 + (phrase.colOffset || 0);

                // Still calculate actual text position for decoration
                const actualPosition = calculatePhrasePosition(phrase, content);

                console.log(
                    `📍 Formula position: ${formulaPosition}, Actual position: ${actualPosition}`,
                );

                if (actualPosition < 0) {
                    console.log(
                        `❌ Phrase position calculation failed for: "${phrase.text.substring(0, 50)}..."`,
                    );
                } else {
                    console.log(
                        `✅ Phrase position found: ${actualPosition} (formula: ${formulaPosition}) for: "${phrase.text.substring(0, 50)}..."`,
                    );
                }

                // Enhanced debugging for multi-line phrases
                if (phrase.text.includes("\n") || phrase.text.includes("\r")) {
                    console.log("🔄 Multi-line phrase position calculation:", {
                        phrase: phrase.text,
                        hasNewlines: phrase.text.includes("\n"),
                        hasCarriageReturns: phrase.text.includes("\r"),
                        formulaPosition,
                        actualPosition,
                        found: actualPosition >= 0,
                    });
                }

                return {
                    id: phrase.id,
                    text: phrase.text,
                    position: actualPosition, // Always use actual text position for decoration
                    formulaPosition, // Store formula position for consistent ordering
                    translation: phrase.translation,
                    tags: phrase.tags,
                    sourceFile: phrase.sourceFile,
                    contentHash: phrase.contentHash,
                };
            })
            .filter((phrase) => phrase.position >= 0);

        console.log("📊 Final phrases with positions:", phrasesWithPositions.length);

        return phrasesWithPositions;
    } catch (error) {
        console.error("Failed to load phrases for content:", error);
        return [];
    }
}
