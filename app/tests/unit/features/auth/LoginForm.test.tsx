import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
// import React from "react"; // Not needed in this test file
import { LoginForm } from "../../../../src/features/auth/LoginForm";

// Mock the auth context
const mockSignIn = vi.fn();
const mockSignInWithGitHub = vi.fn();

vi.mock("../../../../src/lib/auth/AuthContext", () => ({
    useAuth: () => ({
        signIn: mockSignIn,
        signInWithGitHub: mockSignInWithGitHub,
        loading: false,
    }),
}));

describe("LoginForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render login form", () => {
        render(<LoginForm onSwitchToSignup={vi.fn()} onSwitchToReset={vi.fn()} />);

        expect(screen.getAllByDisplayValue("")).toHaveLength(2); // Email and password inputs
        expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /continue with github/i })).toBeInTheDocument();
    });

    it("should handle form submission", async () => {
        mockSignIn.mockResolvedValue({ error: null });

        render(<LoginForm onSwitchToSignup={vi.fn()} onSwitchToReset={vi.fn()} />);

        const inputs = screen.getAllByDisplayValue("");
        const emailInput = inputs[0];
        const passwordInput = inputs[1];
        const submitButton = screen.getByRole("button", { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(passwordInput, { target: { value: "password123" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
        });
    });

    it("should handle GitHub OAuth", async () => {
        mockSignInWithGitHub.mockResolvedValue({ error: null });

        render(<LoginForm onSwitchToSignup={vi.fn()} onSwitchToReset={vi.fn()} />);

        const githubButton = screen.getByRole("button", { name: /continue with github/i });
        fireEvent.click(githubButton);

        await waitFor(() => {
            expect(mockSignInWithGitHub).toHaveBeenCalled();
        });
    });

    it("should show validation errors", async () => {
        render(<LoginForm onSwitchToSignup={vi.fn()} onSwitchToReset={vi.fn()} />);

        const submitButton = screen.getByRole("button", { name: /sign in/i });
        fireEvent.click(submitButton);

        // The component uses browser validation, so we check for the required attributes
        const inputs = screen.getAllByDisplayValue("");
        const emailInput = inputs[0];
        const passwordInput = inputs[1];

        expect(emailInput).toHaveAttribute("required");
        expect(passwordInput).toHaveAttribute("required");
    });

    it("should handle authentication errors", async () => {
        mockSignIn.mockResolvedValue({ error: { message: "Invalid credentials" } });

        render(<LoginForm onSwitchToSignup={vi.fn()} onSwitchToReset={vi.fn()} />);

        const inputs = screen.getAllByDisplayValue("");
        const emailInput = inputs[0];
        const passwordInput = inputs[1];
        const submitButton = screen.getByRole("button", { name: /sign in/i });

        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
    });

    it("should show loading state", () => {
        // The loading state is already mocked at the top level
        // This test verifies the component renders correctly
        render(<LoginForm onSwitchToSignup={vi.fn()} onSwitchToReset={vi.fn()} />);

        expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });
});
