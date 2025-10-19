/**
 * TranslationAdapter
 *
 * Adapter that uses multiple LLM drivers for translation with cost-aware selection
 */

import { LlmBaseAdapter } from "../base/types";
import { LANGUAGES } from "@/lib/settings/SettingsContext";

export interface TranslationResult {
    translation: string;
    explanation: string;
}

export interface TranslationRequest {
    text: string;
    context: string;
    l1: string;
    l2: string;
    level: string;
    difficulties: string[];
}

export class TranslationAdapter {
    private drivers: LlmBaseAdapter[];

    constructor(drivers: LlmBaseAdapter[]) {
        if (!drivers || !Array.isArray(drivers)) {
            throw new Error("TranslationAdapter requires an array of LlmBaseAdapter drivers");
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
     * Translate text using the best available provider
     */
    async translate(request: TranslationRequest): Promise<TranslationResult> {
        const prompt = this.buildTranslationPrompt(request);

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
                console.log(`Translation response from ${driver.provider}:`, response);
                return this.parseTranslationResponse(response.data);
            } catch (error) {
                console.error(`Translation failed with ${driver.provider}:`, error);
                // Try next driver
                continue;
            }
        }

        // All drivers failed
        throw new Error(
            "All translation providers have failed or exceeded daily limits. Please try again later or check your settings.",
        );
    }

    /**
     * Build the translation prompt using the translation_prompt rule
     */
    private buildTranslationPrompt(request: TranslationRequest): string {
        const { text, context, l1, l2, level, difficulties } = request;
        const l1_name = LANGUAGES.find((l) => l.code === l1)?.name;
        const l2_name = LANGUAGES.find((l) => l.code === l2)?.name;

        // Check if we need explanation mode (L1 == L2)
        const isExplanationMode = l1 === l2;

        if (isExplanationMode) {
            return `You are an expert tutor. Explain the following phrase:

Phrase:
\`\`\`
${text}
\`\`\`
The phrase is used in the following context:
\`\`\`
${context}
\`\`\`

Answer in JSON format, like the following example:
{
    "phrase_translation": "",
    "explanation": "...",
}

Save the explanation as Markdown into the "explanation" field of the JSON object, and leave the "phrase_translation" field empty.
Answer in ${l1_name}.
`;
        } else {
            return `You are a language learning assistant. Translate the following phrase from ${l2_name} to ${l1_name} for a ${level} level learner who experiences difficulties with: ${difficulties.join(", ")}.

Phrase:
\`\`\`
${text}
\`\`\`
To provide a better translation, take into account that the phrase is used in the following context:
\`\`\`
${context}
\`\`\`

Answer in JSON format, like the following example:
{
    "phrase_translation": "...",
    "explanation": "...",
}

Save the translation into the "phrase_translation" field of the JSON object, and save the explanation as Markdown into the "explanation" field of the JSON object.
Make sure the JSON object is valid JSON with properly escaped quotes.
Keep explanations concise but helpful for ${level} level learners with mentioned difficulties: ${difficulties}.
When referring to translated words, pair them with the original word in ${l2_name} in parentheses.
Answer in ${l1_name}.
`;
        }
    }

    /**
     * Parse the translation response from LLM
     */
    private parseTranslationResponse(response: string): TranslationResult {
        try {
            console.log("Parsing translation response:", response);
            // // Try to extract JSON from the response
            // const jsonMatch = response.match(/\{[\s\S]*\}/);
            // if (!jsonMatch) {
            //     throw new Error("No JSON found in response");
            // }

            // const result = JSON.parse(jsonMatch[0]);
            const result = JSON.parse(response);

            return {
                translation: result.phrase_translation || "",
                explanation: result.explanation || "",
            };
        } catch (error) {
            console.error("Failed to parse translation response:", error);
            throw new Error("Failed to parse translation response from provider");
        }
    }
}
