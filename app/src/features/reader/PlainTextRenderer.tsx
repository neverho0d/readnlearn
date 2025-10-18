import React from "react";

interface PlainTextRendererProps {
    content: string;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * Plain Text Renderer Component
 *
 * Renders plain text content with proper formatting while preserving
 * phrase decorations and maintaining text selection capabilities.
 */
export const PlainTextRenderer: React.FC<PlainTextRendererProps> = ({ content, onClick }) => {
    // Handle both text selection and clicks on decorated phrases
    const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Check if clicking on a decorated phrase
        const anchor = target.closest(".phrase-anchor") as HTMLElement | null;
        if (anchor) {
            // Handle decorated phrase click
            const phraseId = anchor.getAttribute("data-phrase-id");
            if (!phraseId) return;

            // Find the marker (it should be in the last span of the multi-line phrase)
            // Look for any span with this phrase ID that has a marker
            const allAnchorsWithSameId = document.querySelectorAll(
                `[data-phrase-id="${phraseId}"]`,
            );
            let markerText = "";

            for (const span of allAnchorsWithSameId) {
                const sup = span.querySelector(".phrase-marker");
                if (sup) {
                    markerText = sup.textContent || "";
                    break;
                }
            }

            if (markerText) {
                const event = new CustomEvent("readnlearn:jump-to-phrase", {
                    detail: { marker: markerText },
                });
                window.dispatchEvent(event);
            }
            return; // Don't propagate to text selection handler
        }

        // If not clicking on a decorated phrase, handle as text selection
        if (onClick) {
            onClick(e);
        }
    };

    // Parse the content to handle both plain text and HTML with phrase decorations
    const parseContent = (text: string): React.ReactNode => {
        // If the content contains HTML (phrase decorations), parse it
        if (
            text.includes('<span class="phrase-anchor"') ||
            text.includes('<sup class="phrase-marker"')
        ) {
            // Content already has phrase decorations, render as HTML
            return <div dangerouslySetInnerHTML={{ __html: text }} />;
        }

        // Plain text content - convert to HTML while preserving formatting
        const normalized = text.replace(/\r\n?/g, "\n");
        const formattedText = normalized
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            // Collapse 3+ consecutive newlines to 2 to avoid giant gaps
            .replace(/\n{3,}/g, "\n\n")
            //.replace(/\n/g, "<br>")
            .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;"); // Convert tabs to 4 spaces

        return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
    };

    return (
        <div
            style={{
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordWrap: "break-word", // Break long lines
            }}
            onClick={handleClick}
        >
            {parseContent(content)}
        </div>
    );
};
