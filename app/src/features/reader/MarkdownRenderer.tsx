import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface MarkdownRendererProps {
    content: string;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onClick }) => {
    // Delegate clicks on decorated phrases
    const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const anchor = target.closest(".phrase-anchor") as HTMLElement | null;
        if (anchor) {
            // Get the phrase ID from the data attribute
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
        }

        // Call the external onClick handler if provided
        if (onClick) {
            onClick(e);
        }
    };
    return (
        <div style={{ lineHeight: 1.6 }} onClick={handleClick}>
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content || ""}</ReactMarkdown>
        </div>
    );
};
