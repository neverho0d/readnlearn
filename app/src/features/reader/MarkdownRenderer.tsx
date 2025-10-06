import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
        <div style={{ lineHeight: 1.6 }}>
            <ReactMarkdown>{content || ""}</ReactMarkdown>
        </div>
    );
};
