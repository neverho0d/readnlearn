/**
 * Cloze Exercise Adapter
 *
 * Generates cloze exercises using LLM drivers with intelligent difficulty targeting.
 * Creates multiple cloze variations per phrase based on user difficulties.
 */

import { LlmBaseAdapter } from "../base/types";

export interface ClozeRequest {
    phrase: string;
    translation: string;
    context: string;
    difficulty: string; // 'prepositions', 'verbs', 'cases', etc.
    maxClozes?: number; // Maximum number of clozes to generate (default: 2)
    l1?: string; // User's native language
    l2?: string; // Target language (phrase language)
    level?: string; // Learner's level (A1, A2, B1, B2, C1, C2)
}

export interface ClozeResult {
    clozeText: string; // "Ich gehe ___ dem Weg"
    answer: string; // "auf"
    hint: string; // "preposition"
    explanation: string; // "auf dem Weg = on the way"
}

export class ClozeAdapter {
    private drivers: LlmBaseAdapter[];

    constructor(drivers: LlmBaseAdapter[]) {
        if (!drivers || !Array.isArray(drivers)) {
            throw new Error("ClozeAdapter requires an array of LlmBaseAdapter drivers");
        }
        // Sort drivers by cost (cheapest first)
        this.drivers = drivers.sort((a: LlmBaseAdapter, b: LlmBaseAdapter) => {
            // Simple cost comparison - in real implementation, you'd compare actual costs
            const aCost = a.provider === "google" ? 0.1 : 0.05; // Google is cheaper
            const bCost = b.provider === "google" ? 0.1 : 0.05;
            return aCost - bCost;
        });
    }

    /**
     * Generate cloze exercises for a phrase
     */
    async generateCloze(request: ClozeRequest): Promise<ClozeResult[]> {
        const { phrase, translation, context, difficulty, maxClozes = 2 } = request;

        // Try each driver until one succeeds
        for (const driver of this.drivers) {
            try {
                // Check if driver is within daily limits
                const isWithinLimit = await driver.isWithinDailyLimit();
                if (!isWithinLimit) {
                    console.log(
                        `Driver ${driver.provider} exceeded daily limit, trying next driver`,
                    );
                    continue;
                }

                // Test driver connection first
                const isConnected = await driver.testConnection();
                if (!isConnected) {
                    console.log(
                        `Driver ${driver.provider} connection test failed, trying next driver`,
                    );
                    continue;
                }

                // Generate cloze using LLM
                const prompt = this.buildClozePrompt(
                    phrase,
                    translation,
                    context,
                    difficulty,
                    maxClozes,
                    request.l1 || "English",
                    request.l2 || "Spanish",
                    request.level || "A2",
                );
                console.log("Cloze prompt:", prompt);
                const response = await driver.response(prompt);
                console.log("Cloze response:", response);

                // Check if response is valid
                if (!response || !response.data) {
                    throw new Error(`Driver ${driver.provider} returned empty response`);
                }

                // Parse the response
                const clozes = this.parseClozeResponse(response.data);

                console.log(`Generated ${clozes.length} clozes for difficulty ${difficulty}`);
                return clozes;
            } catch (error) {
                console.warn(`Driver ${driver.provider} failed to generate cloze:`, error);
                continue;
            }
        }

        throw new Error("All drivers failed to generate cloze exercises");
    }

    /**
     * Build prompt for cloze generation
     */
    private buildClozePrompt(
        phrase: string,
        translation: string,
        context: string,
        difficulty: string,
        maxClozes: number = 2,
        l1: string = "English",
        l2: string = "Spanish",
        level: string = "A2", // A1, A2, B1, B2, C1, C2
    ): string {
        return `You are a professional language tutor specializing in creating hyper-specific, context-rich Spaced Repetition System (SRS) cards.
Your task is to generate ${maxClozes} cloze deletion exercises tailored to the learner's specified difficulty.

Analyze the provided L2 'phrase'.
1. Identify the single word or short phrase that best exemplifies the 'difficulty_focus'.
2. Create a cloze deletion for that identified item.

Output the result ONLY in the specified JSON format. Do not include any introductory or explanatory text outside of the JSON block.

[INPUT DATA]
Phrase (L2):
\`\`\`
${phrase}
\`\`\`
Learner's Native Language (L1): ${l1}
L2 Language: ${l2}
Difficulty Focus: ${difficulty}
Translation (L1):
\`\`\`
${translation}
\`\`\`
Context/Source:
\`\`\`
${context}
\`\`\`
Learner Level: ${level}

[OUTPUT INSTRUCTIONS]
1. cloze_text: Create the cloze-deleted version of the phrase. Use brackets for the blank: "[...]"
2. answer: State the exact L2 word or phrase that was deleted.
3. hint: Provide a focused hint in the L1 (English) related *only* to the item deleted. The hint should be appropriate for the ${level}.
4. explanation: Provide a brief, technical explanation of *why* the target word is used in this context, directly addressing the Difficulty Focus.
5. Make sure the JSON is valid and parseable.

[JSON OUTPUT FORMAT]
[
    {
        "cloze_text": "...",
        "answer": "...",
        "hint": "...",
        "explanation": "...",
    },
    ...
]
`;
    }

    /**
     * Parse LLM response into ClozeResult array
     */
    private parseClozeResponse(content: string): ClozeResult[] {
        try {
            // Check if content is valid
            if (!content || typeof content !== "string") {
                throw new Error("Invalid response content");
            }

            // Try to extract JSON from the response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("No JSON array found in response");
            }

            const jsonStr = jsonMatch[0];
            const clozes = JSON.parse(jsonStr);

            // Validate the structure
            if (!Array.isArray(clozes)) {
                throw new Error("Response is not an array");
            }

            return clozes.map((cloze, index) => {
                // Handle both old format (clozeText) and new format (cloze_text)
                const clozeText = cloze.clozeText || cloze.cloze_text;
                if (!clozeText || !cloze.answer || !cloze.hint || !cloze.explanation) {
                    throw new Error(`Invalid cloze structure at index ${index}`);
                }

                return {
                    clozeText: clozeText,
                    answer: cloze.answer,
                    hint: cloze.hint,
                    explanation: cloze.explanation,
                };
            });
        } catch (error) {
            console.error("Failed to parse cloze response:", error);
            console.error("Response content:", content);

            // Try to extract any valid JSON from the response
            try {
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const jsonStr = jsonMatch[0];
                    const clozes = JSON.parse(jsonStr);
                    if (Array.isArray(clozes) && clozes.length > 0) {
                        return clozes.map((cloze) => ({
                            clozeText: cloze.cloze_text || cloze.clozeText || "___",
                            answer: cloze.answer || "unknown",
                            hint: cloze.hint || "word",
                            explanation: cloze.explanation || "Please try again",
                        }));
                    }
                }
            } catch (parseError) {
                console.warn("Failed to extract JSON from malformed response:", parseError);
            }

            // Return a fallback cloze
            return [
                {
                    clozeText: "___", // Generic fallback
                    answer: "unknown",
                    hint: "word",
                    explanation: "Please try again",
                },
            ];
        }
    }
}
