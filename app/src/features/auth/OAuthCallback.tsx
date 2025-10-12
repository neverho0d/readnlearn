/**
 * OAuth Callback Component
 *
 * Handles OAuth redirects from providers like GitHub.
 * Processes the authentication callback and redirects to the main app.
 */

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";

export const OAuthCallback: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    setError(error.message);
                    setLoading(false);
                    return;
                }

                if (data.session) {
                    // Successfully authenticated, redirect to main app
                    window.location.href = "/";
                } else {
                    setError("Authentication failed");
                    setLoading(false);
                }
            } catch (_err) {
                setError("An unexpected error occurred");
                setLoading(false);
            }
        };

        handleAuthCallback();
    }, []);

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        border: "4px solid var(--border)",
                        borderTop: "4px solid var(--primary)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                    }}
                />
                <p style={{ color: "var(--text-primary)" }}>Completing authentication...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                <div
                    style={{
                        color: "var(--error)",
                        textAlign: "center",
                        padding: "2rem",
                        backgroundColor: "var(--error-bg)",
                        borderRadius: "8px",
                        border: "1px solid var(--error)",
                        maxWidth: "400px",
                    }}
                >
                    <h2 style={{ marginBottom: "1rem" }}>Authentication Error</h2>
                    <p style={{ marginBottom: "1rem" }}>{error}</p>
                    <button
                        onClick={() => (window.location.href = "/")}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: "var(--primary)",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Return to App
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
