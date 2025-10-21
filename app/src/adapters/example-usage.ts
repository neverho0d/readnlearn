/**
 * Example usage of the new adapter architecture
 *
 * This file demonstrates how to use the new LLM adapter system
 */

import { OpenAIDriver } from "./llm/OpenAIDriver";
import { GoogleAIDriver } from "./llm/GoogleAIDriver";
import { TranslationAdapter } from "./translation/TranslationAdapter";
import { StoryAdapter } from "./story/StoryAdapter";
import { ClozeAdapter } from "./cloze/ClozeAdapter";
import { postponedQueue } from "./base/postponedQueue";

// Example: Initialize drivers and adapters
export function initializeAdapters() {
    // Create LLM drivers
    const openaiDriver = new OpenAIDriver();
    const googleDriver = new GoogleAIDriver();

    // Create adapters with driver selection
    const translationAdapter = new TranslationAdapter([googleDriver, openaiDriver]);
    const storyAdapter = new StoryAdapter([googleDriver, openaiDriver]);
    const clozeAdapter = new ClozeAdapter([googleDriver, openaiDriver]);

    return {
        translationAdapter,
        storyAdapter,
        clozeAdapter,
    };
}

// Example: Handle postponed requests on app startup
export async function processPostponedRequests() {
    try {
        const retryableRequests = await postponedQueue.getRetryableRequests();

        for (const request of retryableRequests) {
            console.log(`Retrying ${request.type} request:`, request.id);

            // Here you would retry the request with the appropriate adapter
            // and remove it from the queue if successful

            // Update retry count
            await postponedQueue.updateRetryCount(request.id, request.retryCount + 1);
        }

        // Clean up expired requests
        await postponedQueue.cleanupExpiredRequests();
    } catch (error) {
        console.error("Failed to process postponed requests:", error);
    }
}

// Example: Usage in a React component
export async function exampleUsage() {
    const { translationAdapter, storyAdapter, clozeAdapter } = initializeAdapters();

    try {
        // Translation example
        const translationResult = await translationAdapter.translate({
            text: "Hello world",
            context: "A greeting",
            l1: "en",
            l2: "es",
            level: "A2",
            difficulties: [],
        });
        console.log("Translation:", translationResult);

        // Story generation example
        const storyResult = await storyAdapter.generateStory({
            phrases: [
                { id: "1", text: "hello", translation: "hola", context: "" },
                { id: "2", text: "world", translation: "mundo", context: "" },
            ],
            context: {
                l1: "en",
                l2: "es",
                proficiency: "beginner",
            },
            wordCount: 100,
        });
        console.log("Story:", storyResult);

        // Cloze generation example
        const clozeResult = await clozeAdapter.generateCloze({
            phrase: "hello world",
            translation: "hola mundo",
            context: "This is a simple greeting phrase for beginners learning Spanish.",
            difficulty: "prepositions",
        });
        console.log("Cloze exercises:", clozeResult);
    } catch (error) {
        console.error("Adapter operation failed:", error);

        // If all providers failed, you could add the request to the postponed queue
        // await postponedQueue.addRequest("translation", requestData);
    }
}
