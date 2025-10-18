/**
 * ClozeAdapter
 *
 * Adapter for cloze exercise generation using multiple LLM drivers
 */

import { LlmBaseAdapter } from "../base/types";
import { LearningContext, Phrase, createClozePrompt } from "../llm/prompts";

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

export interface ClozeRequest {
    phrases: Phrase[];
    context: LearningContext;
    count?: number;
}

export class ClozeAdapter {
    private drivers: LlmBaseAdapter[];

    constructor(drivers: LlmBaseAdapter[]) {
        // Sort drivers by cost (cheapest first)
        this.drivers = drivers.sort((a, b) => {
            const aCost = a.provider === "google" ? 0.1 : 0.05;
            const bCost = b.provider === "google" ? 0.1 : 0.05;
            return aCost - bCost;
        });
    }

    /**
     * Generate cloze exercises using the best available provider
     */
    async generateCloze(request: ClozeRequest): Promise<ClozeResult[]> {
        const prompt = this.buildClozePrompt(request);

        // Try each driver until one succeeds
        for (const driver of this.drivers) {
            try {
                // Check if driver is within limits
                if (!(await driver.isWithinDailyLimit())) {
                    console.log(`Driver ${driver.provider} exceeded daily limit, trying next...`);
                    continue;
                }

                const response = await driver.response(prompt);
                return this.parseClozeResponse(response.data);
            } catch (error) {
                console.error(`Cloze generation failed with ${driver.provider}:`, error);
                // Try next driver
                continue;
            }
        }

        // All drivers failed
        throw new Error(
            "All cloze generation providers have failed or exceeded daily limits. Please try again later or check your settings.",
        );
    }

    /**
     * Build the cloze generation prompt
     */
    private buildClozePrompt(request: ClozeRequest): string {
        const { phrases, context, count = 5 } = request;

        return createClozePrompt({
            phrases,
            context,
            exerciseCount: count,
        });
    }

    /**
     * Parse the cloze response from LLM
     */
    private parseClozeResponse(response: string): ClozeResult[] {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("No JSON array found in response");
            }

            const result = JSON.parse(jsonMatch[0]);

            if (!Array.isArray(result)) {
                throw new Error("Response is not an array");
            }

            return result.map((item, index) => ({
                id: item.id || `cloze-${index}`,
                text: item.text || "",
                blanks: item.blanks || [],
                difficulty: item.difficulty || 1,
                explanation: item.explanation || "",
            }));
        } catch (error) {
            console.error("Failed to parse cloze response:", error);
            throw new Error("Failed to parse cloze response from provider");
        }
    }
}
