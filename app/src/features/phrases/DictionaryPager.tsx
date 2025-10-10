/**
 * Dictionary Pager Component
 *
 * Provides pagination navigation for the Dictionary mode.
 * Features:
 * - First, Previous, Next, Last navigation buttons
 * - Shows 3 pages before and after current page
 * - Disabled states for edge cases
 * - Responsive design with proper styling
 * - Page number highlighting for current page
 *
 * Props:
 * - currentPage: Current page number (1-based)
 * - totalPages: Total number of pages
 * - onPageChange: Callback when page is changed
 * - itemsPerPage: Number of items per page (for display)
 */

import React from "react";

interface DictionaryPagerProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void; // eslint-disable-line no-unused-vars
    itemsPerPage: number;
}

export const DictionaryPager: React.FC<DictionaryPagerProps> = ({
    currentPage,
    totalPages,
    onPageChange,
}) => {
    // Don't render if there's only one page or no pages
    if (totalPages <= 1) {
        return null;
    }

    const getPageNumbers = (): number[] => {
        const pages: number[] = [];
        const showBefore = 3;
        const showAfter = 3;

        // Calculate start and end page numbers to show
        let startPage = Math.max(1, currentPage - showBefore);
        let endPage = Math.min(totalPages, currentPage + showAfter);

        // Adjust if we're near the beginning or end
        if (currentPage <= showBefore) {
            endPage = Math.min(totalPages, showBefore + showAfter + 1);
        }
        if (currentPage + showAfter >= totalPages) {
            startPage = Math.max(1, totalPages - showBefore - showAfter);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();
    const hasFirstPage = pageNumbers[0] > 1;
    const hasLastPage = pageNumbers[pageNumbers.length - 1] < totalPages;

    const renderPageButton = (page: number, label: string, isCurrent = false) => (
        <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={isCurrent}
            style={{
                padding: "6px 12px",
                background: isCurrent ? "var(--primary)" : "var(--bg)",
                color: isCurrent ? "white" : "var(--text)",
                border: "1px solid",
                borderColor: isCurrent ? "var(--primary)" : "var(--border)",
                borderRadius: 4,
                cursor: isCurrent ? "default" : "pointer",
                fontSize: "13px",
                fontWeight: isCurrent ? "500" : "400",
                transition: "all 0.2s ease",
                minWidth: "32px",
                textAlign: "center",
            }}
            onMouseEnter={(e) => {
                if (!isCurrent) {
                    e.currentTarget.style.background = "var(--bg-hover)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                }
            }}
            onMouseLeave={(e) => {
                if (!isCurrent) {
                    e.currentTarget.style.background = "var(--bg)";
                    e.currentTarget.style.borderColor = "var(--border)";
                }
            }}
        >
            {label}
        </button>
    );

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "12px 16px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-secondary)",
            }}
        >
            {/* First page button */}
            {hasFirstPage && (
                <>
                    {renderPageButton(1, "1")}
                    {pageNumbers[0] > 2 && (
                        <span
                            style={{
                                color: "var(--muted)",
                                fontSize: "13px",
                                padding: "0 4px",
                            }}
                        >
                            ...
                        </span>
                    )}
                </>
            )}

            {/* Previous button */}
            {currentPage > 1 && (
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    style={{
                        padding: "6px 12px",
                        background: "var(--bg)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: "13px",
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-hover)";
                        e.currentTarget.style.borderColor = "var(--primary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--bg)";
                        e.currentTarget.style.borderColor = "var(--border)";
                    }}
                >
                    ← Prev
                </button>
            )}

            {/* Page numbers */}
            {pageNumbers.map((page) =>
                renderPageButton(page, page.toString(), page === currentPage),
            )}

            {/* Next button */}
            {currentPage < totalPages && (
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    style={{
                        padding: "6px 12px",
                        background: "var(--bg)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: "13px",
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-hover)";
                        e.currentTarget.style.borderColor = "var(--primary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--bg)";
                        e.currentTarget.style.borderColor = "var(--border)";
                    }}
                >
                    Next →
                </button>
            )}

            {/* Last page button */}
            {hasLastPage && (
                <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                        <span
                            style={{
                                color: "var(--muted)",
                                fontSize: "13px",
                                padding: "0 4px",
                            }}
                        >
                            ...
                        </span>
                    )}
                    {renderPageButton(totalPages, totalPages.toString())}
                </>
            )}

            {/* Page info */}
            <div
                style={{
                    marginLeft: 16,
                    color: "var(--muted)",
                    fontSize: "12px",
                }}
            >
                Page {currentPage} of {totalPages}
            </div>
        </div>
    );
};
