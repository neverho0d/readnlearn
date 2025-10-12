/**
 * Sync Service
 *
 * Handles bidirectional synchronization between IndexedDB cache and Supabase.
 * Manages offline operations, conflict resolution, and real-time updates.
 */

import { supabase } from "../supabase/client";
import { cache } from "../cache/indexedDB";
import { SavedPhrase } from "../db/phraseStore";

export class SyncService {
    private isOnline: boolean = navigator.onLine;
    private syncInProgress: boolean = false;

    constructor() {
        // Listen for online/offline events
        window.addEventListener("online", () => {
            this.isOnline = true;
            this.syncUp();
        });

        window.addEventListener("offline", () => {
            this.isOnline = false;
        });

        // Set up real-time subscriptions
        this.setupRealtimeSubscriptions();
    }

    /**
     * Sync queued operations from local cache to Supabase
     */
    async syncUp(): Promise<void> {
        if (!this.isOnline || this.syncInProgress) return;

        this.syncInProgress = true;
        console.log("Starting sync up...");

        try {
            const queuedOps = await cache.getQueuedOperations();
            console.log(`Syncing ${queuedOps.length} queued operations`);

            for (const op of queuedOps) {
                try {
                    await this.executeOperation(op.operation, op.data);
                    console.log(`Successfully synced ${op.operation} operation`);
                } catch (error) {
                    console.error(`Failed to sync ${op.operation} operation:`, error);
                    // Keep the operation in queue for retry
                }
            }

            // Clear successfully synced operations
            await cache.clearQueuedOperations();
            console.log("Sync up completed");
        } catch (error) {
            console.error("Sync up failed:", error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Sync latest data from Supabase to local cache
     */
    async syncDown(): Promise<void> {
        if (!this.isOnline) return;

        try {
            console.log("Starting sync down...");

            // Get current user
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch latest phrases from Supabase
            const { data: phrases, error } = await supabase
                .from("phrases")
                .select("*")
                .eq("user_id", user.id)
                .order("updated_at", { ascending: false });

            if (error) {
                console.error("Failed to fetch phrases from Supabase:", error);
                return;
            }

            // Update local cache
            if (phrases) {
                await cache.updatePhrases(phrases);
                console.log(`Synced ${phrases.length} phrases from Supabase`);
            }
        } catch (error) {
            console.error("Sync down failed:", error);
        }
    }

    /**
     * Handle conflicts between local and remote data
     */
    async handleConflicts(): Promise<void> {
        // For now, implement last-write-wins strategy
        // In the future, this could be enhanced with user resolution UI
        console.log("Handling conflicts with last-write-wins strategy");
    }

    /**
     * Set up real-time subscriptions for live updates
     */
    private setupRealtimeSubscriptions(): void {
        if (!this.isOnline) return;

        supabase
            .channel("phrases")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "phrases" },
                (payload) => {
                    console.log("Received real-time update:", payload);
                    cache.handleRealtimeUpdate(payload);
                },
            )
            .subscribe();
    }

    /**
     * Execute a specific operation on Supabase
     */
    private async executeOperation(operation: string, data: unknown): Promise<void> {
        switch (operation) {
            case "insert":
                await this.syncInsert(data as SavedPhrase);
                break;
            case "update":
                await this.syncUpdate(data as SavedPhrase);
                break;
            case "delete":
                await this.syncDelete(data as { id: string });
                break;
            default:
                console.warn(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Sync insert operation
     */
    private async syncInsert(data: SavedPhrase): Promise<void> {
        const { error } = await supabase.from("phrases").insert({
            ...data,
            updated_at: new Date().toISOString(),
        });

        if (error) throw error;
    }

    /**
     * Sync update operation
     */
    private async syncUpdate(data: SavedPhrase): Promise<void> {
        const { error } = await supabase
            .from("phrases")
            .update({
                ...data,
                updated_at: new Date().toISOString(),
            })
            .eq("id", data.id);

        if (error) throw error;
    }

    /**
     * Sync delete operation
     */
    private async syncDelete(data: { id: string }): Promise<void> {
        const { error } = await supabase.from("phrases").delete().eq("id", data.id);

        if (error) throw error;
    }

    /**
     * Force a full sync (useful for initial setup)
     */
    async forceSync(): Promise<void> {
        console.log("Starting force sync...");
        await this.syncDown();
        await this.syncUp();
        console.log("Force sync completed");
    }

    /**
     * Get sync status
     */
    getSyncStatus(): { isOnline: boolean; syncInProgress: boolean } {
        return {
            isOnline: this.isOnline,
            syncInProgress: this.syncInProgress,
        };
    }
}

// Export singleton instance
export const syncService = new SyncService();
