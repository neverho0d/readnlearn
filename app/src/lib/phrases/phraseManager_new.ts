// Centralized phrase management system
import { loadAllPhrases, generateContentHash, SavedPhrase } from "../db/phraseStore";

export interface PhraseWithPosition {
    id: string;
    text: string;
    position: number;
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
 * Calculate phrase position in text using multiple strategies
 */
export function calculatePhrasePosition(phrase: SavedPhrase, text: string): number {
    console.log(`🔍 calculatePhrasePosition called for: "${phrase.text.substring(0, 50)}..."`);

    // 1) Exact match in original text
    let position = text.indexOf(phrase.text);
    console.log(`📍 Exact match result: ${position}`);
    if (position >= 0) {
        console.log(`✅ Found exact match at position: ${position}`);
        return position;
    }

    // 2) Case-insensitive match
    position = text.toLowerCase().indexOf(phrase.text.toLowerCase());
    console.log(`📍 Case-insensitive match result: ${position}`);
    if (position >= 0) {
        console.log(`✅ Found case-insensitive match at position: ${position}`);
        return position;
    }

    // 3) Normalized whitespace match
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

    // 3) Try to find phrase with markdown syntax stripped and normalized whitespace
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

    // 4) Try fuzzy matching for multi-line phrases
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

    // 4) Try using context for position calculation
    if (phrase.context) {
        const normalizedContext = phrase.context
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\n+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const contextPosition = normalizedText
            .toLowerCase()
            .indexOf(normalizedContext.toLowerCase());
        if (contextPosition >= 0) {
            // Find the phrase within the context
            const contextStart = contextPosition;
            const contextEnd = contextStart + normalizedContext.length;
            const contextSubstring = normalizedText.substring(contextStart, contextEnd);
            const phraseInContext = contextSubstring
                .toLowerCase()
                .indexOf(normalizedPhrase.toLowerCase());

            if (phraseInContext >= 0) {
                const absolutePosition = contextStart + phraseInContext;
                return findPhraseInOriginalText(phrase.text, text); // Use the robust finder
            }
        }
    }

    // 5) Use saved line/column position as fallback
    if (phrase.lineNo !== undefined && phrase.colOffset !== undefined) {
        const lines = text.split(/\n/);
        const lineIndex = Math.max(0, Math.min(lines.length - 1, (phrase.lineNo || 1) - 1));
        const before = lines.slice(0, lineIndex).join("\n");
        return before.length + (lineIndex > 0 ? 1 : 0) + (phrase.colOffset || 0);
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

        // Calculate positions and filter out phrases not found in text
        const phrasesWithPositions = relevantPhrases
            .map((phrase) => {
                console.log(
                    `🔍 Calculating position for phrase: "${phrase.text.substring(0, 50)}..."`,
                );
                const position = calculatePhrasePosition(phrase, content);
                console.log(`📍 Position result: ${position}`);
                if (position < 0) {
                    console.log(
                        `❌ Phrase position calculation failed for: "${phrase.text.substring(0, 50)}..."`,
                    );
                } else {
                    console.log(
                        `✅ Phrase position found: ${position} for: "${phrase.text.substring(0, 50)}..."`,
                    );
                }

                // Enhanced debugging for multi-line phrases
                if (phrase.text.includes("\n") || phrase.text.includes("\r")) {
                    console.log("🔄 Multi-line phrase position calculation:", {
                        phrase: phrase.text,
                        hasNewlines: phrase.text.includes("\n"),
                        hasCarriageReturns: phrase.text.includes("\r"),
                        position,
                        found: position >= 0,
                    });
                }

                return {
                    id: phrase.id,
                    text: phrase.text,
                    position,
                    translation: phrase.translation,
                    tags: phrase.tags,
                    sourceFile: phrase.sourceFile,
                    contentHash: phrase.contentHash,
                };
            })
            .filter((phrase) => phrase.position >= 0);

        console.log("📊 Final phrases with positions:", phrasesWithPositions.length);

        // Sort by position in text
        phrasesWithPositions.sort((a, b) => a.position - b.position);

        console.log(
            "📋 Final phrases sorted by position:",
            phrasesWithPositions.map((p) => ({
                id: p.id,
                text: p.text.substring(0, 50) + "...",
                position: p.position,
            })),
        );

        return phrasesWithPositions;
    } catch (error) {
        console.error("Failed to load phrases for content:", error);
        return [];
    }
}
