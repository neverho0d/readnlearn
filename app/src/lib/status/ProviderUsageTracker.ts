/**
 * Provider Usage Tracker
 *
 * Tracks and updates provider usage for the status bar.
 * Automatically updates usage from drivers and refreshes the status store.
 */

import { statusStore } from "./StatusStore";
import { OpenAIDriver } from "../../adapters/llm/OpenAIDriver";
import { GoogleAIDriver } from "../../adapters/llm/GoogleAIDriver";

class ProviderUsageTracker {
    private openaiDriver: OpenAIDriver;
    private googleDriver: GoogleAIDriver;
    private updateInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.openaiDriver = new OpenAIDriver();
        this.googleDriver = new GoogleAIDriver();
        this.loadSettings();
    }

    /**
     * Load settings from localStorage and update driver daily caps
     */
    private loadSettings(): void {
        try {
            const settingsData = localStorage.getItem("readnlearn-settings");
            if (settingsData) {
                const settings = JSON.parse(settingsData);

                // Update daily caps from settings (use user-defined values)
                const openaiCap = settings.dailyCapOpenAI || 50; // Default $50 if not set
                const googleCap = settings.dailyCapGoogle || 50; // Default $50 if not set

                this.openaiDriver.updateDailyCap(openaiCap);
                this.googleDriver.updateDailyCap(googleCap);

                console.log("ProviderUsageTracker: Loaded settings", {
                    openaiCap,
                    googleCap,
                });
            }
        } catch (error) {
            console.warn("ProviderUsageTracker: Failed to load settings:", error);
        }
    }

    /**
     * Start tracking provider usage
     */
    startTracking(): void {
        // Update immediately
        this.updateUsage();

        // Update every 30 seconds
        this.updateInterval = setInterval(() => {
            this.updateUsage();
        }, 60000);

        // Listen for settings changes
        window.addEventListener("readnlearn:settings-updated", () => {
            console.log("ProviderUsageTracker: Settings updated, refreshing...");
            this.refreshSettings();
        });
    }

    /**
     * Stop tracking provider usage
     */
    stopTracking(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update provider usage from drivers
     */
    private async updateUsage(): Promise<void> {
        try {
            // Get usage from both drivers
            const [openaiUsage, googleUsage] = await Promise.all([
                this.openaiDriver.getUsage(),
                this.googleDriver.getUsage(),
            ]);

            // Update status store with current usage
            statusStore.updateProviderUsage("openai", {
                used: openaiUsage.costUsd,
                limit: this.openaiDriver.dailyCap,
            });

            statusStore.updateProviderUsage("google", {
                used: googleUsage.costUsd,
                limit: this.googleDriver.dailyCap,
            });

            // console.log("ProviderUsageTracker: Updated usage", {
            //     openai: { used: openaiUsage.costUsd, limit: this.openaiDriver.dailyCap },
            //     google: { used: googleUsage.costUsd, limit: this.googleDriver.dailyCap },
            // });
        } catch (error) {
            console.error("ProviderUsageTracker: Failed to update usage", error);
        }
    }

    /**
     * Force update usage (call after significant operations)
     */
    async forceUpdate(): Promise<void> {
        await this.updateUsage();
    }

    /**
     * Refresh settings and update driver daily caps
     */
    refreshSettings(): void {
        this.loadSettings();
        // Force update usage with new caps
        this.forceUpdate();
    }
}

// Global instance
export const providerUsageTracker = new ProviderUsageTracker();

// Auto-start tracking when module loads
providerUsageTracker.startTracking();
