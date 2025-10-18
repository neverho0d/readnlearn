/**
 * TranslationAdapter
 *
 * Universal adapter for translation services that handles:
 * - Provider selection and API key management
 * - Environment detection (Tauri vs browser)
 * - API calls with proper error handling
 * - Response parsing and validation
 * - Usage caps and rate limiting
 */

import { LANGUAGES } from "@/lib/settings/SettingsContext";
import { invoke as tauriInvoke, isTauri as isTauriRuntime } from "@tauri-apps/api/core";

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

export interface ProviderConfig {
    apiKey: string;
    dailyCap?: number;
    timeout?: number;
}

export class TranslationAdapter {
    private providerConfig: ProviderConfig;
    private usageCount: number = 0;
    private lastResetDate: string = new Date().toISOString().split("T")[0];

    constructor(providerConfig: ProviderConfig) {
        this.providerConfig = providerConfig;
    }

    /**
     * Translate text using the configured provider
     */
    async translate(request: TranslationRequest): Promise<TranslationResult> {
        // Check daily usage cap
        this.checkDailyCap();

        // Build the translation prompt
        const prompt = this.buildTranslationPrompt(request);
        console.log("prompt", prompt);

        try {
            let result: TranslationResult;
            if (isTauriRuntime()) {
                result = await this.translateWithTauri(prompt);
            } else {
                result = await this.translateWithBrowser(prompt);
            }
            console.log("translation result", result);
            return result;
        } catch (error) {
            console.error("Translation failed:", error);
            throw new Error(
                `Translation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
        }
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
Keep explanations concise but helpful for ${level} level learners with mentioned difficulties: ${difficulties}.
When referring to translated words, pair them with the original word in ${l2_name} in parentheses.
Answer in ${l1_name}.
`;
        }
    }

    /**
     * Translate using Tauri proxy
     */
    private async translateWithTauri(prompt: string): Promise<TranslationResult> {
        const requestBody = {
            model: "gpt-5-nano",
            input: prompt,
        };

        console.log("Making Tauri OpenAI API call with body:", requestBody);

        const raw = await tauriInvoke<string>("openai_proxy", {
            apiKey: this.providerConfig.apiKey,
            method: "POST",
            path: "/v1/responses",
            body: JSON.stringify(requestBody),
        });

        return this.parseResponse(raw);
    }

    /**
     * Translate using direct browser API call
     */
    private async translateWithBrowser(prompt: string): Promise<TranslationResult> {
        const requestBody = {
            model: "gpt-5-nano",
            input: prompt,
        };

        console.log("Making browser OpenAI API call with body:", requestBody);

        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.providerConfig.apiKey}`,
            },
            body: JSON.stringify(requestBody),
        });

        return this.parseResponse(await response.text());
    }

    /**
     * Parse the LLM response and extract translation/explanation
     */
    private parseResponse(response: string): TranslationResult {
        try {
            console.log("OpenAI API raw response:", response);
            const json = JSON.parse(response);
            console.log("OpenAI API response:", json);
            console.log("Response structure analysis:", {
                hasOutput: !!json?.output,
                hasChoices: !!json?.choices,
                hasContent: !!json?.content,
                outputLength: json?.output?.length,
                choicesLength: json?.choices?.length,
            });

            // Check for API errors first
            if (json.error) {
                console.error("OpenAI API error:", json.error);
                throw new Error(`OpenAI API error: ${json.error.message}`);
            }

            // Parse the new OpenAI Responses API format
            let responseContent = null;
            let responseJSON = null;

            if (json?.output && Array.isArray(json.output)) {
                // Look for message type in output array
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const messageItem = json.output.find((item: any) => item.type === "message");
                if (messageItem?.content && Array.isArray(messageItem?.content)) {
                    responseContent = messageItem?.content;
                    // Look for output_text type
                    const outputTextItem = responseContent.find(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (item: any) => item.type === "output_text",
                    );
                    if (outputTextItem) {
                        try {
                            // Parse the text as JSON to get our expected structure
                            responseJSON = JSON.parse(outputTextItem.text);
                        } catch (parseError) {
                            console.error("Failed to parse output_text as JSON:", parseError);
                            throw new Error("Failed to parse output_text as JSON");
                        }
                    } else {
                        console.error(
                            "No output_text item found in response content:",
                            responseContent,
                        );
                        throw new Error("No output_text item found in response content");
                    }
                } else {
                    console.error("No message item found in response content:", responseContent);
                    throw new Error("No message item found in response content");
                }
            }

            if (!responseJSON) {
                console.error("No response content in API response:", json);
                throw new Error("No response from OpenAI API");
            }

            return {
                translation: responseJSON.phrase_translation || "",
                explanation: responseJSON.explanation || "",
            };
        } catch {
            // If JSON parsing fails, treat the entire response as translation
            return {
                translation: response,
                explanation: "",
            };
        }
    }

    /**
     * Check daily usage cap
     */
    private checkDailyCap(): void {
        const today = new Date().toISOString().split("T")[0];

        // Reset counter if it's a new day
        if (today !== this.lastResetDate) {
            this.usageCount = 0;
            this.lastResetDate = today;
        }

        // Check if we've exceeded the daily cap
        if (this.providerConfig.dailyCap && this.usageCount >= this.providerConfig.dailyCap) {
            throw new Error(`Daily translation cap exceeded (${this.providerConfig.dailyCap})`);
        }

        this.usageCount++;
    }

    /**
     * Get current usage statistics
     */
    getUsageStats(): { count: number; cap?: number; resetDate: string } {
        return {
            count: this.usageCount,
            cap: this.providerConfig.dailyCap,
            resetDate: this.lastResetDate,
        };
    }
}
