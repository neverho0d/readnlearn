/**
 * Study Session Orchestration
 *
 * Manages study sessions, including phrase selection, story generation,
 * cloze exercises, and SRS updates. Coordinates between adapters and UI.
 */

import { supabase } from "../supabase/client";
import { calculateSM2, getInitialSM2Values, ReviewInput, ReviewResult } from "./sm2";

export interface Phrase {
    id: string;
    text: string;
    translation?: string;
    context?: string;
    difficulty?: number;
    position?: number;
    sourceFile?: string;
}

export interface StudySession {
    id: string;
    userId: string;
    sessionType: "review" | "new" | "mixed";
    totalItems: number;
    completedItems: number;
    correctItems: number;
    averageGrade: number;
    durationSeconds: number;
    startedAt: Date;
    completedAt?: Date;
}

export interface StudyItem {
    id: string;
    phrase: Phrase;
    order: number;
    grade?: number;
    responseTimeSeconds?: number;
    isCorrect?: boolean;
}

export interface StoryResult {
    story: string;
    usedPhrases: Array<{
        phrase: string;
        position: number;
        gloss: string;
    }>;
    metadata: {
        wordCount: number;
        difficulty: string;
        topics: string[];
    };
}

export interface ClozeResult {
    id: string;
    text: string;
    blanks: Array<{
        position: number;
        answer: string;
        alternatives: string[];
    }>;
    difficulty: number;
    explanation: string;
}

export interface StudySessionConfig {
    maxItems: number;
    sessionType: "review" | "new" | "mixed";
    includeStory: boolean;
    includeCloze: boolean;
    includeTTS: boolean;
    l1: string;
    l2: string;
    proficiency: "beginner" | "intermediate" | "advanced";
}

export class StudySessionManager {
    private currentSession?: StudySession;
    private currentItems: StudyItem[] = [];
    private sessionStartTime: Date = new Date();

    constructor() {
        // No AI drivers needed - all data should be pre-generated
    }

    /**
     * Start a new study session
     */
    async startSession(config: StudySessionConfig): Promise<StudySession> {
        try {
            // Get due phrases for review
            const duePhrases = await this.getDuePhrases(config.maxItems);

            if (duePhrases.length === 0) {
                throw new Error("No phrases available for study");
            }

            // Create study session record
            const { data: sessionData, error: sessionError } = await supabase
                .from("study_sessions")
                .insert({
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                    session_type: config.sessionType,
                    total_items: duePhrases.length,
                    started_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (sessionError) {
                throw new Error(`Failed to create study session: ${sessionError.message}`);
            }

            this.currentSession = {
                id: sessionData.id,
                userId: sessionData.user_id,
                sessionType: config.sessionType,
                totalItems: duePhrases.length,
                completedItems: 0,
                correctItems: 0,
                averageGrade: 0,
                durationSeconds: 0,
                startedAt: new Date(sessionData.started_at),
            };

            // Create study items
            this.currentItems = duePhrases.map((phrase, index) => ({
                id: `item_${index}`,
                phrase,
                order: index,
            }));

            this.sessionStartTime = new Date();

            return this.currentSession;
        } catch (error) {
            console.error("Failed to start study session:", error);
            throw error;
        }
    }

    /**
     * Get all items in the current session
     */
    getCurrentItems(): StudyItem[] {
        return this.currentItems;
    }

    /**
     * Get current session statistics
     */
    getSessionStats(): StudySession | null {
        if (!this.currentSession) return null;

        const completedItems = this.currentItems.filter((item) => item.grade !== undefined);
        const correctItems = this.currentItems.filter((item) => item.isCorrect === true);
        const averageGrade =
            completedItems.length > 0
                ? completedItems.reduce((sum, item) => sum + (item.grade || 0), 0) /
                  completedItems.length
                : 0;

        return {
            ...this.currentSession,
            completedItems: completedItems.length,
            correctItems: correctItems.length,
            averageGrade,
            durationSeconds: Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000),
        };
    }

    /**
     * Complete the current session
     */
    async completeSession(): Promise<StudySession> {
        if (!this.currentSession) {
            throw new Error("No active session");
        }

        try {
            const stats = this.getSessionStats();
            if (!stats) {
                throw new Error("Failed to get session statistics");
            }

            // Update session record
            const { error } = await supabase
                .from("study_sessions")
                .update({
                    completed_items: stats.completedItems,
                    correct_items: stats.correctItems,
                    average_grade: stats.averageGrade,
                    duration_seconds: stats.durationSeconds,
                    completed_at: new Date().toISOString(),
                })
                .eq("id", this.currentSession.id);

            if (error) {
                throw new Error(`Failed to complete session: ${error.message}`);
            }

            const completedSession = { ...stats, completedAt: new Date() };

            // Clear current session
            this.currentSession = undefined;
            this.currentItems = [];

            return completedSession;
        } catch (error) {
            console.error("Failed to complete session:", error);
            throw error;
        }
    }

    /**
     * Get due phrases for study
     */
    private async getDuePhrases(limit: number): Promise<Phrase[]> {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("No authenticated user");
            }

            const { data: phrases, error } = await supabase.rpc("get_due_phrases", {
                p_user_id: user.id,
                p_limit: limit,
            });

            if (error) {
                throw new Error(`Failed to get due phrases: ${error.message}`);
            }

            return phrases || [];
        } catch (error) {
            console.error("Failed to get due phrases:", error);
            return [];
        }
    }

    /**
     * Update SRS data for a phrase
     */
    private async updateSRSData(phraseId: string, grade: number): Promise<void> {
        try {
            // Get current review data
            const { data: currentReview, error: reviewError } = await supabase
                .from("reviews")
                .select("*")
                .eq("phrase_id", phraseId)
                .order("reviewed_at", { ascending: false })
                .limit(1)
                .single();

            let reviewInput: ReviewInput;
            let reviewResult: ReviewResult;

            if (reviewError || !currentReview) {
                // First review - use initial values
                reviewInput = {
                    grade,
                    previousEaseFactor: 2.5,
                    previousInterval: 1,
                    previousRepetitions: 0,
                };
                reviewResult = getInitialSM2Values();
            } else {
                // Subsequent review - use previous values
                reviewInput = {
                    grade,
                    previousEaseFactor: currentReview.ease_factor || 2.5,
                    previousInterval: currentReview.interval_days || 1,
                    previousRepetitions: currentReview.repetitions || 0, // Fallback to 0 if column doesn't exist
                };
                reviewResult = calculateSM2(reviewInput);
            }

            // Insert new review record
            const { error: insertError } = await supabase.from("reviews").insert({
                phrase_id: phraseId,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                grade,
                ease_factor: reviewResult.easeFactor,
                interval_days: reviewResult.intervalDays,
                next_review_at: reviewResult.nextReviewDate.toISOString(),
                reviewed_at: new Date().toISOString(),
            });

            if (insertError) {
                throw new Error(`Failed to update SRS data: ${insertError.message}`);
            }
        } catch (error) {
            console.error("Failed to update SRS data:", error);
            throw error;
        }
    }

    /**
     * Get the next study item
     */
    getNextItem(): StudyItem | null {
        return this.currentItems.find((item) => item.grade === undefined) || null;
    }

    /**
     * Submit a grade for a study item
     */
    async submitGrade(itemId: string, grade: number, responseTime: number): Promise<void> {
        const item = this.currentItems.find((item) => item.id === itemId);
        if (!item) {
            throw new Error(`Study item not found: ${itemId}`);
        }

        // Update the item
        item.grade = grade;
        item.responseTimeSeconds = responseTime;
        item.isCorrect = grade >= 3;

        // Update SRS data
        await this.updateSRSData(item.phrase.id, grade);

        // Update session statistics
        this.updateSessionStats();
    }

    /**
     * Update session statistics
     */
    private updateSessionStats(): void {
        if (!this.currentSession) return;

        const completedItems = this.currentItems.filter((item) => item.grade !== undefined);
        const correctItems = this.currentItems.filter((item) => item.isCorrect === true);
        const averageGrade =
            completedItems.length > 0
                ? completedItems.reduce((sum, item) => sum + (item.grade || 0), 0) /
                  completedItems.length
                : 0;

        this.currentSession.completedItems = completedItems.length;
        this.currentSession.correctItems = correctItems.length;
        this.currentSession.averageGrade = averageGrade;
        this.currentSession.durationSeconds = Math.floor(
            (Date.now() - this.sessionStartTime.getTime()) / 1000,
        );
    }

    /**
     * Get user's SRS statistics
     */
    async getUserStats(): Promise<{
        totalReviews: number;
        averageGrade: number;
        retentionRate: number;
        dueCount: number;
        overdueCount: number;
        totalPhrases: number;
        masteredPhrases: number;
    }> {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                console.warn("No authenticated user, returning default stats");
                return this.getDefaultStats();
            }

            // Try to get stats from RPC function first
            const { data: stats, error } = await supabase.rpc("get_user_srs_stats", {
                p_user_id: user.id,
            });

            if (error) {
                console.warn("RPC function failed, falling back to manual calculation:", error);
                return await this.calculateStatsManually(user.id);
            }

            if (!stats || stats.length === 0) {
                console.warn("No stats returned from RPC, falling back to manual calculation");
                return await this.calculateStatsManually(user.id);
            }

            const result = stats[0];
            console.log("User stats from RPC:", result);

            // Ensure all values are valid numbers
            return {
                totalReviews: Number(result.totalReviews) || 0,
                averageGrade: Number(result.averageGrade) || 0,
                retentionRate: Number(result.retentionRate) || 0,
                dueCount: Number(result.dueCount) || 0,
                overdueCount: Number(result.overdueCount) || 0,
                totalPhrases: Number(result.totalPhrases) || 0,
                masteredPhrases: Number(result.masteredPhrases) || 0,
            };
        } catch (error) {
            console.error("Failed to get user stats:", error);
            return this.getDefaultStats();
        }
    }

    private getDefaultStats() {
        return {
            totalReviews: 0,
            averageGrade: 0,
            retentionRate: 0,
            dueCount: 0,
            overdueCount: 0,
            totalPhrases: 0,
            masteredPhrases: 0,
        };
    }

    private async calculateStatsManually(userId: string) {
        try {
            console.log("Calculating stats manually for user:", userId);

            // Get total phrases
            const { data: phrases, error: phrasesError } = await supabase
                .from("phrases")
                .select("id")
                .eq("user_id", userId);

            if (phrasesError) {
                console.error("Failed to get phrases:", phrasesError);
                return this.getDefaultStats();
            }

            const totalPhrases = phrases?.length || 0;

            // Get reviews for SRS calculations
            const { data: reviews, error: reviewsError } = await supabase
                .from("reviews")
                .select("grade, created_at")
                .eq("user_id", userId);

            if (reviewsError) {
                console.error("Failed to get reviews:", reviewsError);
                return this.getDefaultStats();
            }

            const totalReviews = reviews?.length || 0;
            const averageGrade =
                totalReviews > 0
                    ? reviews.reduce((sum, r) => sum + (r.grade || 0), 0) / totalReviews
                    : 0;

            // Calculate retention rate (simplified: percentage of reviews with grade >= 3)
            const retentionRate =
                totalReviews > 0
                    ? (reviews.filter((r) => (r.grade || 0) >= 3).length / totalReviews) * 100
                    : 0;

            // Get due phrases (simplified: phrases with no recent reviews)
            const { data: duePhrases, error: dueError } = await supabase
                .from("phrases")
                .select("id")
                .eq("user_id", userId)
                .is("last_reviewed_at", null);

            const dueCount = dueError ? 0 : duePhrases?.length || 0;

            // Get mastered phrases (simplified: phrases with average grade >= 3)
            const { data: masteredPhrases, error: masteredError } = await supabase
                .from("phrases")
                .select("id")
                .eq("user_id", userId)
                .gte("average_grade", 3);

            const masteredCount = masteredError ? 0 : masteredPhrases?.length || 0;

            const result = {
                totalReviews,
                averageGrade: Math.round(averageGrade * 10) / 10, // Round to 1 decimal
                retentionRate: Math.round(retentionRate * 10) / 10, // Round to 1 decimal
                dueCount,
                overdueCount: 0, // Simplified: no overdue calculation
                totalPhrases,
                masteredPhrases: masteredCount,
            };

            console.log("Manually calculated stats:", result);
            return result;
        } catch (error) {
            console.error("Failed to calculate stats manually:", error);
            return this.getDefaultStats();
        }
    }

    /**
     * Check if session is complete
     */
    isSessionComplete(): boolean {
        if (!this.currentSession) return false;
        return this.currentItems.every((item) => item.grade !== undefined);
    }

    /**
     * Get session progress percentage
     */
    getSessionProgress(): number {
        if (!this.currentSession || this.currentItems.length === 0) return 0;
        const completedItems = this.currentItems.filter((item) => item.grade !== undefined).length;
        return Math.round((completedItems / this.currentItems.length) * 100);
    }
}
