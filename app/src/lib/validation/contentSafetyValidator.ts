/**
 * Content Safety Validator
 *
 * Ensures that generated stories are appropriate and safe for learning.
 * Checks for inappropriate content, bias, and other safety concerns.
 */

export interface SafetyResult {
    valid: boolean;
    safetyScore: number; // 0-100, higher is safer
    issues: string[];
    warnings: string[];
    suggestions: string[];
    flaggedContent: string[];
}

export interface Story {
    story: string;
    usedPhrases: Array<{
        phrase: string;
        position: number;
        gloss: string;
    }>;
}

export interface SafetyConfig {
    strictMode: boolean; // If true, reject any flagged content
    checkBias: boolean; // Check for bias and stereotypes
    checkViolence: boolean; // Check for violent content
    checkAdult: boolean; // Check for adult content
    checkHate: boolean; // Check for hate speech
    checkSpam: boolean; // Check for spam-like content
}

export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
    strictMode: false,
    checkBias: true,
    checkViolence: true,
    checkAdult: true,
    checkHate: true,
    checkSpam: true,
};

/**
 * Validate content safety
 */
export function validateSafety(
    story: Story,
    config: SafetyConfig = DEFAULT_SAFETY_CONFIG,
): SafetyResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const flaggedContent: string[] = [];

    let safetyScore = 100;

    // Check for inappropriate content
    if (config.checkViolence) {
        const violenceIssues = checkViolence(story.story);
        if (violenceIssues.length > 0) {
            issues.push(...violenceIssues);
            flaggedContent.push(...violenceIssues);
            safetyScore -= 20;
        }
    }

    if (config.checkAdult) {
        const adultIssues = checkAdultContent(story.story);
        if (adultIssues.length > 0) {
            issues.push(...adultIssues);
            flaggedContent.push(...adultIssues);
            safetyScore -= 30;
        }
    }

    if (config.checkHate) {
        const hateIssues = checkHateSpeech(story.story);
        if (hateIssues.length > 0) {
            issues.push(...hateIssues);
            flaggedContent.push(...hateIssues);
            safetyScore -= 40;
        }
    }

    if (config.checkBias) {
        const biasIssues = checkBias(story.story);
        if (biasIssues.length > 0) {
            warnings.push(...biasIssues);
            safetyScore -= 10;
        }
    }

    if (config.checkSpam) {
        const spamIssues = checkSpam(story.story);
        if (spamIssues.length > 0) {
            issues.push(...spamIssues);
            flaggedContent.push(...spamIssues);
            safetyScore -= 15;
        }
    }

    // Check for general appropriateness
    const appropriatenessIssues = checkAppropriateness(story.story);
    if (appropriatenessIssues.length > 0) {
        warnings.push(...appropriatenessIssues);
        safetyScore -= 5;
    }

    // Generate suggestions
    if (issues.length > 0) {
        suggestions.push("Review and revise the content to remove inappropriate elements");
        suggestions.push("Use neutral, educational language");
        suggestions.push("Focus on positive, constructive examples");
    }

    if (warnings.length > 0) {
        suggestions.push("Consider alternative phrasing to avoid potential issues");
        suggestions.push("Ensure content is inclusive and respectful");
    }

    const isValid = config.strictMode ? issues.length === 0 : safetyScore >= 70;

    return {
        valid: isValid,
        safetyScore: Math.max(0, safetyScore),
        issues,
        warnings,
        suggestions,
        flaggedContent,
    };
}

/**
 * Check for violent content
 */
function checkViolence(text: string): string[] {
    const violenceKeywords = [
        "kill",
        "murder",
        "death",
        "die",
        "dead",
        "blood",
        "violence",
        "fight",
        "war",
        "attack",
        "hurt",
        "pain",
        "suffer",
        "torture",
        "destroy",
        "damage",
        "harm",
    ];

    const issues: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of violenceKeywords) {
        if (lowerText.includes(keyword)) {
            issues.push(`Violent content detected: "${keyword}"`);
        }
    }

    return issues;
}

/**
 * Check for adult content
 */
function checkAdultContent(text: string): string[] {
    const adultKeywords = [
        "sex",
        "sexual",
        "nude",
        "naked",
        "porn",
        "adult",
        "explicit",
        "intimate",
        "romance",
        "love",
        "relationship",
        "marriage",
        "divorce",
        "family",
    ];

    const issues: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of adultKeywords) {
        if (lowerText.includes(keyword)) {
            issues.push(`Adult content detected: "${keyword}"`);
        }
    }

    return issues;
}

/**
 * Check for hate speech
 */
function checkHateSpeech(text: string): string[] {
    const hateKeywords = [
        "hate",
        "stupid",
        "idiot",
        "moron",
        "dumb",
        "ugly",
        "fat",
        "lazy",
        "discrimination",
        "racist",
        "sexist",
        "homophobic",
        "prejudice",
    ];

    const issues: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of hateKeywords) {
        if (lowerText.includes(keyword)) {
            issues.push(`Hate speech detected: "${keyword}"`);
        }
    }

    return issues;
}

/**
 * Check for bias and stereotypes
 */
function checkBias(text: string): string[] {
    const biasPatterns = [
        { pattern: /women are/g, message: "Gender stereotype detected" },
        { pattern: /men are/g, message: "Gender stereotype detected" },
        { pattern: /old people/g, message: "Age stereotype detected" },
        { pattern: /young people/g, message: "Age stereotype detected" },
        { pattern: /all \w+ are/g, message: "Generalization detected" },
    ];

    const warnings: string[] = [];

    for (const { pattern, message } of biasPatterns) {
        if (pattern.test(text)) {
            warnings.push(message);
        }
    }

    return warnings;
}

/**
 * Check for spam-like content
 */
function checkSpam(text: string): string[] {
    const issues: string[] = [];

    // Check for excessive repetition
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();

    for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    const repetitiveWords = Array.from(wordCounts.entries())
        .filter(([word, count]) => count > 5 && word.length > 3)
        .map(([word]) => word);

    if (repetitiveWords.length > 0) {
        issues.push(`Excessive repetition: ${repetitiveWords.join(", ")}`);
    }

    // Check for excessive capitalization
    const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (upperCaseRatio > 0.3) {
        issues.push("Excessive capitalization detected");
    }

    // Check for excessive punctuation
    const punctuationRatio = (text.match(/[!?]{2,}/g) || []).length;
    if (punctuationRatio > 2) {
        issues.push("Excessive punctuation detected");
    }

    return issues;
}

/**
 * Check for general appropriateness
 */
function checkAppropriateness(text: string): string[] {
    const warnings: string[] = [];

    // Check for negative sentiment
    const negativeWords = ["bad", "terrible", "awful", "horrible", "disgusting", "hate"];
    const lowerText = text.toLowerCase();

    const negativeCount = negativeWords.filter((word) => lowerText.includes(word)).length;
    if (negativeCount > 2) {
        warnings.push("Negative sentiment detected");
    }

    // Check for controversial topics
    const controversialTopics = ["politics", "religion", "money", "wealth", "poverty"];
    const topicCount = controversialTopics.filter((topic) => lowerText.includes(topic)).length;
    if (topicCount > 1) {
        warnings.push("Controversial topics detected");
    }

    return warnings;
}

/**
 * Get safety statistics
 */
export function getSafetyStats(story: Story): {
    wordCount: number;
    sentenceCount: number;
    averageWordsPerSentence: number;
    sentimentScore: number; // -1 to 1, negative to positive
    complexityScore: number; // 0-100, simple to complex
    safetyScore: number; // 0-100, unsafe to safe
} {
    const wordCount = story.story.split(/\s+/).length;
    const sentenceCount = story.story.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
    const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

    const sentimentScore = calculateSentiment(story.story);
    const complexityScore = calculateComplexity(story.story);
    const safetyScore = calculateSafetyScore(story.story);

    return {
        wordCount,
        sentenceCount,
        averageWordsPerSentence,
        sentimentScore,
        complexityScore,
        safetyScore,
    };
}

/**
 * Calculate sentiment score
 */
function calculateSentiment(text: string): number {
    const positiveWords = [
        "good",
        "great",
        "excellent",
        "wonderful",
        "amazing",
        "fantastic",
        "love",
        "happy",
        "joy",
    ];
    const negativeWords = [
        "bad",
        "terrible",
        "awful",
        "horrible",
        "hate",
        "sad",
        "angry",
        "frustrated",
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
        if (positiveWords.includes(word)) positiveCount++;
        if (negativeWords.includes(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    if (total === 0) return 0;

    return (positiveCount - negativeCount) / total;
}

/**
 * Calculate complexity score
 */
function calculateComplexity(text: string): number {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (sentences.length === 0) return 0;

    const averageWordsPerSentence = words.length / sentences.length;
    const averageWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

    // Simple complexity calculation
    let complexity = 0;
    complexity += Math.min(averageWordsPerSentence / 20, 1) * 40; // Sentence length
    complexity += Math.min(averageWordLength / 8, 1) * 30; // Word length
    complexity += Math.min((text.match(/[.!?]/g) || []).length / 10, 1) * 30; // Punctuation variety

    return Math.min(100, complexity);
}

/**
 * Calculate safety score
 */
function calculateSafetyScore(text: string): number {
    const result = validateSafety({ story: text, usedPhrases: [] });
    return result.safetyScore;
}
