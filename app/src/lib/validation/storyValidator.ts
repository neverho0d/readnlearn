/**
 * Story Validator
 *
 * Validates generated stories for quality, coverage, and safety.
 * Ensures stories meet requirements for study sessions.
 */

export interface StoryValidationResult {
    valid: boolean;
    coverage: number;
    issues: string[];
    stats: {
        storyLength: number;
        phraseCount: number;
        missingPhrases: string[];
    };
}

/**
 * Validate a generated story
 */
export async function validateStory(
    story: { story: string; usedPhrases: string[] },
    requiredPhrases: string[],
): Promise<StoryValidationResult> {
    const issues: string[] = [];
    const storyText = story.story.toLowerCase();
    const usedPhrases = story.usedPhrases || [];

    // Check length
    const wordCount = story.story.split(/\s+/).length;
    if (wordCount < 80) {
        issues.push(`Story too short: ${wordCount} words (minimum 80)`);
    }
    if (wordCount > 150) {
        issues.push(`Story too long: ${wordCount} words (maximum 150)`);
    }

    // Check phrase coverage
    const missingPhrases: string[] = [];
    let foundPhrases = 0;

    for (const phrase of requiredPhrases) {
        const phraseLower = phrase.toLowerCase();
        let found = false;

        // Check if phrase is in usedPhrases
        if (usedPhrases.some((p) => p.toLowerCase() === phraseLower)) {
            found = true;
            foundPhrases++;
        } else {
            // Check if phrase appears in story text
            if (storyText.includes(phraseLower)) {
                found = true;
                foundPhrases++;
            }
        }

        if (!found) {
            missingPhrases.push(phrase);
        }
    }

    const coverage = requiredPhrases.length > 0 ? (foundPhrases / requiredPhrases.length) * 100 : 0;

    if (coverage < 100) {
        issues.push(`Missing phrases: ${missingPhrases.join(", ")}`);
    }

    // Check for safety issues (basic content filtering)
    const safetyIssues = checkContentSafety(story.story);
    issues.push(...safetyIssues);

    // Check for basic quality issues
    const qualityIssues = checkStoryQuality(story.story);
    issues.push(...qualityIssues);

    return {
        valid: issues.length === 0,
        coverage,
        issues,
        stats: {
            storyLength: wordCount,
            phraseCount: foundPhrases,
            missingPhrases,
        },
    };
}

/**
 * Check content safety
 */
function checkContentSafety(story: string): string[] {
    const issues: string[] = [];
    const storyLower = story.toLowerCase();

    // Basic content filtering
    const inappropriateWords = [
        "violence",
        "hate",
        "discrimination",
        "explicit",
        "inappropriate",
        "offensive",
        "harmful",
    ];

    for (const word of inappropriateWords) {
        if (storyLower.includes(word)) {
            issues.push(`Content safety concern: "${word}" detected`);
        }
    }

    // Check for excessive repetition
    const words = story.split(/\s+/);
    const wordCounts: Record<string, number> = {};

    for (const word of words) {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, "");
        if (cleanWord.length > 3) {
            wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
        }
    }

    for (const [word, count] of Object.entries(wordCounts)) {
        if (count > 5) {
            issues.push(`Excessive repetition: "${word}" appears ${count} times`);
        }
    }

    return issues;
}

/**
 * Check story quality
 */
function checkStoryQuality(story: string): string[] {
    const issues: string[] = [];

    // Check for proper sentence structure
    const sentences = story.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length < 3) {
        issues.push("Story too short: needs at least 3 sentences");
    }

    // Check for variety in sentence length
    const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;

    if (avgLength < 5) {
        issues.push("Sentences too short: average length below 5 words");
    }

    // Check for proper punctuation
    if (!story.match(/[.!?]$/)) {
        issues.push("Story should end with proper punctuation");
    }

    // Check for basic readability
    const words = story.split(/\s+/);
    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
    const diversity = uniqueWords.size / words.length;

    if (diversity < 0.3) {
        issues.push("Low vocabulary diversity: story may be too repetitive");
    }

    return issues;
}
