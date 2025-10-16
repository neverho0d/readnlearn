-- Migration: Add file_format column to phrases table
-- This migration adds support for tracking file formats (text/markdown) 
-- to enable proper rendering of different content types.

-- Add file_format column to phrases table
ALTER TABLE phrases 
ADD COLUMN file_format TEXT CHECK (file_format IN ('text', 'markdown'));

-- Create index for efficient queries by file format
CREATE INDEX idx_phrases_file_format ON phrases(file_format);

-- Update existing phrases to have 'text' format as default
UPDATE phrases 
SET file_format = 'text' 
WHERE file_format IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN phrases.file_format IS 'Format of the source file: text or markdown';
