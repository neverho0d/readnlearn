/**
 * Coverage Validator
 *
 * Ensures that generated stories include all required phrases.
 * This is critical for the learning experience as missing phrases
 * would make the story less effective for study.
 */

export interface CoverageResult {
    valid: boolean;
    coverage: number; // Percentage of phrases included (0-1)
    missingPhrases: string[];
    includedPhrases: string[];
    issues: string[];
}

export interface Phrase {
    id: string;
    text: string;
    translation?: string;
}

export interface Story {
    story: string;
    usedPhrases: Array<{
        phrase: string;
        position: number;
        gloss: string;
    }>;
}

/**
 * Validate that a story includes all required phrases
 */
export function validateCoverage(phrases: Phrase[], story: Story): CoverageResult {
    const requiredPhrases = phrases.map((p) => p.text.toLowerCase().trim());
    const storyText = story.story.toLowerCase();

    const includedPhrases: string[] = [];
    const missingPhrases: string[] = [];
    const issues: string[] = [];

    // Check each required phrase
    for (const phrase of requiredPhrases) {
        if (storyText.includes(phrase)) {
            includedPhrases.push(phrase);
        } else {
            missingPhrases.push(phrase);
        }
    }

    // Calculate coverage percentage
    const coverage = includedPhrases.length / requiredPhrases.length;

    // Check for issues
    if (coverage < 1.0) {
        issues.push(`Missing ${missingPhrases.length} required phrases`);
    }

    if (coverage === 0) {
        issues.push("No required phrases found in story");
    }

    // Check for partial matches (phrases that are partially included)
    const partialMatches = findPartialMatches(requiredPhrases, storyText);
    if (partialMatches.length > 0) {
        issues.push(`Found ${partialMatches.length} partial phrase matches`);
    }

    // Check for phrase order (phrases should appear in logical order)
    const orderIssues = checkPhraseOrder(story.usedPhrases);
    if (orderIssues.length > 0) {
        issues.push(`Phrase order issues: ${orderIssues.join(", ")}`);
    }

    return {
        valid: coverage >= 1.0,
        coverage,
        missingPhrases,
        includedPhrases,
        issues,
    };
}

/**
 * Find partial matches for phrases
 */
function findPartialMatches(phrases: string[], storyText: string): string[] {
    const partialMatches: string[] = [];

    for (const phrase of phrases) {
        const words = phrase.split(" ");
        if (words.length > 1) {
            // Check if any individual words from the phrase appear
            const foundWords = words.filter((word) => storyText.includes(word));
            if (foundWords.length > 0 && foundWords.length < words.length) {
                partialMatches.push(phrase);
            }
        }
    }

    return partialMatches;
}

/**
 * Check if phrases appear in logical order
 */
function checkPhraseOrder(usedPhrases: Array<{ phrase: string; position: number }>): string[] {
    const issues: string[] = [];

    // Sort used phrases by position
    const sortedUsedPhrases = usedPhrases.sort((a, b) => a.position - b.position);

    // Check if phrases appear in the order they were provided
    let lastPosition = -1;
    for (const usedPhrase of sortedUsedPhrases) {
        if (usedPhrase.position <= lastPosition) {
            issues.push(`Phrase "${usedPhrase.phrase}" appears out of order`);
        }
        lastPosition = usedPhrase.position;
    }

    return issues;
}

/**
 * Validate coverage with fuzzy matching for typos
 */
export function validateCoverageFuzzy(
    phrases: Phrase[],
    story: Story,
    threshold: number = 0.8,
): CoverageResult {
    const requiredPhrases = phrases.map((p) => p.text.toLowerCase().trim());
    const storyText = story.story.toLowerCase();

    const includedPhrases: string[] = [];
    const missingPhrases: string[] = [];
    const issues: string[] = [];

    // Check each required phrase with fuzzy matching
    for (const phrase of requiredPhrases) {
        if (storyText.includes(phrase)) {
            includedPhrases.push(phrase);
        } else {
            // Try fuzzy matching
            const fuzzyMatch = findFuzzyMatch(phrase, storyText, threshold);
            if (fuzzyMatch) {
                includedPhrases.push(phrase);
                issues.push(`Fuzzy match found for "${phrase}": "${fuzzyMatch}"`);
            } else {
                missingPhrases.push(phrase);
            }
        }
    }

    const coverage = includedPhrases.length / requiredPhrases.length;

    return {
        valid: coverage >= 1.0,
        coverage,
        missingPhrases,
        includedPhrases,
        issues,
    };
}

/**
 * Find fuzzy match for a phrase
 */
function findFuzzyMatch(phrase: string, text: string, threshold: number): string | null {
    const words = phrase.split(" ");
    const textWords = text.split(" ");

    for (let i = 0; i <= textWords.length - words.length; i++) {
        const candidate = textWords.slice(i, i + words.length).join(" ");
        const similarity = calculateSimilarity(phrase, candidate);

        if (similarity >= threshold) {
            return candidate;
        }
    }

    return null;
}

/**
 * Calculate similarity between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
        .fill(null)
        .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1, // deletion
                matrix[j - 1][i] + 1, // insertion
                matrix[j - 1][i - 1] + indicator, // substitution
            );
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Get coverage statistics
 */
export function getCoverageStats(
    phrases: Phrase[],
    story: Story,
): {
    totalPhrases: number;
    includedPhrases: number;
    missingPhrases: number;
    coveragePercentage: number;
    averagePhraseLength: number;
    storyLength: number;
} {
    const result = validateCoverage(phrases, story);
    const totalPhrases = phrases.length;
    const includedPhrases = result.includedPhrases.length;
    const missingPhrases = result.missingPhrases.length;
    const coveragePercentage = Math.round(result.coverage * 100);

    const averagePhraseLength =
        phrases.reduce((sum, phrase) => sum + phrase.text.length, 0) / phrases.length;
    const storyLength = story.story.length;

    return {
        totalPhrases,
        includedPhrases,
        missingPhrases,
        coveragePercentage,
        averagePhraseLength,
        storyLength,
    };
}
