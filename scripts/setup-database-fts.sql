-- Enhanced Multilingual Full-Text Search Setup for Read-n-Learn
-- This script sets up proper FTS indexes and configurations for optimal multilingual search performance

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For trigram similarity
CREATE EXTENSION IF NOT EXISTS unaccent; -- For accent-insensitive search

-- Create or update the phrases table with proper FTS support
CREATE TABLE IF NOT EXISTS phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lang TEXT NOT NULL,
    text TEXT NOT NULL,
    translation TEXT,
    context TEXT,
    tags TEXT[] DEFAULT '{}',
    added_at TIMESTAMPTZ DEFAULT NOW(),
    source_file TEXT,
    content_hash TEXT,
    line_no INTEGER,
    col_offset INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create language-specific FTS indexes for each text field
-- These indexes will enable PostgreSQL's built-in FTS with proper language-specific stemming

-- FTS indexes for the main text field with language-specific configurations
CREATE INDEX IF NOT EXISTS idx_phrases_text_fts_english 
ON phrases USING gin(to_tsvector('english', text)) WHERE lang = 'en';

CREATE INDEX IF NOT EXISTS idx_phrases_text_fts_spanish 
ON phrases USING gin(to_tsvector('spanish', text)) WHERE lang = 'es';

CREATE INDEX IF NOT EXISTS idx_phrases_text_fts_french 
ON phrases USING gin(to_tsvector('french', text)) WHERE lang = 'fr';

CREATE INDEX IF NOT EXISTS idx_phrases_text_fts_german 
ON phrases USING gin(to_tsvector('german', text)) WHERE lang = 'de';

CREATE INDEX IF NOT EXISTS idx_phrases_text_fts_italian 
ON phrases USING gin(to_tsvector('italian', text)) WHERE lang = 'it';

CREATE INDEX IF NOT EXISTS idx_phrases_text_fts_portuguese 
ON phrases USING gin(to_tsvector('portuguese', text)) WHERE lang = 'pt';

CREATE INDEX IF NOT EXISTS idx_phrases_text_fts_simple 
ON phrases USING gin(to_tsvector('simple', text)) WHERE lang NOT IN ('en', 'es', 'fr', 'de', 'it', 'pt');

-- FTS indexes for translation field with language-specific configurations
CREATE INDEX IF NOT EXISTS idx_phrases_translation_fts_english 
ON phrases USING gin(to_tsvector('english', COALESCE(translation, ''))) WHERE lang = 'en';

CREATE INDEX IF NOT EXISTS idx_phrases_translation_fts_spanish 
ON phrases USING gin(to_tsvector('spanish', COALESCE(translation, ''))) WHERE lang = 'es';

CREATE INDEX IF NOT EXISTS idx_phrases_translation_fts_french 
ON phrases USING gin(to_tsvector('french', COALESCE(translation, ''))) WHERE lang = 'fr';

CREATE INDEX IF NOT EXISTS idx_phrases_translation_fts_german 
ON phrases USING gin(to_tsvector('german', COALESCE(translation, ''))) WHERE lang = 'de';

CREATE INDEX IF NOT EXISTS idx_phrases_translation_fts_italian 
ON phrases USING gin(to_tsvector('italian', COALESCE(translation, ''))) WHERE lang = 'it';

CREATE INDEX IF NOT EXISTS idx_phrases_translation_fts_portuguese 
ON phrases USING gin(to_tsvector('portuguese', COALESCE(translation, ''))) WHERE lang = 'pt';

CREATE INDEX IF NOT EXISTS idx_phrases_translation_fts_simple 
ON phrases USING gin(to_tsvector('simple', COALESCE(translation, ''))) WHERE lang NOT IN ('en', 'es', 'fr', 'de', 'it', 'pt');

-- FTS indexes for context field with language-specific configurations
CREATE INDEX IF NOT EXISTS idx_phrases_context_fts_english 
ON phrases USING gin(to_tsvector('english', COALESCE(context, ''))) WHERE lang = 'en';

CREATE INDEX IF NOT EXISTS idx_phrases_context_fts_spanish 
ON phrases USING gin(to_tsvector('spanish', COALESCE(context, ''))) WHERE lang = 'es';

CREATE INDEX IF NOT EXISTS idx_phrases_context_fts_french 
ON phrases USING gin(to_tsvector('french', COALESCE(context, ''))) WHERE lang = 'fr';

CREATE INDEX IF NOT EXISTS idx_phrases_context_fts_german 
ON phrases USING gin(to_tsvector('german', COALESCE(context, ''))) WHERE lang = 'de';

CREATE INDEX IF NOT EXISTS idx_phrases_context_fts_italian 
ON phrases USING gin(to_tsvector('italian', COALESCE(context, ''))) WHERE lang = 'it';

CREATE INDEX IF NOT EXISTS idx_phrases_context_fts_portuguese 
ON phrases USING gin(to_tsvector('portuguese', COALESCE(context, ''))) WHERE lang = 'pt';

CREATE INDEX IF NOT EXISTS idx_phrases_context_fts_simple 
ON phrases USING gin(to_tsvector('simple', COALESCE(context, ''))) WHERE lang NOT IN ('en', 'es', 'fr', 'de', 'it', 'pt');

-- Create trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_phrases_text_trgm 
ON phrases USING gin(text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_phrases_translation_trgm 
ON phrases USING gin(COALESCE(translation, '') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_phrases_context_trgm 
ON phrases USING gin(COALESCE(context, '') gin_trgm_ops);

-- Create standard indexes for performance
CREATE INDEX IF NOT EXISTS idx_phrases_user_id ON phrases(user_id);
CREATE INDEX IF NOT EXISTS idx_phrases_lang ON phrases(lang);
CREATE INDEX IF NOT EXISTS idx_phrases_added_at ON phrases(added_at DESC);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_phrases_user_lang ON phrases(user_id, lang);
CREATE INDEX IF NOT EXISTS idx_phrases_user_source ON phrases(user_id, source_file);

-- Enable Row Level Security
ALTER TABLE phrases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own phrases" ON phrases;
CREATE POLICY "Users can view own phrases" ON phrases
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own phrases" ON phrases;
CREATE POLICY "Users can insert own phrases" ON phrases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own phrases" ON phrases;
CREATE POLICY "Users can update own phrases" ON phrases
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own phrases" ON phrases;
CREATE POLICY "Users can delete own phrases" ON phrases
    FOR DELETE USING (auth.uid() = user_id);

-- Create a function to search across all text fields with dynamic language detection
CREATE OR REPLACE FUNCTION search_phrases_fts(
    search_query TEXT,
    user_uuid UUID,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    text TEXT,
    translation TEXT,
    context TEXT,
    lang TEXT,
    tags TEXT[],
    added_at TIMESTAMPTZ,
    source_file TEXT,
    rank REAL
) AS $$
DECLARE
    lang_config TEXT;
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.text,
        p.translation,
        p.context,
        p.lang,
        p.tags,
        p.added_at,
        p.source_file,
        (
            -- Dynamic language configuration based on phrase language
            CASE p.lang
                WHEN 'en' THEN 
                    ts_rank(to_tsvector('english', p.text), plainto_tsquery('english', search_query)) * 4 +
                    ts_rank(to_tsvector('english', COALESCE(p.translation, '')), plainto_tsquery('english', search_query)) * 2 +
                    ts_rank(to_tsvector('english', COALESCE(p.context, '')), plainto_tsquery('english', search_query)) * 1
                WHEN 'es' THEN 
                    ts_rank(to_tsvector('spanish', p.text), plainto_tsquery('spanish', search_query)) * 4 +
                    ts_rank(to_tsvector('spanish', COALESCE(p.translation, '')), plainto_tsquery('spanish', search_query)) * 2 +
                    ts_rank(to_tsvector('spanish', COALESCE(p.context, '')), plainto_tsquery('spanish', search_query)) * 1
                WHEN 'fr' THEN 
                    ts_rank(to_tsvector('french', p.text), plainto_tsquery('french', search_query)) * 4 +
                    ts_rank(to_tsvector('french', COALESCE(p.translation, '')), plainto_tsquery('french', search_query)) * 2 +
                    ts_rank(to_tsvector('french', COALESCE(p.context, '')), plainto_tsquery('french', search_query)) * 1
                WHEN 'de' THEN 
                    ts_rank(to_tsvector('german', p.text), plainto_tsquery('german', search_query)) * 4 +
                    ts_rank(to_tsvector('german', COALESCE(p.translation, '')), plainto_tsquery('german', search_query)) * 2 +
                    ts_rank(to_tsvector('german', COALESCE(p.context, '')), plainto_tsquery('german', search_query)) * 1
                WHEN 'it' THEN 
                    ts_rank(to_tsvector('italian', p.text), plainto_tsquery('italian', search_query)) * 4 +
                    ts_rank(to_tsvector('italian', COALESCE(p.translation, '')), plainto_tsquery('italian', search_query)) * 2 +
                    ts_rank(to_tsvector('italian', COALESCE(p.context, '')), plainto_tsquery('italian', search_query)) * 1
                WHEN 'pt' THEN 
                    ts_rank(to_tsvector('portuguese', p.text), plainto_tsquery('portuguese', search_query)) * 4 +
                    ts_rank(to_tsvector('portuguese', COALESCE(p.translation, '')), plainto_tsquery('portuguese', search_query)) * 2 +
                    ts_rank(to_tsvector('portuguese', COALESCE(p.context, '')), plainto_tsquery('portuguese', search_query)) * 1
                ELSE 
                    ts_rank(to_tsvector('simple', p.text), plainto_tsquery('simple', search_query)) * 4 +
                    ts_rank(to_tsvector('simple', COALESCE(p.translation, '')), plainto_tsquery('simple', search_query)) * 2 +
                    ts_rank(to_tsvector('simple', COALESCE(p.context, '')), plainto_tsquery('simple', search_query)) * 1
            END
        ) as rank
    FROM phrases p
    WHERE p.user_id = user_uuid
    AND (
        -- Dynamic language-based search conditions
        (p.lang = 'en' AND (
            to_tsvector('english', p.text) @@ plainto_tsquery('english', search_query) OR
            to_tsvector('english', COALESCE(p.translation, '')) @@ plainto_tsquery('english', search_query) OR
            to_tsvector('english', COALESCE(p.context, '')) @@ plainto_tsquery('english', search_query)
        )) OR
        (p.lang = 'es' AND (
            to_tsvector('spanish', p.text) @@ plainto_tsquery('spanish', search_query) OR
            to_tsvector('spanish', COALESCE(p.translation, '')) @@ plainto_tsquery('spanish', search_query) OR
            to_tsvector('spanish', COALESCE(p.context, '')) @@ plainto_tsquery('spanish', search_query)
        )) OR
        (p.lang = 'fr' AND (
            to_tsvector('french', p.text) @@ plainto_tsquery('french', search_query) OR
            to_tsvector('french', COALESCE(p.translation, '')) @@ plainto_tsquery('french', search_query) OR
            to_tsvector('french', COALESCE(p.context, '')) @@ plainto_tsquery('french', search_query)
        )) OR
        (p.lang = 'de' AND (
            to_tsvector('german', p.text) @@ plainto_tsquery('german', search_query) OR
            to_tsvector('german', COALESCE(p.translation, '')) @@ plainto_tsquery('german', search_query) OR
            to_tsvector('german', COALESCE(p.context, '')) @@ plainto_tsquery('german', search_query)
        )) OR
        (p.lang = 'it' AND (
            to_tsvector('italian', p.text) @@ plainto_tsquery('italian', search_query) OR
            to_tsvector('italian', COALESCE(p.translation, '')) @@ plainto_tsquery('italian', search_query) OR
            to_tsvector('italian', COALESCE(p.context, '')) @@ plainto_tsquery('italian', search_query)
        )) OR
        (p.lang = 'pt' AND (
            to_tsvector('portuguese', p.text) @@ plainto_tsquery('portuguese', search_query) OR
            to_tsvector('portuguese', COALESCE(p.translation, '')) @@ plainto_tsquery('portuguese', search_query) OR
            to_tsvector('portuguese', COALESCE(p.context, '')) @@ plainto_tsquery('portuguese', search_query)
        )) OR
        (p.lang NOT IN ('en', 'es', 'fr', 'de', 'it', 'pt') AND (
            to_tsvector('simple', p.text) @@ plainto_tsquery('simple', search_query) OR
            to_tsvector('simple', COALESCE(p.translation, '')) @@ plainto_tsquery('simple', search_query) OR
            to_tsvector('simple', COALESCE(p.context, '')) @@ plainto_tsquery('simple', search_query)
        ))
    )
    ORDER BY rank DESC, p.added_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function for fuzzy search using trigram similarity
CREATE OR REPLACE FUNCTION search_phrases_fuzzy(
    search_query TEXT,
    user_uuid UUID,
    similarity_threshold REAL DEFAULT 0.3,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    text TEXT,
    translation TEXT,
    context TEXT,
    lang TEXT,
    tags TEXT[],
    added_at TIMESTAMPTZ,
    source_file TEXT,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.text,
        p.translation,
        p.context,
        p.lang,
        p.tags,
        p.added_at,
        p.source_file,
        GREATEST(
            similarity(p.text, search_query),
            similarity(COALESCE(p.translation, ''), search_query),
            similarity(COALESCE(p.context, ''), search_query)
        ) as similarity
    FROM phrases p
    WHERE p.user_id = user_uuid
    AND (
        similarity(p.text, search_query) > similarity_threshold OR
        similarity(COALESCE(p.translation, ''), search_query) > similarity_threshold OR
        similarity(COALESCE(p.context, ''), search_query) > similarity_threshold
    )
    ORDER BY similarity DESC, p.added_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON phrases TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_phrases_fts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_phrases_fuzzy TO anon, authenticated;

-- Create a view for easy querying
CREATE OR REPLACE VIEW phrases_search AS
SELECT 
    p.*,
    to_tsvector('english', p.text) as text_tsvector,
    to_tsvector('english', COALESCE(p.translation, '')) as translation_tsvector,
    to_tsvector('english', COALESCE(p.context, '')) as context_tsvector
FROM phrases p;

-- Grant access to the view
GRANT SELECT ON phrases_search TO anon, authenticated;

-- Insert some test data for FTS testing (optional)
-- This can be removed in production
INSERT INTO phrases (user_id, lang, text, translation, context, tags, source_file)
SELECT 
    auth.uid(),
    'en',
    test_data.text,
    test_data.translation,
    test_data.context,
    test_data.tags,
    'test.txt'
FROM (VALUES
    ('The woman walked down the street', 'La mujer caminó por la calle', 'A woman was walking', ARRAY['test', 'woman']),
    ('Women are strong and independent', 'Las mujeres son fuertes e independientes', 'About women empowerment', ARRAY['test', 'women']),
    ('A beautiful woman smiled at me', 'Una mujer hermosa me sonrió', 'Describing a woman', ARRAY['test', 'beautiful']),
    ('The women gathered for the meeting', 'Las mujeres se reunieron para la reunión', 'Women in a meeting', ARRAY['test', 'meeting'])
) AS test_data(text, translation, context, tags)
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Analyze the table to update statistics
ANALYZE phrases;
