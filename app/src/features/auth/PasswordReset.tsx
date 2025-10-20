/**
 * Password Reset Component
 *
 * Provides password reset functionality with email confirmation.
 */

import React, { useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";

interface PasswordResetProps {
    onSwitchToLogin: () => void;
}

export const PasswordReset: React.FC<PasswordResetProps> = ({ onSwitchToLogin }) => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const { resetPassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await resetPassword(email);

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
                    We've sent you a password reset link. Please check your email and follow the
                    instructions to reset your password.
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
                Reset Password
            </h2>

            <p
                style={{
                    color: "var(--text-secondary)",
                    marginBottom: "1.5rem",
                    textAlign: "center",
                }}
            >
                Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "1.5rem" }}>
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
                    {loading ? "Sending..." : "Send Reset Link"}
                </button>
            </form>

            <div
                style={{
                    textAlign: "center",
                    marginTop: "1rem",
                    color: "var(--text-secondary)",
                }}
            >
                Remember your password?{" "}
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
