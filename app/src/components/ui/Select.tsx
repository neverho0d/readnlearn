import React, { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption<T extends string = string> = {
    label: string;
    value: T;
};

type SelectProps<T extends string = string> = {
    value: T;
    onChange: (value: T) => void;
    options: Array<SelectOption<T>>;
    placeholder?: string;
    title?: string;
    style?: React.CSSProperties;
    className?: string;
    buttonWidthPx?: number;
};

export function Select<T extends string = string>({
    value,
    onChange,
    options,
    placeholder,
    title,
    style,
    className,
    buttonWidthPx,
}: SelectProps<T>) {
    const [open, setOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState<number>(() =>
        Math.max(
            0,
            options.findIndex((o) => o.value === value),
        ),
    );
    const rootRef = useRef<HTMLDivElement | null>(null);
    const listRef = useRef<HTMLUListElement | null>(null);

    const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    useEffect(() => {
        if (!open || !listRef.current) return;
        const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
        if (item) item.scrollIntoView({ block: "nearest" });
    }, [open, highlightIndex]);

    function commit(idx: number) {
        const opt = options[idx];
        if (!opt) return;
        onChange(opt.value);
        setOpen(false);
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (!open) {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((i) => Math.min(options.length - 1, i + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((i) => Math.max(0, i - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            commit(highlightIndex);
        }
    }

    return (
        <div
            ref={rootRef}
            className={className}
            style={{ position: "relative", ...style }}
            title={title}
            onKeyDown={onKeyDown}
        >
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    background: "var(--select-bg)",
                    color: "var(--select-text)",
                    border: "1px solid var(--select-border)",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                    minWidth: buttonWidthPx ?? 140,
                    cursor: "pointer",
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span style={{ whiteSpace: "nowrap" }}>
                    {selected ? selected.label : (placeholder ?? "Select")}
                </span>
                <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
                    <path
                        d="m6 8 4 4 4-4"
                        stroke="var(--tab-inactive-text)"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
            {open && (
                <ul
                    ref={listRef}
                    role="listbox"
                    tabIndex={-1}
                    style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        zIndex: 2000,
                        listStyle: "none",
                        margin: 0,
                        padding: 4,
                        background: "var(--dropdown-bg)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--dropdown-border)",
                        boxShadow: "0 6px 18px var(--dropdown-shadow)",
                        borderRadius: 6,
                        maxHeight: 240,
                        overflowY: "auto",
                        minWidth: (buttonWidthPx ?? 140) + 32,
                    }}
                >
                    {options.map((opt, idx) => (
                        <li key={opt.value} role="option" aria-selected={opt.value === value}>
                            <button
                                type="button"
                                onMouseEnter={() => setHighlightIndex(idx)}
                                onClick={() => commit(idx)}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    background:
                                        idx === highlightIndex
                                            ? "var(--menu-hover-bg)"
                                            : "transparent",
                                    color: "var(--text-primary)",
                                    padding: "6px 8px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: 12,
                                }}
                            >
                                {opt.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Select;
