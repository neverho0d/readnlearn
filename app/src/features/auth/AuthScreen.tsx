/**
 * Authentication Screen Component
 *
 * Main authentication interface that handles login, signup, and password reset.
 */

import React, { useState } from "react";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { PasswordReset } from "./PasswordReset";

type AuthMode = "login" | "signup" | "reset";

export const AuthScreen: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>("login");

    const switchToLogin = () => setMode("login");
    const switchToSignup = () => setMode("signup");
    const switchToReset = () => setMode("reset");

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--bg-primary)",
                padding: "1rem",
            }}
        >
            <div>
                {mode === "login" && (
                    <LoginForm onSwitchToSignup={switchToSignup} onSwitchToReset={switchToReset} />
                )}

                {mode === "signup" && <SignupForm onSwitchToLogin={switchToLogin} />}

                {mode === "reset" && <PasswordReset onSwitchToLogin={switchToLogin} />}
            </div>
        </div>
    );
};
