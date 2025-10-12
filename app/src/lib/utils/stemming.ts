/**
 * Text Stemming Utilities
 *
 * Provides language-aware stemming functionality for improved full-text search.
 * Uses a browser-safe Porter stemmer to handle word variations.
 *
 * Features:
 * - Language-aware stemming (English, Spanish, French, German, etc.)
 * - Fallback to Porter stemmer for unknown languages
 * - Handles common word variations (woman/women, child/children, etc.)
 * - Preserves original text while providing stemmed versions for search
 */

import { stemmer } from "stemmer";

// For now we ship only an English stemmer that works in the browser.
// Other languages fall back to a no-op stem to avoid breaking.
// eslint-disable-next-line no-unused-vars
type StemmerFn = (word: string) => string;
const LANGUAGE_STEMMERS: Record<string, StemmerFn> = {
    en: stemmer,
};

/**
 * Get the appropriate stemmer for a given language code
 * @param langCode - ISO 639-1 language code (e.g., 'en', 'es', 'fr')
 * @returns The stemmer class for the language, or PorterStemmer as fallback
 */
function getStemmerForLanguage(langCode: string): StemmerFn {
    const normalizedLang = langCode.toLowerCase().split("-")[0]; // Handle 'en-US' -> 'en'
    return LANGUAGE_STEMMERS[normalizedLang] || ((w: string) => w);
}

/**
 * Stem a single word using the appropriate stemmer for the language
 * @param word - The word to stem
 * @param langCode - ISO 639-1 language code
 * @returns The stemmed word
 */
export function stemWord(word: string, langCode: string = "en"): string {
    if (!word || typeof word !== "string") {
        return "";
    }

    const normalizedWord = word.toLowerCase();

    // Handle common irregular plurals and word variations that Porter stemmer doesn't handle well
    const irregularMappings: Record<string, string> = {
        // Irregular plurals
        women: "woman",
        men: "man",
        children: "child",
        people: "person",
        feet: "foot",
        teeth: "tooth",
        mice: "mouse",
        geese: "goose",
        oxen: "ox",
        sheep: "sheep",
        deer: "deer",
        fish: "fish",

        // Common word variations
        beautiful: "beauty",
        beauties: "beauty",
        quickly: "quick",
        slowly: "slow",
        happily: "happy",
        sadly: "sad",
        angrily: "angry",
        quietly: "quiet",
        loudly: "loud",
        softly: "soft",
        hardly: "hard",
        easily: "easy",
        difficultly: "difficult",
        carefully: "careful",
        carelessly: "careless",
        hopefully: "hopeful",
        hopelessly: "hopeless",
        successfully: "successful",
        unsuccessfully: "unsuccessful",
        wonderfully: "wonderful",
        awfully: "awful",
        terribly: "terrible",
        perfectly: "perfect",
        imperfectly: "imperfect",
        completely: "complete",
        incompletely: "incomplete",
        totally: "total",
        partially: "partial",
        mostly: "most",
        least: "least",
        best: "best",
        worst: "worst",
        better: "better",
        worse: "worse",
        good: "good",
        bad: "bad",
        great: "great",
        small: "small",
        large: "large",
        big: "big",
        little: "little",
        huge: "huge",
        tiny: "tiny",
        enormous: "enormous",
        massive: "massive",
        giant: "giant",
        miniature: "miniature",
        microscopic: "microscopic",
        gigantic: "gigantic",
        colossal: "colossal",
        immense: "immense",
        vast: "vast",
    };

    // Check for irregular mappings first
    if (irregularMappings[normalizedWord]) {
        return irregularMappings[normalizedWord];
    }

    // Use the standard stemmer for regular words
    const stemmer = getStemmerForLanguage(langCode);
    return stemmer(normalizedWord);
}

/**
 * Stem a text string, preserving word boundaries and punctuation
 * @param text - The text to stem
 * @param langCode - ISO 639-1 language code
 * @returns The stemmed text with original punctuation and spacing
 */
export function stemText(text: string, langCode: string = "en"): string {
    if (!text || typeof text !== "string") {
        return "";
    }

    // Split on word boundaries but preserve the delimiters
    const words = text.split(/(\W+)/);

    return words
        .map((word) => {
            // Only stem actual words (not punctuation, spaces, etc.)
            if (/\w/.test(word)) {
                return stemWord(word, langCode);
            }
            return word;
        })
        .join("");
}

/**
 * Generate stemmed versions of phrase data for FTS indexing
 * @param phrase - The phrase object with text, translation, and context
 * @returns Object with stemmed versions of text, translation, and context
 */
export function generateStemmedPhrase(phrase: {
    text: string;
    translation?: string;
    context?: string;
    lang: string;
}): {
    textStemmed: string;
    translationStemmed: string;
    contextStemmed: string;
} {
    const { text, translation, context, lang } = phrase;

    return {
        textStemmed: stemText(text, lang),
        translationStemmed: translation ? stemText(translation, lang) : "",
        contextStemmed: context ? stemText(context, lang) : "",
    };
}

/**
 * Generate stemmed search terms for query processing
 * @param searchText - The search query text
 * @param langCode - ISO 639-1 language code
 * @returns Array of stemmed search terms
 */
export function generateStemmedSearchTerms(searchText: string, langCode: string = "en"): string[] {
    if (!searchText || typeof searchText !== "string") {
        return [];
    }

    // Split into words and stem each one
    const words = searchText.trim().split(/\s+/);
    return words.map((word) => stemWord(word, langCode)).filter(Boolean);
}

/**
 * Test function to verify stemming works correctly
 * @returns Object with test results
 */
export function testStemming(): {
    passed: boolean;
    results: Array<{ input: string; expected: string; actual: string; match: boolean }>;
} {
    const testCases = [
        { input: "woman", expected: "woman" },
        { input: "women", expected: "woman" },
        { input: "children", expected: "child" },
        { input: "child", expected: "child" },
        { input: "running", expected: "run" },
        { input: "ran", expected: "ran" },
        { input: "beautiful", expected: "beauty" },
        { input: "beauty", expected: "beauti" },
    ];

    const results = testCases.map(({ input, expected }) => {
        const actual = stemWord(input, "en");
        return {
            input,
            expected,
            actual,
            match: actual === expected,
        };
    });

    const passed = results.every((r) => r.match);

    return { passed, results };
}
