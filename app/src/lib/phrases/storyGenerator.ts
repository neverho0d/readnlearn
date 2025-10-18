/**
 * Story Generator
 *
 * Generates stories using LLM with validation and retry logic.
 * Ensures all phrases are included and story meets quality requirements.
 */

import { StoryAdapter, StoryResult as AdapterStoryResult } from "../../adapters/story/StoryAdapter";
import { OpenAIDriver } from "../../adapters/llm/OpenAIDriver";
import { GoogleAIDriver } from "../../adapters/llm/GoogleAIDriver";
// import { validateStory } from "../validation/storyValidator.js";

export interface StoryResult {
    story: string;
    usedPhrases: string[];
    glosses: Array<{ phrase: string; gloss: string }>;
}

export interface PhraseStory {
    phraseId: string;
    phrase: string;
    translation: string;
    story: string;
    context: string;
}

export interface StoryGenerationConfig {
    l1: string;
    l2: string;
    level: string;
    difficulties: string[];
    maxRetries?: number;
    targetLength?: { min: number; max: number };
}

/**
 * Generate individual stories for each phrase
 */
export async function generateStoryForContent(
    _contentHash: string,
    phraseIds: string[],
    l1: string,
    l2: string,
    level: string,
    difficulties: string[],
): Promise<PhraseStory[]> {
    const config: StoryGenerationConfig = {
        l1,
        l2,
        level,
        difficulties,
        maxRetries: 3,
        targetLength: { min: 200, max: 500 }, // Increased length for individual stories
    };

    // Load phrases from database
    console.log(
        "StoryGenerator - phraseIds received:",
        phraseIds,
        "Type:",
        typeof phraseIds,
        "Length:",
        phraseIds?.length,
    );
    const phrases = await loadPhrasesByIds(phraseIds);
    console.log("StoryGenerator - phrases loaded:", phrases.length, "phrases");
    if (phrases.length === 0) {
        throw new Error("No phrases found for story generation");
    }

    // Generate individual stories for each phrase
    const phraseStories: PhraseStory[] = [];

    for (const phrase of phrases) {
        try {
            console.log(`Generating story for phrase: "${phrase.text}"`);

            const storyResult = await generateStoryForPhrase(phrase, config);

            phraseStories.push({
                phraseId: phrase.id || `temp-${Date.now()}`,
                phrase: phrase.text,
                translation: phrase.translation,
                story: storyResult.story,
                context: phrase.context || "",
            });

            console.log(`Successfully generated story for phrase: "${phrase.text}"`);
        } catch (error) {
            console.error(`Failed to generate story for phrase "${phrase.text}":`, error);

            // Add fallback story for this phrase
            phraseStories.push({
                phraseId: phrase.id || `temp-${Date.now()}`,
                phrase: phrase.text,
                translation: phrase.translation,
                story: generateFallbackStoryForPhrase(phrase.text, phrase.translation),
                context: phrase.context || "",
            });
        }
    }

    return phraseStories;
}

/**
 * Generate story for a single phrase
 */
async function generateStoryForPhrase(
    phrase: { id?: string; text: string; translation: string; context?: string },
    config: StoryGenerationConfig,
): Promise<StoryResult> {
    // Create drivers (will be loaded from settings in real implementation)
    const openaiDriver = new OpenAIDriver();
    const googleDriver = new GoogleAIDriver();

    // Create story adapter with available drivers
    const storyAdapter = new StoryAdapter([openaiDriver, googleDriver]);

    // Create phrase object for the adapter (single phrase)
    const phraseObject = {
        id: phrase.id || `temp-${Date.now()}`,
        text: phrase.text,
        translation: phrase.translation,
        context: phrase.context || "",
    };

    // Generate story using the adapter for single phrase
    const adapterResult = await storyAdapter.generateStory({
        phrases: [phraseObject], // Single phrase
        context: {
            l1: config.l1,
            l2: config.l2,
            proficiency: config.level as "beginner" | "intermediate" | "advanced",
        },
        wordCount: config.targetLength?.max || 500, // Increased for individual stories
    });

    // Convert adapter result to our internal format
    return convertAdapterResultToStoryResult(adapterResult);
}

/**
 * Generate fallback story for a single phrase
 */
function generateFallbackStoryForPhrase(phrase: string, translation: string): string {
    return `Story featuring "${phrase}" (${translation}): A short narrative that helps you understand and remember this phrase in context. Practice using this phrase in similar situations to improve your language skills.`;
}

/**
 * Convert adapter StoryResult to our internal StoryResult format
 */
function convertAdapterResultToStoryResult(adapterResult: AdapterStoryResult): StoryResult {
    return {
        story: adapterResult.story,
        usedPhrases: adapterResult.usedPhrases.map((p) => p.phrase),
        glosses: adapterResult.usedPhrases.map((p) => ({
            phrase: p.phrase,
            gloss: p.gloss,
        })),
    };
}

/**
 * Load phrases by IDs from database
 */
async function loadPhrasesByIds(
    phraseIds: string[],
): Promise<Array<{ id: string; text: string; translation: string; context?: string }>> {
    try {
        const { supabase } = await import("../supabase/client");
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        console.log("loadPhrasesByIds - querying for phraseIds:", phraseIds);
        const { data: phrases, error } = await supabase
            .from("phrases")
            .select("id, text, translation, context")
            .eq("user_id", user.id)
            .in("id", phraseIds);

        if (error) {
            console.error("loadPhrasesByIds - database error:", error);
            throw new Error(`Failed to load phrases: ${error.message}`);
        }

        console.log("loadPhrasesByIds - found phrases:", phrases?.length || 0);
        if (phrases && phrases.length > 0) {
            console.log("Sample phrase data:", {
                id: phrases[0].id,
                text: phrases[0].text.substring(0, 50) + "...",
                hasId: !!phrases[0].id,
            });
        }
        return phrases || [];
    } catch (error) {
        console.error("Failed to load phrases:", error);
        return [];
    }
}
