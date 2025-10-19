import { updatePhraseTranslation } from "../db/phraseStore";
import { TranslationAdapter } from "../../adapters/translation/TranslationAdapter";
import { OpenAIDriver } from "../../adapters/llm/OpenAIDriver";
import { GoogleAIDriver } from "../../adapters/llm/GoogleAIDriver";
import { statusStore } from "../status/StatusStore";

// Helper function to get user settings from localStorage
async function getUserSettings() {
    try {
        const settingsData = localStorage.getItem("readnlearn-settings");
        if (!settingsData) {
            console.warn("No settings found in localStorage");
            return null;
        }

        const settings = JSON.parse(settingsData);
        console.log("Loaded settings for translation:", {
            hasOpenAIKey: !!settings.openaiApiKey,
            dailyCap: settings.dailyCapOpenAI,
        });
        return {
            openaiApiKey: settings.openaiApiKey,
            openaiDailyCap: settings.dailyCapOpenAI,
            googleApiKey: settings.googleApiKey,
            googleDailyCap: settings.dailyCapGoogle,
        };
    } catch (error) {
        console.error("Failed to load settings:", error);
        return null;
    }
}

interface TranslateJob {
    phraseId: string;
    text: string;
    context: string;
    l1: string;
    l2: string;
    level: string;
    difficulties: string[];
}

const inFlight = new Set<string>();
const translatingPhrases = new Set<string>();

function jobKey(j: TranslateJob): string {
    return `${j.text}::${j.l2}->${j.l1}::${j.level}::${j.difficulties.join(",")}`;
}

export async function queueTranslate(job: TranslateJob): Promise<void> {
    const key = jobKey(job);
    if (inFlight.has(key)) return;
    console.log("queueTranslate", key);
    console.log("job", job);
    inFlight.add(key);
    translatingPhrases.add(job.phraseId);

    // Dispatch event to notify UI that translation started
    try {
        window.dispatchEvent(
            new CustomEvent("readnlearn:translation-started", {
                detail: { phraseId: job.phraseId },
            }),
        );
    } catch {
        // ignore event dispatch errors
    }

    // Add status task for translation
    const taskId = statusStore.addTask({
        type: "translation",
        status: "processing",
        phrase: job.text.substring(0, 50),
        phraseId: job.phraseId,
    });

    try {
        // Get user settings for adapter configuration
        const settings = await getUserSettings();

        if (!settings) {
            statusStore.completeTask(
                taskId,
                "failed",
                "Settings not available - please configure your API keys in Settings",
            );
            throw new Error("Settings not available - please configure your API keys in Settings");
        }

        // Create drivers
        const openaiDriver = new OpenAIDriver();
        const googleDriver = new GoogleAIDriver();

        // Update daily caps from settings (use user-defined values)
        const openaiCap = settings.openaiDailyCap || 50; // Default $50 if not set
        const googleCap = settings.googleDailyCap || 50; // Default $50 if not set

        openaiDriver.updateDailyCap(openaiCap);
        googleDriver.updateDailyCap(googleCap);

        // Create translation adapter with drivers
        const adapter = new TranslationAdapter([googleDriver, openaiDriver]);

        // Use the adapter to translate
        const result = await adapter.translate({
            text: job.text,
            context: job.context,
            l1: job.l1,
            l2: job.l2,
            level: job.level,
            difficulties: job.difficulties,
        });

        // Update the phrase with the translation result
        await updatePhraseTranslation(job.phraseId, result.translation, result.explanation);

        // Mark translation task as completed
        statusStore.completeTask(taskId, "completed");
    } catch (error) {
        console.error("Translation failed:", error);

        // Mark translation task as failed
        statusStore.completeTask(
            taskId,
            "failed",
            error instanceof Error ? error.message : "Unknown error",
        );

        // Could dispatch an error event here for UI feedback
        throw error;
    } finally {
        inFlight.delete(key);
        translatingPhrases.delete(job.phraseId);

        // Dispatch event to notify UI that translation finished
        try {
            window.dispatchEvent(
                new CustomEvent("readnlearn:translation-finished", {
                    detail: { phraseId: job.phraseId },
                }),
            );
        } catch {
            // ignore event dispatch errors
        }
    }
}

export function isPhraseTranslating(phraseId: string): boolean {
    return translatingPhrases.has(phraseId);
}
