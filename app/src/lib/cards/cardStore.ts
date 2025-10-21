/**
 * Card Store
 *
 * Database operations for cards and card reviews.
 * Handles SRS scheduling per card instead of per phrase.
 */

import { supabase } from "../supabase/client";

export interface Card {
    id: string;
    phrase_id: string;
    card_type: "simple" | "cloze";
    difficulty_type?: string;
    front_text: string;
    back_text: string;
    cloze_hint?: string;
    created_at: string;
    updated_at: string;
}

export interface CardReview {
    id: string;
    card_id: string;
    grade: number;
    ease_factor: number;
    interval_days: number;
    repetitions: number;
    next_review_at: string;
    reviewed_at: string;
}

export interface DueCard {
    card_id: string;
    phrase_id: string;
    card_type: string;
    difficulty_type?: string;
    front_text: string;
    back_text: string;
    cloze_hint?: string;
    grade: number;
    ease_factor: number;
    interval_days: number;
    repetitions: number;
}

export interface CardStats {
    total_cards: number;
    due_cards: number;
    mastered_cards: number;
    average_grade: number;
    retention_rate: number;
}

/**
 * Get due cards for study session
 */
export async function getDueCards(limit: number = 20): Promise<DueCard[]> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase.rpc("get_due_cards", {
        p_user_id: user.id,
        p_limit: limit,
    });

    if (error) {
        throw new Error(`Failed to get due cards: ${error.message}`);
    }

    return data || [];
}

/**
 * Get card statistics
 */
export async function getCardStats(): Promise<CardStats> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase.rpc("get_card_stats", {
        p_user_id: user.id,
    });

    if (error) {
        throw new Error(`Failed to get card stats: ${error.message}`);
    }

    return (
        data?.[0] || {
            total_cards: 0,
            due_cards: 0,
            mastered_cards: 0,
            average_grade: 0,
            retention_rate: 0,
        }
    );
}

/**
 * Update card review with SM-2 algorithm
 */
export async function updateCardReview(
    cardId: string,
    grade: number,
    currentReview?: CardReview,
): Promise<void> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Calculate SM-2 parameters
    const sm2Result = calculateSM2(grade, currentReview);

    const reviewData = {
        user_id: user.id,
        card_id: cardId,
        grade,
        ease_factor: sm2Result.easeFactor,
        interval_days: sm2Result.intervalDays,
        repetitions: sm2Result.repetitions,
        next_review_at: sm2Result.nextReviewAt.toISOString(),
        reviewed_at: new Date().toISOString(),
    };

    // Insert or update review
    let { error } = await supabase.from("card_reviews").upsert(reviewData, {
        onConflict: "user_id,card_id",
    });

    // If the constraint doesn't exist, try a different approach
    if (error && error.message.includes("no unique or exclusion constraint")) {
        console.warn("Unique constraint not found, trying alternative approach...");

        // First try to update existing record
        const { data: existingReview } = await supabase
            .from("card_reviews")
            .select("id")
            .eq("user_id", user.id)
            .eq("card_id", cardId)
            .single();

        if (existingReview) {
            // Update existing record
            const { error: updateError } = await supabase
                .from("card_reviews")
                .update(reviewData)
                .eq("id", existingReview.id);

            if (updateError) {
                throw new Error(`Failed to update card review: ${updateError.message}`);
            }
        } else {
            // Insert new record
            const { error: insertError } = await supabase.from("card_reviews").insert(reviewData);

            if (insertError) {
                throw new Error(`Failed to insert card review: ${insertError.message}`);
            }
        }
    } else if (error) {
        throw new Error(`Failed to update card review: ${error.message}`);
    }
}

/**
 * SM-2 algorithm implementation
 */
function calculateSM2(grade: number, currentReview?: CardReview) {
    const minEase = 1.3;

    let easeFactor = 2.5;
    let intervalDays = 1;
    let repetitions = 0;

    if (currentReview) {
        easeFactor = currentReview.ease_factor;
        intervalDays = currentReview.interval_days;
        repetitions = currentReview.repetitions;
    }

    // Update ease factor based on grade
    if (grade >= 3) {
        // Good response
        easeFactor = Math.max(
            minEase,
            easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)),
        );
    } else {
        // Poor response - reset
        easeFactor = Math.max(minEase, easeFactor - 0.2);
        repetitions = 0;
        intervalDays = 1;
    }

    // Calculate interval
    if (repetitions === 0) {
        intervalDays = 1;
    } else if (repetitions === 1) {
        intervalDays = 6;
    } else {
        intervalDays = Math.round(intervalDays * easeFactor);
    }

    // Update repetitions
    if (grade >= 3) {
        repetitions += 1;
    } else {
        repetitions = 0;
    }

    // Calculate next review date
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

    return {
        easeFactor: Math.round(easeFactor * 100) / 100,
        intervalDays,
        repetitions,
        nextReviewAt,
    };
}

/**
 * Get cards for a specific phrase
 */
export async function getCardsForPhrase(phraseId: string): Promise<Card[]> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .eq("phrase_id", phraseId)
        .order("created_at");

    if (error) {
        throw new Error(`Failed to get cards for phrase: ${error.message}`);
    }

    return data || [];
}

/**
 * Delete cards for a phrase (when phrase is deleted)
 */
export async function deleteCardsForPhrase(phraseId: string): Promise<void> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
        .from("cards")
        .delete()
        .eq("user_id", user.id)
        .eq("phrase_id", phraseId);

    if (error) {
        throw new Error(`Failed to delete cards for phrase: ${error.message}`);
    }
}

/**
 * Check if cards exist for a phrase
 */
export async function hasCardsForPhrase(phraseId: string): Promise<boolean> {
    const cards = await getCardsForPhrase(phraseId);
    return cards.length > 0;
}
