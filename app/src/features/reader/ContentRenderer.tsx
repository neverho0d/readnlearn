import React from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PlainTextRenderer } from "./PlainTextRenderer";
import { FileFormat } from "../../lib/utils/fileFormat";

interface ContentRendererProps {
    content: string;
    format: FileFormat;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * Format-Aware Content Renderer
 *
 * Renders content using the appropriate renderer based on file format.
 * Supports both plain text and Markdown formats with proper phrase decoration.
 */
export const ContentRenderer: React.FC<ContentRendererProps> = ({ content, format, onClick }) => {
    switch (format) {
        case "markdown":
            return <MarkdownRenderer content={content} onClick={onClick} />;
        case "text":
            return <PlainTextRenderer content={content} onClick={onClick} />;
        default:
            // Fallback to plain text for unknown formats
            return <PlainTextRenderer content={content} onClick={onClick} />;
    }
};
