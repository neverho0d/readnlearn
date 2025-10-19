/**
 * Global Status Store
 *
 * Manages background tasks and provider usage for the status bar.
 * Provides real-time updates for translation and story generation processes.
 */

export interface BackgroundTask {
    id: string;
    type: "translation" | "story_generation";
    status: "pending" | "processing" | "completed" | "failed";
    phrase: string; // First 50 characters for display
    phraseId: string;
    startTime: Date;
    endTime?: Date;
    error?: string;
}

export interface ProviderUsage {
    used: number;
    limit: number;
}

export interface StatusBarState {
    tasks: BackgroundTask[];
    providerUsage: {
        openai: ProviderUsage;
        google: ProviderUsage;
    };
    isDetailsOpen: boolean;
}

class StatusStore {
    private state: StatusBarState = {
        tasks: [],
        providerUsage: {
            openai: { used: 0, limit: 50 },
            google: { used: 0, limit: 50 },
        },
        isDetailsOpen: false,
    };

    private listeners: Set<() => void> = new Set();

    /**
     * Subscribe to state changes
     */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Get current state
     */
    getState(): StatusBarState {
        return { ...this.state };
    }

    /**
     * Notify all listeners of state changes
     */
    private notify(): void {
        this.listeners.forEach((listener) => listener());
    }

    /**
     * Add a new background task
     */
    addTask(task: Omit<BackgroundTask, "id" | "startTime">): string {
        const id = crypto.randomUUID();
        const newTask: BackgroundTask = {
            ...task,
            id,
            startTime: new Date(),
        };

        this.state.tasks.push(newTask);
        this.notify();

        console.log(`StatusStore: Added task ${id} (${task.type}) for "${task.phrase}"`);
        return id;
    }

    /**
     * Update an existing task
     */
    updateTask(id: string, updates: Partial<BackgroundTask>): void {
        const taskIndex = this.state.tasks.findIndex((task) => task.id === id);
        if (taskIndex === -1) {
            console.warn(`StatusStore: Task ${id} not found for update`);
            return;
        }

        this.state.tasks[taskIndex] = {
            ...this.state.tasks[taskIndex],
            ...updates,
        };
        this.notify();

        console.log(`StatusStore: Updated task ${id}`, updates);
    }

    /**
     * Complete a task (success or failure)
     */
    completeTask(id: string, status: "completed" | "failed", error?: string): void {
        this.updateTask(id, {
            status,
            endTime: new Date(),
            error,
        });
    }

    /**
     * Remove completed/failed tasks of a specific type
     */
    clearCompletedTasks(type: "translation" | "story_generation"): void {
        this.state.tasks = this.state.tasks.filter(
            (task) =>
                !(task.type === type && (task.status === "completed" || task.status === "failed")),
        );
        this.notify();

        console.log(`StatusStore: Cleared completed ${type} tasks`);
    }

    /**
     * Update provider usage
     */
    updateProviderUsage(provider: "openai" | "google", usage: ProviderUsage): void {
        this.state.providerUsage[provider] = usage;
        this.notify();
    }

    /**
     * Toggle details popup
     */
    toggleDetails(open?: boolean): void {
        this.state.isDetailsOpen = open !== undefined ? open : !this.state.isDetailsOpen;
        this.notify();
    }

    /**
     * Get running tasks count
     */
    getRunningTasksCount(): number {
        return this.state.tasks.filter(
            (task) => task.status === "processing" || task.status === "pending",
        ).length;
    }

    /**
     * Get tasks by status
     */
    getTasksByStatus(status: BackgroundTask["status"]): BackgroundTask[] {
        return this.state.tasks.filter((task) => task.status === status);
    }

    /**
     * Get all tasks (running + completed)
     */
    getAllTasks(): BackgroundTask[] {
        return [...this.state.tasks];
    }

    /**
     * Force refresh provider usage data
     */
    async refreshProviderUsage(): Promise<void> {
        try {
            const { providerUsageTracker } = await import("./ProviderUsageTracker");
            await providerUsageTracker.forceUpdate();
        } catch (error) {
            console.error("StatusStore: Failed to refresh provider usage:", error);
        }
    }
}

// Global instance
export const statusStore = new StatusStore();

// React hook for components
export const useStatusBar = () => {
    const [state, setState] = React.useState(statusStore.getState());

    React.useEffect(() => {
        const unsubscribe = statusStore.subscribe(() => {
            setState(statusStore.getState());
        });

        return unsubscribe;
    }, []);

    return {
        ...state,
        runningTasksCount: statusStore.getRunningTasksCount(),
        toggleDetails: statusStore.toggleDetails.bind(statusStore),
        addTask: statusStore.addTask.bind(statusStore),
        updateTask: statusStore.updateTask.bind(statusStore),
        completeTask: statusStore.completeTask.bind(statusStore),
        clearCompletedTasks: statusStore.clearCompletedTasks.bind(statusStore),
        updateProviderUsage: statusStore.updateProviderUsage.bind(statusStore),
        getAllTasks: statusStore.getAllTasks.bind(statusStore),
        refreshProviderUsage: statusStore.refreshProviderUsage.bind(statusStore),
    };
};

// Import React for the hook
import React from "react";
