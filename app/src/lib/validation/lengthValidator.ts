/**
 * Length Validator
 *
 * Ensures that generated stories meet length requirements.
 * Stories should be 80-150 words to maintain engagement while
 * being concise enough for effective learning.
 */

export interface LengthResult {
    valid: boolean;
    wordCount: number;
    targetMin: number;
    targetMax: number;
    issues: string[];
    suggestions: string[];
}

export interface Story {
    story: string;
    usedPhrases: Array<{
        phrase: string;
        position: number;
        gloss: string;
    }>;
}

export interface LengthConfig {
    minWords: number;
    maxWords: number;
    strictMode: boolean; // If true, reject stories outside range
    allowFlexibility: boolean; // If true, allow ±10% flexibility
}

export const DEFAULT_LENGTH_CONFIG: LengthConfig = {
    minWords: 80,
    maxWords: 150,
    strictMode: false,
    allowFlexibility: true,
};

/**
 * Validate story length
 */
export function validateLength(
    story: Story,
    config: LengthConfig = DEFAULT_LENGTH_CONFIG,
): LengthResult {
    const wordCount = countWords(story.story);
    const issues: string[] = [];
    const suggestions: string[] = [];

    let targetMin = config.minWords;
    let targetMax = config.maxWords;

    // Apply flexibility if enabled
    if (config.allowFlexibility) {
        const flexibility = 0.1; // 10% flexibility
        targetMin = Math.floor(config.minWords * (1 - flexibility));
        targetMax = Math.ceil(config.maxWords * (1 + flexibility));
    }

    // Check if length is valid
    const isValid = wordCount >= targetMin && wordCount <= targetMax;

    if (!isValid) {
        if (wordCount < targetMin) {
            issues.push(`Story is too short: ${wordCount} words (minimum: ${targetMin})`);
            suggestions.push("Add more descriptive details or examples");
            suggestions.push("Include more context around the phrases");
        } else if (wordCount > targetMax) {
            issues.push(`Story is too long: ${wordCount} words (maximum: ${targetMax})`);
            suggestions.push("Remove unnecessary words or phrases");
            suggestions.push("Combine sentences to reduce word count");
        }
    }

    // Check for optimal length
    const optimalMin = config.minWords;
    const optimalMax = config.maxWords;

    if (wordCount < optimalMin) {
        suggestions.push(
            `Consider expanding to ${optimalMin}-${optimalMax} words for better engagement`,
        );
    } else if (wordCount > optimalMax) {
        suggestions.push(
            `Consider condensing to ${optimalMin}-${optimalMax} words for better focus`,
        );
    }

    // Check for readability
    const readabilityIssues = checkReadability(story.story);
    if (readabilityIssues.length > 0) {
        issues.push(...readabilityIssues);
    }

    return {
        valid: isValid,
        wordCount,
        targetMin,
        targetMax,
        issues,
        suggestions,
    };
}

/**
 * Count words in text
 */
function countWords(text: string): number {
    // Remove extra whitespace and split by spaces
    const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);
    return words.length;
}

/**
 * Check readability of the story
 */
function checkReadability(text: string): string[] {
    const issues: string[] = [];

    // Check for very long sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const longSentences = sentences.filter((s) => countWords(s) > 25);

    if (longSentences.length > 0) {
        issues.push(`Found ${longSentences.length} sentences longer than 25 words`);
    }

    // Check for very short sentences
    const shortSentences = sentences.filter((s) => countWords(s) < 3);

    if (shortSentences.length > 0) {
        issues.push(`Found ${shortSentences.length} sentences shorter than 3 words`);
    }

    // Check for repetitive words
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();

    for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    const repetitiveWords = Array.from(wordCounts.entries())
        .filter(([word, count]) => count > 3 && word.length > 3)
        .map(([word]) => word);

    if (repetitiveWords.length > 0) {
        issues.push(`Repetitive words found: ${repetitiveWords.join(", ")}`);
    }

    return issues;
}

/**
 * Get length statistics
 */
export function getLengthStats(story: Story): {
    wordCount: number;
    characterCount: number;
    sentenceCount: number;
    averageWordsPerSentence: number;
    averageCharactersPerWord: number;
    readabilityScore: number;
} {
    const wordCount = countWords(story.story);
    const characterCount = story.story.length;
    const sentences = story.story.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const averageCharactersPerWord = wordCount > 0 ? characterCount / wordCount : 0;

    // Simple readability score (0-100, higher is better)
    const readabilityScore = calculateReadabilityScore(story.story);

    return {
        wordCount,
        characterCount,
        sentenceCount,
        averageWordsPerSentence,
        averageCharactersPerWord,
        readabilityScore,
    };
}

/**
 * Calculate simple readability score
 */
function calculateReadabilityScore(text: string): number {
    const words = countWords(text);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = sentences.length;

    if (sentenceCount === 0) return 0;

    const averageWordsPerSentence = words / sentenceCount;

    // Simple scoring: prefer 10-20 words per sentence
    let score = 100;

    if (averageWordsPerSentence < 10) {
        score -= (10 - averageWordsPerSentence) * 5;
    } else if (averageWordsPerSentence > 20) {
        score -= (averageWordsPerSentence - 20) * 3;
    }

    // Penalize very long or very short stories
    if (words < 50) {
        score -= 20;
    } else if (words > 200) {
        score -= 15;
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Suggest length improvements
 */
export function suggestLengthImprovements(
    story: Story,
    config: LengthConfig = DEFAULT_LENGTH_CONFIG,
): string[] {
    const wordCount = countWords(story.story);
    const suggestions: string[] = [];

    if (wordCount < config.minWords) {
        suggestions.push("Add more descriptive details to expand the story");
        suggestions.push("Include more context around each phrase");
        suggestions.push("Add transitional sentences between phrases");
        suggestions.push("Include examples or explanations");
    } else if (wordCount > config.maxWords) {
        suggestions.push("Remove unnecessary adjectives and adverbs");
        suggestions.push("Combine short sentences");
        suggestions.push("Remove redundant phrases");
        suggestions.push("Focus on the most important details");
    }

    // General suggestions
    suggestions.push("Ensure each sentence serves a purpose");
    suggestions.push("Maintain consistent tone throughout");
    suggestions.push("Use varied sentence structures");

    return suggestions;
}

/**
 * Validate length with retry logic
 */
export function validateLengthWithRetry(
    story: Story,
    config: LengthConfig = DEFAULT_LENGTH_CONFIG,
    maxRetries: number = 2,
): LengthResult {
    let result = validateLength(story, config);
    let retries = 0;

    while (!result.valid && retries < maxRetries) {
        // Apply suggestions to improve length
        const improvedStory = applyLengthSuggestions(story, result.suggestions);
        result = validateLength(improvedStory, config);
        retries++;
    }

    return result;
}

/**
 * Apply length suggestions to improve story
 */
function applyLengthSuggestions(story: Story, suggestions: string[]): Story {
    // This is a simplified implementation
    // In practice, you would use AI to rewrite the story based on suggestions
    return story;
}
