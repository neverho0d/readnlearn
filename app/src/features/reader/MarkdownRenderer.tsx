import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    // Delegate clicks on decorated phrases
    const onClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const anchor = target.closest(".phrase-anchor") as HTMLElement | null;
        if (anchor) {
            const sup = anchor.querySelector(".phrase-marker");
            if (!sup) return;
            const markerText = sup.textContent || ""; // first 4 chars of id
            const event = new CustomEvent("readnlearn:jump-to-phrase", {
                detail: { marker: markerText },
            } as CustomEventInit);
            window.dispatchEvent(event);
        }
    };
    return (
        <div style={{ lineHeight: 1.6 }} onClick={onClick}>
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content || ""}</ReactMarkdown>
        </div>
    );
};
