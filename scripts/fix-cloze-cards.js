#!/usr/bin/env node

/**
 * Fix Cloze Cards Script
 *
 * This script fixes existing cloze cards in the database by replacing
 * any bracketed content with [...] placeholders.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Clean up cloze text by replacing any bracketed content with [...] placeholders
 */
function cleanClozeText(text) {
    return text.replace(/\[[^\]]*\]/g, "[...]");
}

/**
 * Fix existing cloze cards in the database
 */
async function fixExistingClozeCards() {
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

// Run the fix
fixExistingClozeCards()
    .then(() => {
        console.log("Cloze card fix completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    });
