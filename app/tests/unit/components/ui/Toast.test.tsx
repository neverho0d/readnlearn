/**
 * Toast Component Tests
 *
 * Test suite for the toast notification system.
 * Tests rendering, interactions, and auto-dismiss functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider, ToastComponent, useToast } from "../../../src/components/ui/Toast";
import { Toast } from "../../../src/components/ui/Toast";

// Mock React
vi.mock("react", async () => {
    const actual = await vi.importActual("react");
    return {
        ...actual,
        useContext: vi.fn(),
    };
});

describe("ToastComponent", () => {
    const mockToast: Toast = {
        id: "test-toast",
        type: "success",
        title: "Success",
        message: "Operation completed successfully",
        duration: 5000,
        dismissible: true,
    };

    const mockOnDismiss = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render toast with correct content", () => {
        render(<ToastComponent toast={mockToast} onDismiss={mockOnDismiss} />);

        expect(screen.getByText("Success")).toBeInTheDocument();
        expect(screen.getByText("Operation completed successfully")).toBeInTheDocument();
        expect(screen.getByText("✅")).toBeInTheDocument();
    });

    it("should render different toast types", () => {
        const errorToast = { ...mockToast, type: "error" as const };
        const warningToast = { ...mockToast, type: "warning" as const };
        const infoToast = { ...mockToast, type: "info" as const };

        const { rerender } = render(
            <ToastComponent toast={errorToast} onDismiss={mockOnDismiss} />,
        );
        expect(screen.getByText("❌")).toBeInTheDocument();

        rerender(<ToastComponent toast={warningToast} onDismiss={mockOnDismiss} />);
        expect(screen.getByText("⚠️")).toBeInTheDocument();

        rerender(<ToastComponent toast={infoToast} onDismiss={mockOnDismiss} />);
        expect(screen.getByText("ℹ️")).toBeInTheDocument();
    });

    it("should handle dismiss button click", () => {
        render(<ToastComponent toast={mockToast} onDismiss={mockOnDismiss} />);

        const dismissButton = screen.getByText("×");
        fireEvent.click(dismissButton);

        expect(mockOnDismiss).toHaveBeenCalledWith("test-toast");
    });

    it("should handle toast click for dismissal", () => {
        render(<ToastComponent toast={mockToast} onDismiss={mockOnDismiss} />);

        const toast = screen.getByText("Success").closest("div");
        fireEvent.click(toast!);

        expect(mockOnDismiss).toHaveBeenCalledWith("test-toast");
    });

    it("should not be dismissible when dismissible is false", () => {
        const nonDismissibleToast = { ...mockToast, dismissible: false };
        render(<ToastComponent toast={nonDismissibleToast} onDismiss={mockOnDismiss} />);

        expect(screen.queryByText("×")).not.toBeInTheDocument();
    });

    it("should render action button when provided", () => {
        const toastWithAction = {
            ...mockToast,
            action: {
                label: "Undo",
                onClick: vi.fn(),
            },
        };

        render(<ToastComponent toast={toastWithAction} onDismiss={mockOnDismiss} />);

        expect(screen.getByText("Undo")).toBeInTheDocument();
    });

    it("should handle action button click", () => {
        const mockAction = vi.fn();
        const toastWithAction = {
            ...mockToast,
            action: {
                label: "Undo",
                onClick: mockAction,
            },
        };

        render(<ToastComponent toast={toastWithAction} onDismiss={mockOnDismiss} />);

        const actionButton = screen.getByText("Undo");
        fireEvent.click(actionButton);

        expect(mockAction).toHaveBeenCalled();
        expect(mockOnDismiss).toHaveBeenCalledWith("test-toast");
    });
});

describe("ToastProvider", () => {
    const TestComponent = () => {
        const { addToast, removeToast, clearToasts, toasts } = useToast();

        return (
            <div>
                <button
                    onClick={() =>
                        addToast({ type: "success", title: "Test", message: "Test message" })
                    }
                >
                    Add Toast
                </button>
                <button onClick={() => removeToast("test-id")}>Remove Toast</button>
                <button onClick={clearToasts}>Clear Toasts</button>
                <div data-testid="toast-count">{toasts.length}</div>
            </div>
        );
    };

    it("should provide toast context", () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>,
        );

        expect(screen.getByTestId("toast-count")).toHaveTextContent("0");
    });

    it("should add toast when addToast is called", () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>,
        );

        const addButton = screen.getByText("Add Toast");
        fireEvent.click(addButton);

        expect(screen.getByTestId("toast-count")).toHaveTextContent("1");
    });

    it("should remove toast when removeToast is called", () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>,
        );

        const addButton = screen.getByText("Add Toast");
        fireEvent.click(addButton);

        expect(screen.getByTestId("toast-count")).toHaveTextContent("1");

        const removeButton = screen.getByText("Remove Toast");
        fireEvent.click(removeButton);

        expect(screen.getByTestId("toast-count")).toHaveTextContent("0");
    });

    it("should clear all toasts when clearToasts is called", () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>,
        );

        const addButton = screen.getByText("Add Toast");
        fireEvent.click(addButton);
        fireEvent.click(addButton);

        expect(screen.getByTestId("toast-count")).toHaveTextContent("2");

        const clearButton = screen.getByText("Clear Toasts");
        fireEvent.click(clearButton);

        expect(screen.getByTestId("toast-count")).toHaveTextContent("0");
    });

    it("should respect maxToasts limit", () => {
        render(
            <ToastProvider maxToasts={2}>
                <TestComponent />
            </ToastProvider>,
        );

        const addButton = screen.getByText("Add Toast");
        fireEvent.click(addButton);
        fireEvent.click(addButton);
        fireEvent.click(addButton);

        expect(screen.getByTestId("toast-count")).toHaveTextContent("2");
    });
});

describe("useToast hook", () => {
    it("should throw error when used outside provider", () => {
        const TestComponent = () => {
            useToast();
            return <div>Test</div>;
        };

        expect(() => render(<TestComponent />)).toThrow(
            "useToast must be used within a ToastProvider",
        );
    });
});

describe("Toast auto-dismiss", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should auto-dismiss toast after duration", async () => {
        const mockOnDismiss = vi.fn();
        const toast = {
            ...mockToast,
            duration: 1000,
        };

        render(<ToastComponent toast={toast} onDismiss={mockOnDismiss} />);

        expect(mockOnDismiss).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);

        await waitFor(() => {
            expect(mockOnDismiss).toHaveBeenCalledWith("test-toast");
        });
    });

    it("should not auto-dismiss when duration is 0", () => {
        const mockOnDismiss = vi.fn();
        const toast = {
            ...mockToast,
            duration: 0,
        };

        render(<ToastComponent toast={toast} onDismiss={mockOnDismiss} />);

        vi.advanceTimersByTime(10000);

        expect(mockOnDismiss).not.toHaveBeenCalled();
    });
});

describe("Toast styling", () => {
    it("should apply correct styles for different types", () => {
        const successToast = { ...mockToast, type: "success" as const };
        const errorToast = { ...mockToast, type: "error" as const };

        const { rerender } = render(<ToastComponent toast={successToast} onDismiss={vi.fn()} />);
        const successElement = screen.getByText("Success").closest("div");
        expect(successElement).toHaveStyle("background-color: var(--success-bg)");

        rerender(<ToastComponent toast={errorToast} onDismiss={vi.fn()} />);
        const errorElement = screen.getByText("Success").closest("div");
        expect(errorElement).toHaveStyle("background-color: var(--error-bg)");
    });
});
