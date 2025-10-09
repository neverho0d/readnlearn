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
    // 1) Exact match in original text
    let position = text.indexOf(phrase.text);
    if (position >= 0) return position;

    // 2) Case-insensitive match
    position = text.toLowerCase().indexOf(phrase.text.toLowerCase());
    if (position >= 0) return position;

    // 3) Use saved line/column position as fallback
    if (phrase.lineNo !== undefined && phrase.colOffset !== undefined) {
        const lines = text.split(/\n/);
        const lineIndex = Math.max(0, Math.min(lines.length - 1, (phrase.lineNo || 1) - 1));
        const before = lines.slice(0, lineIndex).join("\n");
        return before.length + (lineIndex > 0 ? 1 : 0) + (phrase.colOffset || 0);
    }

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
        const allPhrases = await loadAllPhrases();
        const currentContentHash = contentHash || generateContentHash(content);

        // Filter phrases that belong to the current content
        const relevantPhrases = allPhrases.filter((phrase) => {
            // Match by content hash (preferred)
            if (phrase.contentHash === currentContentHash) {
                return true;
            }
            // Match by source file (fallback)
            if (sourceFile && phrase.sourceFile === sourceFile) {
                return true;
            }
            return false;
        });

        // Calculate positions and filter out phrases not found in text
        const phrasesWithPositions = relevantPhrases
            .map((phrase) => {
                const position = calculatePhrasePosition(phrase, content);
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
