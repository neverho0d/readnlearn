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
                return mapNormalizedPositionToOriginal(text, normalizedText, absolutePosition);
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

/**
 * Map position from stripped text back to original text
 */
function mapStrippedPositionToOriginal(
    originalText: string,
    strippedText: string,
    strippedPosition: number,
): number {
    let originalIndex = 0;
    let strippedIndex = 0;

    while (originalIndex < originalText.length && strippedIndex < strippedText.length) {
        if (originalText[originalIndex] === strippedText[strippedIndex]) {
            if (strippedIndex === strippedPosition) {
                return originalIndex;
            }
            originalIndex++;
            strippedIndex++;
        } else {
            // Skip markdown syntax in original text
            originalIndex++;
        }
    }

    return -1;
}

/**
 * Find phrase in original text using multiple strategies
 */
function findPhraseInOriginalText(phraseText: string, originalText: string): number {
    console.log(`🔍 findPhraseInOriginalText called for: "${phraseText.substring(0, 50)}..."`);

    // 1) Try exact match first
    let position = originalText.indexOf(phraseText);
    if (position >= 0) {
        console.log(`✅ Found exact match at position: ${position}`);
        return position;
    }

    // 2) Try case-insensitive match
    position = originalText.toLowerCase().indexOf(phraseText.toLowerCase());
    if (position >= 0) {
        console.log(`✅ Found case-insensitive match at position: ${position}`);
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
        console.log(`✅ Found normalized match at position: ${position}`);

        // Map this position back to original text using a simple approach
        // Find the corresponding position in original text
        let originalIndex = 0;
        let normalizedIndex = 0;

        while (originalIndex < originalText.length && normalizedIndex < normalizedText.length) {
            if (normalizedIndex === position) {
                console.log(`📍 Mapped to original position: ${originalIndex}`);
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

    console.log(`❌ Phrase not found in original text`);
    return -1;
}

/**
 * Map position from normalized text back to original text
 */
function mapNormalizedPositionToOriginal(
    originalText: string,
    normalizedText: string,
    normalizedPosition: number,
): number {
    console.log(`🔍 mapNormalizedPositionToOriginal called with position: ${normalizedPosition}`);
    console.log(
        `📝 Original text length: ${originalText.length}, Normalized text length: ${normalizedText.length}`,
    );

    // If the position is at the end of normalized text, map to end of original text
    if (normalizedPosition >= normalizedText.length) {
        console.log(
            `📍 Position at end of normalized text, mapping to end of original: ${originalText.length}`,
        );
        return originalText.length;
    }

    // Find the character at the normalized position
    const targetChar = normalizedText[normalizedPosition];
    console.log(`🎯 Target character at normalized position: "${targetChar}"`);

    // Find the first occurrence of this character in the original text
    // that corresponds to the normalized position
    let originalIndex = 0;
    let normalizedIndex = 0;

    while (originalIndex < originalText.length && normalizedIndex < normalizedText.length) {
        const originalChar = originalText[originalIndex];

        // If we've reached the target normalized position
        if (normalizedIndex === normalizedPosition) {
            console.log(`✅ Found target position in original text at index: ${originalIndex}`);
            console.log(`📝 Character at original position: "${originalChar}"`);
            return originalIndex;
        }

        // Move forward in both texts
        if (originalChar === normalizedText[normalizedIndex]) {
            originalIndex++;
            normalizedIndex++;
        } else {
            // Handle whitespace normalization
            if (/\s/.test(originalChar)) {
                originalIndex++;
                // Don't advance normalizedIndex for whitespace that gets normalized
            } else {
                originalIndex++;
                normalizedIndex++;
            }
        }
    }

    console.log(`❌ Failed to map normalized position ${normalizedPosition} to original text`);
    return -1;
}

/**
 * Load and filter phrases for specific content
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

        // If still no phrases found, fall back to loading all and filtering (legacy behavior)
        if (relevantPhrases.length === 0) {
            console.log("🔄 No phrases found by hash/source, falling back to full load and filter");
            const { loadAllPhrases } = await import("../db/phraseStore");
            const allPhrases = await loadAllPhrases();

            // Filter phrases that belong to the current content
            relevantPhrases = allPhrases.filter((phrase) => {
                // Match by content hash (preferred)
                if (phrase.contentHash === currentContentHash) {
                    console.log("✅ Phrase matched by content hash:", phrase.text);
                    return true;
                }
                // Match by source file (fallback)
                if (sourceFile && phrase.sourceFile === sourceFile) {
                    console.log("✅ Phrase matched by source file:", phrase.text);
                    return true;
                }
                console.log("❌ Phrase not matched:", phrase.text, {
                    phraseContentHash: phrase.contentHash,
                    currentContentHash,
                    phraseSourceFile: phrase.sourceFile,
                    currentSourceFile: sourceFile,
                });
                return false;
            });
        }

        console.log("📊 Phrase filtering results:", {
            relevantPhrases: relevantPhrases.length,
            currentContentHash,
            sourceFile,
        });

        // Debug: Show which phrases are being filtered out
        if (allPhrases.length > relevantPhrases.length) {
            const filteredOut = allPhrases.filter(
                (phrase) => !relevantPhrases.some((rp) => rp.id === phrase.id),
            );
            console.log(
                "❌ Filtered out phrases:",
                filteredOut.map((p) => ({
                    id: p.id,
                    text: p.text.substring(0, 50) + "...",
                    contentHash: p.contentHash,
                    sourceFile: p.sourceFile,
                    addedAt: p.addedAt,
                })),
            );
        }

        // If no phrases matched by content hash or source file, try to match by text content
        if (relevantPhrases.length === 0 && allPhrases.length > 0) {
            console.log("🔄 No phrases matched by hash/source, trying text-based matching...");
            const textMatchedPhrases = allPhrases.filter((phrase) => {
                // Normalize both phrase text and content for comparison
                const normalizedPhrase = phrase.text
                    .replace(/\r\n/g, "\n") // Normalize line endings
                    .replace(/\r/g, "\n") // Convert carriage returns to newlines
                    .replace(/\n+/g, " ") // Replace newlines with spaces
                    .replace(/\s+/g, " ") // Normalize whitespace
                    .trim();

                const normalizedContent = content
                    .replace(/\r\n/g, "\n") // Normalize line endings
                    .replace(/\r/g, "\n") // Convert carriage returns to newlines
                    .replace(/\n+/g, " ") // Replace newlines with spaces
                    .replace(/\s+/g, " ") // Normalize whitespace
                    .trim();

                // Try exact match first
                let found = normalizedContent
                    .toLowerCase()
                    .includes(normalizedPhrase.toLowerCase());

                // If not found, try using context for better matching
                if (!found && phrase.context) {
                    const contextText = phrase.context
                        .replace(/\r\n/g, "\n")
                        .replace(/\r/g, "\n")
                        .replace(/\n+/g, " ")
                        .replace(/\s+/g, " ")
                        .trim();

                    // Look for the phrase within its context
                    const contextStart = normalizedContent
                        .toLowerCase()
                        .indexOf(contextText.toLowerCase());
                    if (contextStart >= 0) {
                        const contextEnd = contextStart + contextText.length;
                        const contextSubstring = normalizedContent.substring(
                            contextStart,
                            contextEnd,
                        );
                        found = contextSubstring
                            .toLowerCase()
                            .includes(normalizedPhrase.toLowerCase());
                    }
                }

                if (found) {
                    console.log(
                        "✅ Phrase matched by text content:",
                        phrase.text.substring(0, 50) + "...",
                    );
                } else {
                    console.log(
                        "❌ Phrase not found in content:",
                        phrase.text.substring(0, 50) + "...",
                    );
                }
                return found;
            });

            if (textMatchedPhrases.length > 0) {
                console.log("📝 Found phrases by text matching:", textMatchedPhrases.length);
                relevantPhrases.push(...textMatchedPhrases);
            }
        }

        // If still no phrases found, try to match recently added phrases (last 5 minutes)
        if (relevantPhrases.length === 0 && allPhrases.length > 0) {
            console.log("🔄 No phrases matched, trying recently added phrases...");
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const recentPhrases = allPhrases.filter((phrase) => {
                const phraseDate = new Date(phrase.addedAt);
                const isRecent = phraseDate > new Date(fiveMinutesAgo);
                if (isRecent) {
                    console.log(
                        "🕒 Found recent phrase:",
                        phrase.text,
                        "added at:",
                        phrase.addedAt,
                    );
                }
                return isRecent;
            });

            if (recentPhrases.length > 0) {
                console.log("📝 Found recent phrases:", recentPhrases.length);
                relevantPhrases.push(...recentPhrases);
            }
        }

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
                        contentPreview: content.substring(
                            Math.max(0, position - 50),
                            position + 50,
                        ),
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
            .filter((phrase) => phrase.position >= 0)
            .sort((a, b) => a.position - b.position);

        // Debug: Show which phrases were lost due to position calculation
        const lostPhrases = relevantPhrases.filter(
            (phrase) => !phrasesWithPositions.some((pwp) => pwp.id === phrase.id),
        );
        if (lostPhrases.length > 0) {
            console.log(
                "❌ Phrases lost due to position calculation:",
                lostPhrases.map((p) => ({
                    id: p.id,
                    text: p.text.substring(0, 50) + "...",
                    position: calculatePhrasePosition(p, content),
                })),
            );
        }

        console.log("🎯 Final phrases with positions:", phrasesWithPositions.length, "phrases");

        return phrasesWithPositions;
    } catch (error) {
        console.error("Error loading phrases for content:", error);
        return [];
    }
}

/**
 * Sort phrases by position in text (reusable function)
 */
export function sortPhrasesByPosition(phrases: PhraseWithPosition[]): PhraseWithPosition[] {
    return [...phrases].sort((a, b) => a.position - b.position);
}

/**
 * Sort phrases by database line/column (for dictionary mode)
 */
export function sortPhrasesByLineColumn(
    phrases: Array<{ line_no: number; col_offset: number; position?: number }>,
): Array<{ line_no: number; col_offset: number; position?: number }> {
    return [...phrases].sort((a, b) => {
        const aLine = a.line_no;
        const aCol = a.col_offset;
        const bLine = b.line_no;
        const bCol = b.col_offset;

        // Use line_no * 100000 + col_offset for sorting
        if (
            typeof aLine === "number" &&
            typeof aCol === "number" &&
            typeof bLine === "number" &&
            typeof bCol === "number"
        ) {
            const keyA = aLine * 100000 + aCol;
            const keyB = bLine * 100000 + bCol;
            return keyA - keyB;
        }

        // Fallback to position-based sorting
        const posA = a.position ?? Number.MAX_SAFE_INTEGER;
        const posB = b.position ?? Number.MAX_SAFE_INTEGER;
        return posA - posB;
    });
}
