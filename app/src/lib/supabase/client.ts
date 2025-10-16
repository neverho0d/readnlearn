/**
 * Supabase Client Configuration
 *
 * This module provides the Supabase client instance for database operations,
 * authentication, and real-time subscriptions.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mock.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "mock-anon-key";

// Only throw error in development, not in test environments
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    if (import.meta.env.MODE !== "test" && import.meta.env.MODE !== "production") {
        console.warn("Missing Supabase environment variables. Using mock values for testing.");
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Tauri-specific configuration
        flowType: "pkce",
        debug: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
    // Add global headers for Tauri
    global: {
        headers: {
            "X-Client-Info": "readnlearn-tauri",
        },
    },
});

// Database types for type safety
export interface Database {
    public: {
        Tables: {
            phrases: {
                Row: {
                    id: string;
                    user_id: string;
                    lang: string;
                    text: string;
                    translation: string | null;
                    context: string | null;
                    tags: string[];
                    added_at: string;
                    source_file: string | null;
                    content_hash: string | null;
                    line_no: number | null;
                    col_offset: number | null;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    lang: string;
                    text: string;
                    translation?: string | null;
                    context?: string | null;
                    tags?: string[];
                    added_at?: string;
                    source_file?: string | null;
                    content_hash?: string | null;
                    line_no?: number | null;
                    col_offset?: number | null;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    lang?: string;
                    text?: string;
                    translation?: string | null;
                    context?: string | null;
                    tags?: string[];
                    added_at?: string;
                    source_file?: string | null;
                    content_hash?: string | null;
                    line_no?: number | null;
                    col_offset?: number | null;
                    updated_at?: string;
                };
            };
            user_settings: {
                Row: {
                    user_id: string;
                    l1: string;
                    l2: string;
                    l2_auto_detect: boolean;
                    font: string | null;
                    font_size: number;
                    theme: string;
                    updated_at: string;
                };
                Insert: {
                    user_id: string;
                    l1?: string;
                    l2?: string;
                    l2_auto_detect?: boolean;
                    font?: string | null;
                    font_size?: number;
                    theme?: string;
                    updated_at?: string;
                };
                Update: {
                    user_id?: string;
                    l1?: string;
                    l2?: string;
                    l2_auto_detect?: boolean;
                    font?: string | null;
                    font_size?: number;
                    theme?: string;
                    updated_at?: string;
                };
            };
        };
    };
}
