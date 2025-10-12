/**
 * Authentication Context
 *
 * Provides authentication state management using Supabase Auth.
 * Handles session management, login/logout, and user state.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    // eslint-disable-next-line no-unused-vars
    signIn: (email: string, password: string) => Promise<{ error: unknown }>;
    // eslint-disable-next-line no-unused-vars
    signUp: (email: string, password: string) => Promise<{ error: unknown }>;
    signOut: () => Promise<void>;
    // eslint-disable-next-line no-unused-vars
    resetPassword: (email: string) => Promise<{ error: unknown }>;
    signInWithGitHub: () => Promise<{ error: unknown }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("🔐 AuthContext: Initializing authentication...");

        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("❌ AuthContext: Session error:", error);
            } else {
                console.log(
                    "✅ AuthContext: Initial session:",
                    session ? "authenticated" : "not authenticated",
                );
            }
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // Handle session events
            if (event === "SIGNED_IN") {
                console.log("User signed in");
            } else if (event === "SIGNED_OUT") {
                console.log("User signed out");
            } else if (event === "TOKEN_REFRESHED") {
                console.log("Token refreshed");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            return { error };
        } catch (error) {
            return { error };
        }
    };

    const signUp = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            return { error };
        } catch (error) {
            return { error };
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const resetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            return { error };
        } catch (error) {
            return { error };
        }
    };

    const signInWithGitHub = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "github",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            return { error };
        } catch (error) {
            return { error };
        }
    };

    const value: AuthContextType = {
        session,
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInWithGitHub,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
