/**
 * Story Generation Service (Dictionary Only)
 *
 * Generates contextual stories for phrases on-demand.
 * Used only in dictionary mode via phrase dropdown menu.
 */

import { supabase } from "../supabase/client";
import { StoryAdapter } from "../../adapters/story/StoryAdapter";
import { OpenAIDriver } from "../../adapters/llm/OpenAIDriver";
import { GoogleAIDriver } from "../../adapters/llm/GoogleAIDriver";

export interface PhraseStory {
    id: string;
    user_id: string;
    content_hash: string;
    phrase_id: string;
    phrase: string;
    translation: string;
    story: string;
    context: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface StoryGenerationRequest {
    phraseId: string;
    action: "generate" | "regenerate" | "append";
}

/**
 * Generate story for a phrase
 */
export async function generateStoryForPhrase(
    phraseId: string,
    action: "generate" | "regenerate" | "append" = "generate",
): Promise<PhraseStory> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get phrase data
    const { data: phrase, error: phraseError } = await supabase
        .from("phrases")
        .select("id, text, translation, context")
        .eq("id", phraseId)
        .eq("user_id", user.id)
        .single();

    if (phraseError || !phrase) {
        throw new Error(`Failed to load phrase: ${phraseError?.message}`);
    }

    // Get existing story if appending
    if (action === "append") {
        const { data: story } = await supabase
            .from("stories")
            .select("story")
            .eq("phrase_id", phraseId)
            .eq("user_id", user.id)
            .single();

        if (story) {
            // Story already exists, return it
            return story.story;
        }
    }

    // Generate new story using LLM
    const newStory = await generateStoryWithLLM(phrase);

    // Generate content hash for the phrase
    const contentHash = `phrase-${phraseId}`;

    // Save or update story
    const storyData = {
        user_id: user.id,
        content_hash: contentHash,
        phrase_id: phraseId,
        phrase: phrase.text,
        translation: phrase.translation,
        story: newStory,
        context: phrase.context || "",
        status: "ready",
        updated_at: new Date().toISOString(),
    };

    if (action === "generate" || action === "regenerate") {
        // Insert or update
        const { data, error } = await supabase
            .from("stories")
            .upsert(storyData, {
                onConflict: "user_id,phrase_id",
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to save story: ${error.message}`);
        }

        return data;
    } else {
        // Append to existing story
        const { data: existing } = await supabase
            .from("stories")
            .select("story")
            .eq("phrase_id", phraseId)
            .eq("user_id", user.id)
            .single();

        if (existing) {
            const updatedStory = existing.story + "\n\n---\n\n" + newStory;
            const { data, error } = await supabase
                .from("stories")
                .update({
                    story: updatedStory,
                    updated_at: new Date().toISOString(),
                })
                .eq("phrase_id", phraseId)
                .eq("user_id", user.id)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to append story: ${error.message}`);
            }

            return data;
        } else {
            // No existing story, create new one
            const { data, error } = await supabase
                .from("stories")
                .insert(storyData)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to create story: ${error.message}`);
            }

            return data;
        }
    }
}

/**
 * Generate story using LLM
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateStoryWithLLM(phrase: any): Promise<string> {
    // Create drivers
    const openaiDriver = new OpenAIDriver();
    const googleDriver = new GoogleAIDriver();

    // Create story adapter
    const storyAdapter = new StoryAdapter([googleDriver, openaiDriver]);

    // Generate story using LLM
    const result = await storyAdapter.generateStory({
        phrases: [
            {
                id: phrase.id,
                text: phrase.text,
                translation: phrase.translation,
                context: phrase.context || "",
            },
        ],
        context: {
            l1: "en", // Default to English
            l2: "de", // Default to German
            proficiency: "intermediate",
        },
        wordCount: 100, // Shorter stories for dictionary use
    });

    return result.story;
}

/**
 * Get story for a phrase
 */
export async function getStoryForPhrase(phraseId: string): Promise<PhraseStory | null> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("phrase_id", phraseId)
        .eq("user_id", user.id)
        .single();

    if (error && error.code !== "PGRST116") {
        // Not found error
        throw new Error(`Failed to get story: ${error.message}`);
    }

    return data || null;
}

/**
 * Delete story for a phrase
 */
export async function deleteStoryForPhrase(phraseId: string): Promise<void> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
        .from("stories")
        .delete()
        .eq("phrase_id", phraseId)
        .eq("user_id", user.id);

    if (error) {
        throw new Error(`Failed to delete story: ${error.message}`);
    }
}

/**
 * Check if story exists for a phrase
 */
export async function hasStoryForPhrase(phraseId: string): Promise<boolean> {
    const story = await getStoryForPhrase(phraseId);
    return story !== null;
}
