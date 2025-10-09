import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
        <div style={{ lineHeight: 1.6 }}>
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content || ""}</ReactMarkdown>
        </div>
    );
};
