/**
 * Toast Notification System
 *
 * Replaces alert() calls with a modern toast notification system.
 * Provides different types of notifications with auto-dismiss functionality.
 */

import React, { useState, useEffect, useCallback } from "react";

export interface Toast {
    id: string;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    duration?: number; // in milliseconds, 0 = no auto-dismiss
    action?: {
        label: string;
        onClick: () => void;
    };
    dismissible?: boolean;
}

export interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, "id">) => void;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

export interface ToastProviderProps {
    children: React.ReactNode;
    maxToasts?: number;
    defaultDuration?: number;
}

export interface ToastProps {
    toast: Toast;
    onDismiss: (id: string) => void;
}

export function ToastComponent({ toast, onDismiss }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Animate in
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Auto-dismiss
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast.duration]);

    const handleDismiss = useCallback(() => {
        setIsLeaving(true);
        setTimeout(() => onDismiss(toast.id), 300);
    }, [toast.id, onDismiss]);

    const getToastStyles = () => {
        const baseStyles = {
            position: "relative" as const,
            padding: "1rem",
            borderRadius: "8px",
            boxShadow: `0 4px 12px var(--dropdown-shadow)`,
            border: "1px solid",
            maxWidth: "400px",
            transform: isVisible ? "translateX(0)" : "translateX(100%)",
            opacity: isVisible ? 1 : 0,
            transition: "all 0.3s ease",
            marginBottom: "0.5rem",
            cursor: "pointer",
        };

        switch (toast.type) {
            case "success":
                return {
                    ...baseStyles,
                    backgroundColor: "var(--success-bg)",
                    borderColor: "var(--success)",
                    color: "var(--success-text)",
                };
            case "error":
                return {
                    ...baseStyles,
                    backgroundColor: "var(--error-bg)",
                    borderColor: "var(--error)",
                    color: "var(--error-text)",
                };
            case "warning":
                return {
                    ...baseStyles,
                    backgroundColor: "var(--warning-bg)",
                    borderColor: "var(--warning)",
                    color: "var(--warning-text)",
                };
            case "info":
                return {
                    ...baseStyles,
                    backgroundColor: "var(--info-bg)",
                    borderColor: "var(--info)",
                    color: "var(--info-text)",
                };
            default:
                return baseStyles;
        }
    };

    const getIcon = () => {
        switch (toast.type) {
            case "success":
                return "✅";
            case "error":
                return "❌";
            case "warning":
                return "⚠️";
            case "info":
                return "ℹ️";
            default:
                return "📢";
        }
    };

    return (
        <div
            style={getToastStyles()}
            onClick={toast.dismissible !== false ? handleDismiss : undefined}
        >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <div style={{ fontSize: "1.2rem", flexShrink: 0 }}>{getIcon()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontWeight: "bold",
                            marginBottom: "0.25rem",
                            fontSize: "0.9rem",
                        }}
                    >
                        {toast.title}
                    </div>
                    <div
                        style={{
                            fontSize: "0.85rem",
                            lineHeight: "1.4",
                            wordBreak: "break-word" as const,
                        }}
                    >
                        {toast.message}
                    </div>
                    {toast.action && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toast.action!.onClick();
                                handleDismiss();
                            }}
                            style={{
                                marginTop: "0.5rem",
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "transparent",
                                border: "1px solid currentColor",
                                borderRadius: "4px",
                                color: "inherit",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                            }}
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>
                {toast.dismissible !== false && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss();
                        }}
                        style={{
                            background: "none",
                            border: "none",
                            color: "inherit",
                            cursor: "pointer",
                            fontSize: "1.2rem",
                            padding: "0",
                            flexShrink: 0,
                        }}
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
}

export function ToastContainer({
    toasts,
    onDismiss,
}: {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}) {
    return (
        <div
            style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                zIndex: 10000,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                maxWidth: "400px",
                pointerEvents: "none",
            }}
        >
            {toasts.map((toast) => (
                <div key={toast.id} style={{ pointerEvents: "auto" }}>
                    <ToastComponent toast={toast} onDismiss={onDismiss} />
                </div>
            ))}
        </div>
    );
}

export function ToastProvider({
    children,
    maxToasts = 5,
    defaultDuration = 5000,
}: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback(
        (toast: Omit<Toast, "id">) => {
            const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newToast: Toast = {
                ...toast,
                id,
                duration: toast.duration ?? defaultDuration,
            };

            setToasts((prev) => {
                const updated = [newToast, ...prev];
                return updated.slice(0, maxToasts);
            });
        },
        [maxToasts, defaultDuration],
    );

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const clearToasts = useCallback(() => {
        setToasts([]);
    }, []);

    const contextValue: ToastContextType = {
        toasts,
        addToast,
        removeToast,
        clearToasts,
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    );
}

// Create context
const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

// Hook to use toast context
export function useToast(): ToastContextType {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

// Convenience functions
export function useToastNotifications() {
    const { addToast } = useToast();

    const showSuccess = useCallback(
        (title: string, message: string, options?: Partial<Toast>) => {
            addToast({ type: "success", title, message, ...options });
        },
        [addToast],
    );

    const showError = useCallback(
        (title: string, message: string, options?: Partial<Toast>) => {
            addToast({ type: "error", title, message, ...options });
        },
        [addToast],
    );

    const showWarning = useCallback(
        (title: string, message: string, options?: Partial<Toast>) => {
            addToast({ type: "warning", title, message, ...options });
        },
        [addToast],
    );

    const showInfo = useCallback(
        (title: string, message: string, options?: Partial<Toast>) => {
            addToast({ type: "info", title, message, ...options });
        },
        [addToast],
    );

    return {
        showSuccess,
        showError,
        showWarning,
        showInfo,
    };
}

// Global toast functions (for use outside React components)
let globalToastContext: ToastContextType | null = null;

export function setGlobalToastContext(context: ToastContextType) {
    globalToastContext = context;
}

export function showToast(
    type: Toast["type"],
    title: string,
    message: string,
    options?: Partial<Toast>,
) {
    if (globalToastContext) {
        globalToastContext.addToast({ type, title, message, ...options });
    } else {
        console.warn("Toast context not available. Make sure ToastProvider is mounted.");
    }
}

export function showSuccessToast(title: string, message: string, options?: Partial<Toast>) {
    showToast("success", title, message, options);
}

export function showErrorToast(title: string, message: string, options?: Partial<Toast>) {
    showToast("error", title, message, options);
}

export function showWarningToast(title: string, message: string, options?: Partial<Toast>) {
    showToast("warning", title, message, options);
}

export function showInfoToast(title: string, message: string, options?: Partial<Toast>) {
    showToast("info", title, message, options);
}
