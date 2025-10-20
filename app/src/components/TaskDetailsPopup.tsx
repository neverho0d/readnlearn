/**
 * Task Details Popup Component
 *
 * Shows detailed list of background tasks with their status.
 * Displays running tasks and completed/failed tasks until next run.
 */

import React from "react";
import { BackgroundTask } from "../lib/status/StatusStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import "./StatusBar.css";

interface TaskDetailsPopupProps {
    runningTasks: BackgroundTask[];
    completedTasks: BackgroundTask[];
    onClose: () => void;
}

export const TaskDetailsPopup: React.FC<TaskDetailsPopupProps> = ({
    runningTasks,
    completedTasks,
    onClose,
}) => {
    const allTasks = [...runningTasks, ...completedTasks];
    const totalTasks = allTasks.length;

    const getTaskIcon = (status: BackgroundTask["status"]) => {
        switch (status) {
            case "processing":
                return "🔄";
            case "pending":
                return "⏳";
            case "completed":
                return "✅";
            case "failed":
                return "❌";
            default:
                return "❓";
        }
    };

    const getTaskTypeLabel = (type: BackgroundTask["type"]) => {
        switch (type) {
            case "translation":
                return "Translating";
            case "story_generation":
                return "Generating story for";
            case "card_generation":
                return "Generating cards for";
            default:
                return "Processing";
        }
    };

    const formatPhrase = (phrase: string) => {
        if (phrase.length <= 50) return phrase;
        return phrase.substring(0, 47) + "...";
    };

    return (
        <div className="task-details-popup">
            <div className="popup-header">
                <h3>Background Tasks ({totalTasks})</h3>
                <button onClick={onClose} className="close-button">
                    <FontAwesomeIcon icon={faTimes} />
                </button>
            </div>

            <div className="task-list">
                {allTasks.length === 0 ? (
                    <div className="no-tasks">No background tasks</div>
                ) : (
                    allTasks.map((task) => (
                        <div key={task.id} className={`task-item ${task.status}`}>
                            <div className="task-icon">{getTaskIcon(task.status)}</div>
                            <div className="task-info">
                                <div className="task-type">{getTaskTypeLabel(task.type)}</div>
                                <div className="task-phrase">"{formatPhrase(task.phrase)}"</div>
                                {task.error && (
                                    <div className="task-error">Error: {task.error}</div>
                                )}
                                {task.status === "completed" && (
                                    <div className="task-completed">
                                        Completed{" "}
                                        {task.endTime
                                            ? new Date(task.endTime).toLocaleTimeString()
                                            : "recently"}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
