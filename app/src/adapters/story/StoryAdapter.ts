/**
 * StoryAdapter
 *
 * Adapter for story generation using multiple LLM drivers
 */

import { LlmBaseAdapter } from "../base/types";
import { LearningContext, Phrase, createStoryPrompt } from "../llm/prompts";

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

export interface StoryRequest {
    phrases: Phrase[];
    context: LearningContext;
    wordCount?: number;
}

export class StoryAdapter {
    private drivers: LlmBaseAdapter[];

    constructor(drivers: LlmBaseAdapter[]) {
        // Sort drivers by cost (cheapest first)
        this.drivers = drivers.sort((a: LlmBaseAdapter, b: LlmBaseAdapter) => {
            return a.modelCost.input - b.modelCost.input;
        });
    }

    /**
     * Generate a story using the best available provider
     */
    async generateStory(request: StoryRequest): Promise<StoryResult> {
        const prompt = this.buildStoryPrompt(request);

        // Try each driver until one succeeds
        for (const driver of this.drivers) {
            try {
                // Check if driver is within limits
                const isWithinLimit = await driver.isWithinDailyLimit();
                const usage = await driver.getUsage();
                console.log(`Driver ${driver.provider} limit check:`, {
                    isWithinLimit,
                    currentUsage: usage.costUsd,
                    dailyCap: (driver as unknown as { dailyCap: number }).dailyCap,
                    remaining: (driver as unknown as { dailyCap: number }).dailyCap - usage.costUsd,
                });

                if (!isWithinLimit) {
                    console.log(`Driver ${driver.provider} exceeded daily limit, trying next...`);
                    continue;
                }

                const response = await driver.response(prompt);
                console.log("Story response from driver:", driver.provider, response);
                return this.parseStoryResponse(response.data);
            } catch (error) {
                console.error(`Story generation failed with ${driver.provider}:`, error);
                // Try next driver
                continue;
            }
        }

        // All drivers failed
        throw new Error(
            "All story generation providers have failed or exceeded daily limits. Please try again later or check your settings.",
        );
    }

    /**
     * Build the story generation prompt
     */
    private buildStoryPrompt(request: StoryRequest): string {
        const { phrases, context, wordCount = 120 } = request;

        return createStoryPrompt({
            phrases,
            context,
            wordCount,
            includeGlosses: true,
        });
    }

    /**
     * Parse the story response from LLM
     */
    private parseStoryResponse(response: string): StoryResult {
        try {
            // // Try to extract JSON from the response
            // const jsonMatch = response.match(/\{[\s\S]*\}/);
            // if (!jsonMatch) {
            //     throw new Error("No JSON found in response");
            // }

            // const result = JSON.parse(jsonMatch[0]);
            const result = JSON.parse(response);

            return {
                story: result.story || "",
                usedPhrases: result.usedPhrases || [],
                metadata: {
                    wordCount: result.metadata?.wordCount || 0,
                    difficulty: result.metadata?.difficulty || "intermediate",
                    topics: result.metadata?.topics || [],
                },
            };
        } catch (error) {
            console.error("Failed to parse story response:", error);
            throw new Error("Failed to parse story response from provider");
        }
    }
}
