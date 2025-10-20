/**
 * Dictionary Search Bar Component
 *
 * Provides full-text search functionality for the Dictionary mode.
 * Features:
 * - Real-time search with debouncing
 * - Manual search trigger via icon (idle state)
 * - Busy state shows a loader icon and disables interaction
 * - Hover-to-show clear icon at the left side
 * - Responsive design with proper styling
 *
 * Props:
 * - searchText: Current search query
 * - onSearchChange: Callback when search text changes
 * - placeholder: Placeholder text for the input
 */

import React, { useState, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

interface DictionarySearchBarProps {
    searchText: string;
    onSearchChange: (text: string) => void; // eslint-disable-line no-unused-vars
    onSearchRequest?: () => void; // optional manual trigger
    isSearching?: boolean;
    placeholder?: string;
}

export const DictionarySearchBar: React.FC<DictionarySearchBarProps> = ({
    searchText,
    onSearchChange,
    onSearchRequest,
    isSearching = false,
    placeholder = "Search phrases...",
}) => {
    const [localSearchText, setLocalSearchText] = useState(searchText);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const handleInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            setLocalSearchText(value);

            // Debounce the search to avoid excessive API calls
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }

            debounceTimeoutRef.current = setTimeout(() => {
                onSearchChange(value);
            }, 300);
        },
        [onSearchChange],
    );

    const handleClear = useCallback(() => {
        setLocalSearchText("");
        onSearchChange("");
    }, [onSearchChange]);

    // Sync local state with prop changes
    React.useEffect(() => {
        setLocalSearchText(searchText);
    }, [searchText]);

    // Hover state to show clear button
    const [hovering, setHovering] = useState(false);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                background: "var(--bg)",
            }}
        >
            <div
                style={{ position: "relative", flex: 1 }}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
            >
                <input
                    type="text"
                    value={localSearchText}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    data-testid="search-input"
                    style={{
                        width: "100%",
                        padding: "8px 36px 8px 32px", // room for icons on both sides
                        border: "1px solid var(--border-color)",
                        borderRadius: 6,
                        background: "var(--bg)",
                        color: "var(--text)",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                        overflow: "hidden",
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = "var(--primary)";
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = "var(--border-color)";
                    }}
                />
                {/* Clear icon (left), shown only when hovering and there is text */}
                {hovering && localSearchText && (
                    <button
                        onClick={handleClear}
                        style={{
                            position: "absolute",
                            left: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "var(--muted)",
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: 0,
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        title="Clear search"
                        className="icon-button"
                        aria-label="Clear search"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                )}

                {/* Right icon: idle = magnifier (clickable if text and not searching); searching = spinner */}
                <button
                    onClick={() => {
                        if (!isSearching && localSearchText.trim() && onSearchRequest) {
                            onSearchRequest();
                        }
                    }}
                    disabled={isSearching || !localSearchText.trim() || !onSearchRequest}
                    style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        boxShadow: "none",
                        color: isSearching ? "var(--primary)" : "var(--muted)",
                        cursor: isSearching || !localSearchText.trim() ? "default" : "pointer",
                        fontSize: "16px",
                        padding: 0,
                        width: 20,
                        height: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    title={
                        isSearching
                            ? "Searching"
                            : localSearchText
                              ? "Search"
                              : "Enter text to search"
                    }
                    aria-label={isSearching ? "Searching" : "Search"}
                    className="icon-button"
                >
                    {isSearching ? (
                        // Simple CSS spinner using border animation
                        <span
                            style={{
                                display: "inline-block",
                                width: 14,
                                height: 14,
                                border: "2px solid var(--primary)",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                                animation: "readnlearn-spin 0.8s linear infinite",
                            }}
                        />
                    ) : (
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    )}
                </button>
            </div>
        </div>
    );
};
