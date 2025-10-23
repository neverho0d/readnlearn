/**
 * Status Bar Component
 *
 * Displays background tasks count and provider usage at the bottom of the screen.
 * Clicking on task count opens detailed popup with task list.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useStatusBar } from "../lib/status/StatusStore";
import { TaskDetailsPopup } from "./TaskDetailsPopup";
import { UsageIndicator } from "./UsageIndicator";
import { UsageTracker, UsageStats } from "../lib/usage/UsageTracker";
import "./StatusBar.css";

export const StatusBar: React.FC = () => {
    const {
        runningTasksCount,
        providerUsage,
        isDetailsOpen,
        toggleDetails,
        getAllTasks,
        refreshProviderUsage,
    } = useStatusBar();

    // Translation usage state
    const [translationUsage, setTranslationUsage] = useState<{
        deepl: UsageStats;
        google: UsageStats;
        hasAvailableProviders: boolean;
    } | null>(null);

    // Load translation usage data
    const loadTranslationUsage = useCallback(async () => {
        try {
            const usageTracker = UsageTracker.getInstance();
            const usage = await usageTracker.getUsageSummary();
            setTranslationUsage(usage);
        } catch (error) {
            console.error("Failed to load translation usage:", error);
        }
    }, []);

    // Load translation usage data once on mount
    useEffect(() => {
        loadTranslationUsage();
    }, []); // Empty dependency array - only run once on mount

    // Refresh provider usage when component mounts and when settings change
    useEffect(() => {
        refreshProviderUsage();

        // Also listen for settings changes to refresh usage
        const handleSettingsUpdate = () => {
            console.log("StatusBar: Settings updated, refreshing provider usage...");
            refreshProviderUsage();
        };

        // Listen for translation usage updates
        const handleTranslationUpdate = () => {
            console.log("StatusBar: Translation usage updated, refreshing...");
            loadTranslationUsage();
        };

        window.addEventListener("readnlearn:settings-updated", handleSettingsUpdate);
        window.addEventListener("readnlearn:translation-usage-updated", handleTranslationUpdate);

        return () => {
            window.removeEventListener("readnlearn:settings-updated", handleSettingsUpdate);
            window.removeEventListener(
                "readnlearn:translation-usage-updated",
                handleTranslationUpdate,
            );
        };
    }, [refreshProviderUsage, loadTranslationUsage]);

    const allTasks = getAllTasks();
    const runningTasks = allTasks.filter(
        (task) => task.status === "processing" || task.status === "pending",
    );
    const completedTasks = allTasks.filter(
        (task) => task.status === "completed" || task.status === "failed",
    );

    return (
        <div className="status-bar">
            <div className="status-bar-content">
                <button
                    onClick={() => toggleDetails()}
                    className="task-counter"
                    disabled={allTasks.length === 0}
                >
                    {runningTasksCount > 0 && <span className="task-loader">⟳</span>}
                    {runningTasksCount > 0 ? `${runningTasksCount} tasks` : "0 tasks"}
                </button>

                <div className="provider-usage">
                    <span className="provider-item">
                        OpenAI: ${providerUsage.openai.used.toFixed(2)}/$
                        {providerUsage.openai.limit}
                    </span>
                    <span className="provider-separator">|</span>
                    <span className="provider-item">
                        Google: ${providerUsage.google.used.toFixed(2)}/$
                        {providerUsage.google.limit}
                    </span>

                    {/* Translation Usage Indicators */}
                    {translationUsage && (
                        <>
                            <span className="provider-separator">|</span>
                            <div className="translation-usage">
                                <UsageIndicator provider="deepl" usage={translationUsage.deepl} />
                                <UsageIndicator provider="google" usage={translationUsage.google} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isDetailsOpen && (
                <TaskDetailsPopup
                    runningTasks={runningTasks}
                    completedTasks={completedTasks}
                    onClose={() => toggleDetails(false)}
                />
            )}
        </div>
    );
};
