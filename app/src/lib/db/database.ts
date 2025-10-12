/**
 * Database Module
 *
 * This module provides the database adapter for the application.
 * It uses Supabase as the primary database with IndexedDB caching for offline support.
 */

import { SupabaseAdapter } from "./adapters/SupabaseAdapter";
import { DatabaseAdapter } from "./adapters/DatabaseAdapter";

/**
 * Get the database adapter instance
 *
 * @returns Promise<DatabaseAdapter> - The database adapter instance
 */
export async function getDatabaseAdapter(): Promise<DatabaseAdapter> {
    const adapter = new SupabaseAdapter();
    await adapter.connect();
    return adapter;
}
