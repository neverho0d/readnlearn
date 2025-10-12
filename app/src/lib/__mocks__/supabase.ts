/**
 * Supabase Mock for Testing
 *
 * Provides mock implementations of Supabase client for testing.
 */

import { vi } from "vitest";

export const mockSupabase = {
    auth: {
        getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: null,
        }),
        signUp: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: null,
        }),
        signOut: vi.fn().mockResolvedValue({
            error: null,
        }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({
            error: null,
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
        }),
    },
    from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
        }),
    }),
    channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
    }),
};

// Mock the supabase client
vi.mock("../supabase/client", () => ({
    supabase: mockSupabase,
}));
