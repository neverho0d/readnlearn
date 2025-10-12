import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "../../../../src/lib/auth/AuthContext";

// Mock Supabase client
vi.mock("../../../../src/lib/supabase/client", () => ({
    supabase: {
        auth: {
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } },
            })),
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            resetPasswordForEmail: vi.fn(),
            signInWithOAuth: vi.fn(),
        },
    },
}));

const TestComponent = () => {
    const { session, loading, signIn, signUp, signOut, resetPassword, signInWithGitHub } =
        useAuth();

    return (
        <div>
            <div data-testid="loading">{loading ? "loading" : "not loading"}</div>
            <div data-testid="session">{session ? "authenticated" : "not authenticated"}</div>
            <button onClick={() => signIn("test@example.com", "password")}>Sign In</button>
            <button onClick={() => signUp("test@example.com", "password")}>Sign Up</button>
            <button onClick={() => signOut()}>Sign Out</button>
            <button onClick={() => resetPassword("test@example.com")}>Reset Password</button>
            <button onClick={() => signInWithGitHub()}>GitHub Sign In</button>
        </div>
    );
};

describe("AuthContext", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should provide authentication context", () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>,
        );

        expect(screen.getByTestId("loading")).toBeInTheDocument();
        expect(screen.getByTestId("session")).toBeInTheDocument();
    });

    it("should handle sign in", async () => {
        const { supabase } = await import("../../../../src/lib/supabase/client");
        vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
            data: { user: { id: "123" }, session: { access_token: "token" } },
            error: null,
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>,
        );

        const signInButton = screen.getByText("Sign In");
        signInButton.click();

        await waitFor(() => {
            expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: "test@example.com",
                password: "password",
            });
        });
    });

    it("should handle sign up", async () => {
        const { supabase } = await import("../../../../src/lib/supabase/client");
        vi.mocked(supabase.auth.signUp).mockResolvedValue({
            data: { user: { id: "123" }, session: null },
            error: null,
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>,
        );

        const signUpButton = screen.getByText("Sign Up");
        signUpButton.click();

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalledWith({
                email: "test@example.com",
                password: "password",
            });
        });
    });

    it("should handle sign out", async () => {
        const { supabase } = await import("../../../../src/lib/supabase/client");
        vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>,
        );

        const signOutButton = screen.getByText("Sign Out");
        signOutButton.click();

        await waitFor(() => {
            expect(supabase.auth.signOut).toHaveBeenCalled();
        });
    });

    it("should handle password reset", async () => {
        const { supabase } = await import("../../../../src/lib/supabase/client");
        vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ error: null });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>,
        );

        const resetButton = screen.getByText("Reset Password");
        resetButton.click();

        await waitFor(() => {
            expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("test@example.com", {
                redirectTo: "http://localhost:3000/reset-password",
            });
        });
    });

    it("should handle GitHub OAuth", async () => {
        const { supabase } = await import("../../../../src/lib/supabase/client");
        vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
            data: { url: "github.com" },
            error: null,
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>,
        );

        const githubButton = screen.getByText("GitHub Sign In");
        githubButton.click();

        await waitFor(() => {
            expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
                provider: "github",
                options: {
                    redirectTo: expect.any(String),
                },
            });
        });
    });
});
