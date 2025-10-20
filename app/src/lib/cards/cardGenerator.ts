/**
 * Card Generation Service
 *
 * Generates simple and cloze cards for phrases based on user difficulties.
 * Uses LLM for cloze generation with intelligent difficulty targeting.
 */

import { supabase } from "../supabase/client";
import { ClozeAdapter } from "../../adapters/cloze/ClozeAdapter";
import { OpenAIDriver } from "../../adapters/llm/OpenAIDriver";
import { GoogleAIDriver } from "../../adapters/llm/GoogleAIDriver";

export interface Phrase {
    id: string;
    text: string;
    translation: string;
    context?: string;
}

export interface Card {
    id?: string;
    phrase_id: string;
    card_type: "simple" | "cloze";
    difficulty_type?: string;
    front_text: string;
    back_text: string;
    cloze_hint?: string;
}

export interface ClozeResult {
    clozeText: string;
    answer: string;
    hint: string;
    explanation: string;
}

/**
 * Clean up cloze text by replacing any bracketed content with [...] placeholders
 */
function cleanClozeText(text: string): string {
    // Replace any content in square brackets with [...]
    // This handles cases where LLM didn't properly replace phrases with placeholders
    return text.replace(/\[[^\]]*\]/g, "[...]");
}

/**
 * Fix existing cloze cards in the database by cleaning up their front_text
 */
export async function fixExistingClozeCards(): Promise<void> {
    try {
        console.log("Starting to fix existing cloze cards...");

        // Get all cloze cards from the database
        const { data: cards, error: fetchError } = await supabase
            .from("cards")
            .select("id, front_text")
            .eq("card_type", "cloze");

        if (fetchError) {
            console.error("Error fetching cloze cards:", fetchError);
            return;
        }

        if (!cards || cards.length === 0) {
            console.log("No cloze cards found to fix.");
            return;
        }

        console.log(`Found ${cards.length} cloze cards to check...`);

        let fixedCount = 0;
        const updates = [];

        for (const card of cards) {
            const cleanedText = cleanClozeText(card.front_text);

            // Only update if the text actually changed
            if (cleanedText !== card.front_text) {
                console.log(`Fixing card ${card.id}: "${card.front_text}" -> "${cleanedText}"`);
                updates.push({
                    id: card.id,
                    front_text: cleanedText,
                });
                fixedCount++;
            }
        }

        if (updates.length > 0) {
            // Update all cards in batch
            const { error: updateError } = await supabase.from("cards").upsert(updates);

            if (updateError) {
                console.error("Error updating cloze cards:", updateError);
                return;
            }

            console.log(`Successfully fixed ${fixedCount} cloze cards.`);
        } else {
            console.log("No cloze cards needed fixing.");
        }
    } catch (error) {
        console.error("Error fixing existing cloze cards:", error);
    }
}

/**
 * Generate all cards for a phrase based on user difficulties
 */
export async function generateCardsForPhrase(
    phrase: Phrase,
    userDifficulties: string[],
): Promise<Card[]> {
    const cards: Card[] = [];

    // 1. Always create simple card
    cards.push({
        phrase_id: phrase.id,
        card_type: "simple",
        front_text: phrase.text,
        back_text: phrase.translation,
    });

    // 2. Generate cloze cards for each user difficulty (max 2 per difficulty)
    for (const difficulty of userDifficulties) {
        try {
            const clozeCards = await generateClozeCards(phrase, difficulty);
            if (clozeCards && clozeCards.length > 0) {
                cards.push(...clozeCards);
            }
        } catch (error) {
            console.warn(`Failed to generate cloze cards for difficulty ${difficulty}:`, error);
            // Continue with other difficulties - simple cards will still be created
        }
    }

    return cards;
}

/**
 * Generate cloze cards for a specific difficulty
 */
async function generateClozeCards(phrase: Phrase, difficulty: string): Promise<Card[]> {
    try {
        // Create drivers
        const openaiDriver = new OpenAIDriver();
        const googleDriver = new GoogleAIDriver();

        // Create cloze adapter
        const clozeAdapter = new ClozeAdapter([googleDriver, openaiDriver]);

        // Get user language settings and level
        const userLanguages = await getUserLanguages();
        const userLevel = await getUserLevel();

        // Generate clozes using LLM
        const clozeResults = await clozeAdapter.generateCloze({
            phrase: phrase.text,
            translation: phrase.translation,
            context: phrase.context || "",
            difficulty: difficulty,
            maxClozes: 2, // Max 2 clozes per difficulty
            l1: userLanguages.l1,
            l2: userLanguages.l2,
            level: userLevel,
        });

        // Convert to Card format and clean up cloze text
        return clozeResults.map((cloze) => ({
            phrase_id: phrase.id,
            card_type: "cloze" as const,
            difficulty_type: difficulty,
            front_text: cleanClozeText(cloze.clozeText),
            back_text: cloze.answer,
            cloze_hint: cloze.hint,
        }));
    } catch (error) {
        console.error(
            `Failed to generate cloze cards for phrase "${phrase.text}" and difficulty "${difficulty}":`,
            error,
        );

        // Create a simple fallback cloze card
        console.log(`Creating fallback cloze card for difficulty "${difficulty}"`);
        return [
            {
                phrase_id: phrase.id,
                card_type: "cloze" as const,
                difficulty_type: difficulty,
                front_text: phrase.text.replace(/\b\w+\b/g, "___"), // Simple word replacement
                back_text: phrase.translation,
                cloze_hint: difficulty,
            },
        ];
    }
}

/**
 * Save cards to database
 */
export async function saveCards(cards: Card[]): Promise<void> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const cardsWithUserId = cards.map((card) => ({
        ...card,
        user_id: user.id,
    }));

    const { error } = await supabase.from("cards").insert(cardsWithUserId);

    if (error) {
        throw new Error(`Failed to save cards: ${error.message}`);
    }
}

/**
 * Generate cards for all phrases of a user
 */
export async function generateCardsForAllPhrases(taskId?: string): Promise<void> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get user difficulties from settings
    const userDifficulties = await getUserDifficulties();
    if (userDifficulties.length === 0) {
        console.log("No user difficulties found, only generating simple cards");
    }

    // Get all phrases
    const { data: phrases, error: phrasesError } = await supabase
        .from("phrases")
        .select("id, text, translation, context")
        .eq("user_id", user.id);

    if (phrasesError) {
        throw new Error(`Failed to load phrases: ${phrasesError.message}`);
    }

    if (!phrases || phrases.length === 0) {
        console.log("No phrases found to generate cards for");
        return;
    }

    console.log(`Generating cards for ${phrases.length} phrases`);

    let totalCardsGenerated = 0;
    let processedPhrases = 0;

    // Generate cards for each phrase
    for (const phrase of phrases) {
        try {
            // Update status to show current phrase being processed
            if (taskId) {
                const { statusStore } = await import("../status/StatusStore");
                statusStore.updateTask(taskId, {
                    phrase: `Processing: "${phrase.text.substring(0, 30)}${phrase.text.length > 30 ? "..." : ""}" (${processedPhrases + 1}/${phrases.length})`,
                    status: "processing",
                });
            }

            const cards = await generateCardsForPhrase(phrase, userDifficulties);
            if (cards && cards.length > 0) {
                await saveCards(cards);
                totalCardsGenerated += cards.length;
            }
            processedPhrases++;

            console.log(
                `Generated ${cards.length} cards for phrase: "${phrase.text}" (${processedPhrases}/${phrases.length})`,
            );
        } catch (error) {
            console.error(`Failed to generate cards for phrase "${phrase.text}":`, error);
            processedPhrases++;
            // Continue with next phrase - don't let one failure stop the entire process
        }
    }

    console.log(
        `Card generation completed: ${totalCardsGenerated} cards generated for ${processedPhrases} phrases`,
    );

    // Update final status
    if (taskId) {
        const { statusStore } = await import("../status/StatusStore");
        statusStore.updateTask(taskId, {
            phrase: `Completed: ${totalCardsGenerated} cards generated for ${processedPhrases} phrases`,
            status: "processing",
        });
    }
}

/**
 * Get user language settings
 */
async function getUserLanguages(): Promise<{ l1: string; l2: string }> {
    try {
        const settingsData = localStorage.getItem("readnlearn-settings");
        if (settingsData) {
            const settings = JSON.parse(settingsData);
            return {
                l1: settings.l1 || "English",
                l2: settings.l2 || "Spanish",
            };
        }
    } catch (error) {
        console.warn("Failed to load language settings:", error);
    }

    // Default fallback
    return { l1: "English", l2: "Spanish" };
}

/**
 * Get user level from settings
 */
async function getUserLevel(): Promise<string> {
    try {
        const settingsData = localStorage.getItem("readnlearn-settings");
        if (settingsData) {
            const settings = JSON.parse(settingsData);
            return settings.userLevel || "A2";
        }
    } catch (error) {
        console.warn("Failed to load user level:", error);
    }

    // Default fallback
    return "A2";
}

/**
 * Get user difficulties from settings
 */
async function getUserDifficulties(): Promise<string[]> {
    try {
        const settingsData = localStorage.getItem("readnlearn-settings");
        if (!settingsData) return [];

        const settings = JSON.parse(settingsData);
        return settings.userDifficulties || [];
    } catch (error) {
        console.warn("Failed to load user difficulties:", error);
        return [];
    }
}

/**
 * Generate cards for a new phrase (called when phrase is saved)
 */
export async function generateCardsForNewPhrase(phraseId: string): Promise<void> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Get the phrase
    const { data: phrase, error: phraseError } = await supabase
        .from("phrases")
        .select("id, text, translation, context")
        .eq("id", phraseId)
        .eq("user_id", user.id)
        .single();

    if (phraseError || !phrase) {
        throw new Error(`Failed to load phrase: ${phraseError?.message}`);
    }

    // Get user difficulties
    const userDifficulties = await getUserDifficulties();

    // Generate cards
    const cards = await generateCardsForPhrase(phrase, userDifficulties);
    await saveCards(cards);

    console.log(`Generated ${cards.length} cards for new phrase: "${phrase.text}"`);
}
