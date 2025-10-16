/**
 * File Format Detection and Processing Utilities
 *
 * This module handles detection of file formats and provides appropriate
 * processing for different content types (plain text, Markdown, etc.)
 */

export type FileFormat = "text" | "markdown";

export interface FileInfo {
    name: string;
    content: string;
    format: FileFormat;
    contentHash: string;
}

/**
 * Detects file format based on file extension and content analysis
 */
export function detectFileFormat(filename: string, content: string): FileFormat {
    // Get file extension
    const extension = filename.toLowerCase().split(".").pop() || "";

    // Check for Markdown extensions
    const markdownExtensions = [
        "md",
        "markdown",
        "mdown",
        "mkdn",
        "mkd",
        "mdwn",
        "mdtxt",
        "mdtext",
    ];
    if (markdownExtensions.includes(extension)) {
        return "markdown";
    }

    // Check for plain text extensions
    const textExtensions = ["txt", "text", "log", "readme", "me", "nfo"];
    if (textExtensions.includes(extension)) {
        return "text";
    }

    // Content-based detection for files without clear extensions
    if (isMarkdownContent(content)) {
        return "markdown";
    }

    // Default to plain text
    return "text";
}

/**
 * Analyzes content to determine if it's Markdown
 */
function isMarkdownContent(content: string): boolean {
    // Check for common Markdown patterns
    const markdownPatterns = [
        /^#{1,6}\s+/m, // Headers (# ## ###)
        /^\*\s+/m, // Unordered lists (* item)
        /^\d+\.\s+/m, // Ordered lists (1. item)
        /^\>\s+/m, // Blockquotes (> text)
        /\[.*?\]\(.*?\)/m, // Links [text](url)
        /!\[.*?\]\(.*?\)/m, // Images ![alt](url)
        /`.*?`/m, // Inline code `code`
        /```[\s\S]*?```/m, // Code blocks ```code```
        /^\s*[-*+]\s+/m, // List items (- * +)
        /^\s*\|\s*.*\s*\|\s*$/m, // Tables | col1 | col2 |
        /^\s*---+\s*$/m, // Horizontal rules (---)
        /^\s*\*\*\*+\s*$/m, // Horizontal rules (***)
    ];

    // Count how many Markdown patterns are found
    let markdownScore = 0;
    for (const pattern of markdownPatterns) {
        if (pattern.test(content)) {
            markdownScore++;
        }
    }

    // If we find 2 or more Markdown patterns, consider it Markdown
    return markdownScore >= 2;
}

/**
 * Creates a FileInfo object with detected format and content hash
 */
export function createFileInfo(filename: string, content: string): FileInfo {
    const format = detectFileFormat(filename, content);
    const contentHash = generateContentHash(content);

    return {
        name: filename,
        content,
        format,
        contentHash,
    };
}

/**
 * Generates a content hash for caching and identification
 */
function generateContentHash(content: string): string {
    // Simple hash function for content identification
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Gets the appropriate renderer component for a file format
 */
export function getRendererForFormat(format: FileFormat): "markdown" | "text" {
    return format;
}

/**
 * Validates if a file format is supported
 */
export function isSupportedFormat(format: string): format is FileFormat {
    return format === "text" || format === "markdown";
}
