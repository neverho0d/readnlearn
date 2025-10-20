/**
 * Signup Form Component
 *
 * Provides user registration interface with email/password signup.
 */

import React, { useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";

interface SignupFormProps {
    onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const { signUp, signInWithGitHub } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validate passwords match
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        // Validate password strength
        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            setLoading(false);
            return;
        }

        try {
            const { error } = await signUp(email, password);

            if (error) {
                setError((error as Error).message || "An error occurred");
            } else {
                setSuccess(true);
            }
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleGitHubSignIn = async () => {
        setLoading(true);
        setError(null);

        try {
            const { error } = await signInWithGitHub();
            if (error) {
                setError((error as Error).message || "An error occurred");
            }
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div
                style={{
                    maxWidth: "400px",
                    margin: "0 auto",
                    padding: "2rem",
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: "8px",
                    boxShadow: `0 4px 6px var(--dropdown-shadow)`,
                    textAlign: "center",
                }}
            >
                <h2
                    style={{
                        color: "var(--success)",
                        marginBottom: "1rem",
                    }}
                >
                    Check your email!
                </h2>
                <p
                    style={{
                        color: "var(--text-primary)",
                        marginBottom: "1.5rem",
                    }}
                >
                    We've sent you a confirmation link. Please check your email and click the link
                    to verify your account.
                </p>
                <button
                    onClick={onSwitchToLogin}
                    style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "var(--primary)",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Back to Sign In
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                maxWidth: "400px",
                margin: "0 auto",
                padding: "2rem",
                backgroundColor: "var(--bg-secondary)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
        >
            <h2
                style={{
                    textAlign: "center",
                    marginBottom: "1.5rem",
                    color: "var(--text-primary)",
                }}
            >
                Create Account
            </h2>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "1rem" }}>
                    <label
                        style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            color: "var(--text-primary)",
                        }}
                    >
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            backgroundColor: "var(--bg-primary)",
                            color: "var(--text-primary)",
                        }}
                    />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                    <label
                        style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            color: "var(--text-primary)",
                        }}
                    >
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            backgroundColor: "var(--bg-primary)",
                            color: "var(--text-primary)",
                        }}
                    />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                    <label
                        style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            color: "var(--text-primary)",
                        }}
                    >
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            backgroundColor: "var(--bg-primary)",
                            color: "var(--text-primary)",
                        }}
                    />
                </div>

                {error && (
                    <div
                        style={{
                            color: "var(--error)",
                            marginBottom: "1rem",
                            padding: "0.5rem",
                            backgroundColor: "var(--error-bg)",
                            borderRadius: "4px",
                            border: "1px solid var(--error)",
                        }}
                    >
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "0.75rem",
                        backgroundColor: "var(--primary)",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.7 : 1,
                    }}
                >
                    {loading ? "Creating account..." : "Create Account"}
                </button>
            </form>

            <div
                style={{
                    margin: "1.5rem 0",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                }}
            >
                <span>or</span>
            </div>

            <button
                type="button"
                onClick={handleGitHubSignIn}
                disabled={loading}
                style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-contrast)",
                    border: "none",
                    borderRadius: "4px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                }}
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ flexShrink: 0 }}
                >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {loading ? "Signing in..." : "Continue with GitHub"}
            </button>

            <div
                style={{
                    textAlign: "center",
                    marginTop: "1rem",
                    color: "var(--text-secondary)",
                }}
            >
                Already have an account?{" "}
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary)",
                        cursor: "pointer",
                        textDecoration: "underline",
                    }}
                >
                    Sign in
                </button>
            </div>
        </div>
    );
};
