/**
 * SM-2 Spaced Repetition Algorithm Implementation
 *
 * Implements the SuperMemo 2 algorithm for spaced repetition learning.
 * This algorithm determines when to review items based on user performance.
 */

export interface ReviewResult {
    easeFactor: number;
    intervalDays: number;
    nextReviewDate: Date;
    repetitions: number;
}

export interface ReviewInput {
    grade: number; // 1-4 scale (1=again, 2=hard, 3=good, 4=easy)
    previousEaseFactor: number;
    previousInterval: number;
    previousRepetitions: number;
}

export interface SRSStats {
    totalReviews: number;
    averageGrade: number;
    retentionRate: number;
    dueCount: number;
    overdueCount: number;
}

/**
 * SM-2 Algorithm Implementation
 *
 * The SM-2 algorithm calculates the next review date and ease factor
 * based on the user's performance grade (1-4 scale).
 *
 * @param input - Review input parameters
 * @returns Review result with updated scheduling
 */
export function calculateSM2(input: ReviewInput): ReviewResult {
    const { grade, previousEaseFactor, previousInterval, previousRepetitions } = input;

    // Validate inputs
    if (grade < 1 || grade > 4) {
        throw new Error("Grade must be between 1 and 4");
    }

    if (previousEaseFactor < 1.3) {
        throw new Error("Previous ease factor must be at least 1.3");
    }

    let newEaseFactor: number;
    let newInterval: number;
    let newRepetitions: number;

    // Calculate new ease factor
    if (grade >= 3) {
        // Good or Easy response
        newEaseFactor = previousEaseFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    } else {
        // Again or Hard response
        newEaseFactor = Math.max(1.3, previousEaseFactor - 0.2);
    }

    // Ensure minimum ease factor
    newEaseFactor = Math.max(1.3, newEaseFactor);

    // Calculate new interval
    if (grade < 3) {
        // Again or Hard response - reset repetitions
        newRepetitions = 0;
        newInterval = 1; // Review again in 1 day
    } else {
        // Good or Easy response
        newRepetitions = previousRepetitions + 1;

        if (newRepetitions === 1) {
            newInterval = 1; // First repetition: 1 day
        } else if (newRepetitions === 2) {
            newInterval = 6; // Second repetition: 6 days
        } else {
            // Third and subsequent repetitions
            newInterval = Math.round(previousInterval * newEaseFactor);
        }
    }

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
        easeFactor: newEaseFactor,
        intervalDays: newInterval,
        nextReviewDate,
        repetitions: newRepetitions,
    };
}

/**
 * Calculate initial SM-2 values for a new item
 *
 * @returns Initial SM-2 values
 */
export function getInitialSM2Values(): ReviewResult {
    return {
        easeFactor: 2.5, // Starting ease factor
        intervalDays: 1, // First review in 1 day
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        repetitions: 0,
    };
}

/**
 * Calculate SRS statistics from review history
 *
 * @param reviews - Array of review grades
 * @param dueDate - Current date for due calculations
 * @returns SRS statistics
 */
export function calculateSRSStats(
    reviews: Array<{ grade: number; reviewedAt: Date; nextReviewAt: Date }>,
    dueDate: Date = new Date(),
): SRSStats {
    if (reviews.length === 0) {
        return {
            totalReviews: 0,
            averageGrade: 0,
            retentionRate: 0,
            dueCount: 0,
            overdueCount: 0,
        };
    }

    const totalReviews = reviews.length;
    const averageGrade = reviews.reduce((sum, review) => sum + review.grade, 0) / totalReviews;

    // Calculate retention rate (percentage of reviews with grade >= 3)
    const successfulReviews = reviews.filter((review) => review.grade >= 3).length;
    const retentionRate = (successfulReviews / totalReviews) * 100;

    // Count due and overdue items
    const dueCount = reviews.filter((review) => review.nextReviewAt <= dueDate).length;
    const overdueCount = reviews.filter((review) => review.nextReviewAt < dueDate).length;

    return {
        totalReviews,
        averageGrade,
        retentionRate,
        dueCount,
        overdueCount,
    };
}

/**
 * Get items due for review
 *
 * @param items - Array of items with next review dates
 * @param currentDate - Current date for comparison
 * @returns Items that are due for review
 */
export function getDueItems<T extends { nextReviewAt: Date }>(
    items: T[],
    currentDate: Date = new Date(),
): T[] {
    return items.filter((item) => item.nextReviewAt <= currentDate);
}

/**
 * Get overdue items (past due date)
 *
 * @param items - Array of items with next review dates
 * @param currentDate - Current date for comparison
 * @returns Items that are overdue for review
 */
export function getOverdueItems<T extends { nextReviewAt: Date }>(
    items: T[],
    currentDate: Date = new Date(),
): T[] {
    return items.filter((item) => item.nextReviewAt < currentDate);
}

/**
 * Calculate next review date for a given grade
 *
 * @param currentDate - Current date
 * @param grade - User's performance grade (1-4)
 * @param previousEaseFactor - Previous ease factor
 * @param previousInterval - Previous interval in days
 * @param previousRepetitions - Previous repetition count
 * @returns Next review date
 */
export function calculateNextReviewDate(
    currentDate: Date,
    grade: number,
    previousEaseFactor: number,
    previousInterval: number,
    previousRepetitions: number,
): Date {
    const result = calculateSM2({
        grade,
        previousEaseFactor,
        previousInterval,
        previousRepetitions,
    });

    return result.nextReviewDate;
}

/**
 * Validate SM-2 parameters
 *
 * @param params - Parameters to validate
 * @returns True if valid, false otherwise
 */
export function validateSM2Params(params: ReviewInput): boolean {
    return (
        params.grade >= 1 &&
        params.grade <= 4 &&
        params.previousEaseFactor >= 1.3 &&
        params.previousInterval >= 0 &&
        params.previousRepetitions >= 0
    );
}

/**
 * Get grade description
 *
 * @param grade - Grade value (1-4)
 * @returns Human-readable grade description
 */
export function getGradeDescription(grade: number): string {
    switch (grade) {
        case 1:
            return "Again (Complete blackout)";
        case 2:
            return "Hard (Incorrect response; correct one remembered)";
        case 3:
            return "Good (Correct response after hesitation)";
        case 4:
            return "Easy (Perfect response)";
        default:
            return "Unknown grade";
    }
}

/**
 * Get grade color for UI
 *
 * @param grade - Grade value (1-4)
 * @returns CSS color class or style
 */
export function getGradeColor(grade: number): string {
    switch (grade) {
        case 1:
            return "#ef4444"; // Red
        case 2:
            return "#f97316"; // Orange
        case 3:
            return "#22c55e"; // Green
        case 4:
            return "#3b82f6"; // Blue
        default:
            return "#6b7280"; // Gray
    }
}

/**
 * Calculate learning progress percentage
 *
 * @param totalItems - Total number of items
 * @param masteredItems - Number of mastered items (ease factor > 2.5)
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(totalItems: number, masteredItems: number): number {
    if (totalItems === 0) return 0;
    return Math.round((masteredItems / totalItems) * 100);
}

/**
 * Get difficulty level based on ease factor
 *
 * @param easeFactor - Current ease factor
 * @returns Difficulty level string
 */
export function getDifficultyLevel(easeFactor: number): string {
    if (easeFactor >= 2.5) return "Easy";
    if (easeFactor >= 2.0) return "Medium";
    if (easeFactor >= 1.7) return "Hard";
    return "Very Hard";
}

/**
 * Calculate study session duration estimate
 *
 * @param itemCount - Number of items to review
 * @param averageTimePerItem - Average time per item in seconds
 * @returns Estimated duration in minutes
 */
export function estimateSessionDuration(
    itemCount: number,
    averageTimePerItem: number = 30,
): number {
    return Math.ceil((itemCount * averageTimePerItem) / 60);
}
