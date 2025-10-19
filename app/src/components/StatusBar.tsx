/**
 * Status Bar Component
 *
 * Displays background tasks count and provider usage at the bottom of the screen.
 * Clicking on task count opens detailed popup with task list.
 */

import React, { useEffect } from "react";
import { useStatusBar } from "../lib/status/StatusStore";
import { TaskDetailsPopup } from "./TaskDetailsPopup";
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

    // Refresh provider usage when component mounts and when settings change
    useEffect(() => {
        refreshProviderUsage();

        // Also listen for settings changes to refresh usage
        const handleSettingsUpdate = () => {
            console.log("StatusBar: Settings updated, refreshing provider usage...");
            refreshProviderUsage();
        };

        window.addEventListener("readnlearn:settings-updated", handleSettingsUpdate);

        return () => {
            window.removeEventListener("readnlearn:settings-updated", handleSettingsUpdate);
        };
    }, [refreshProviderUsage]);

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
