-- Migration to support individual phrase stories instead of single story per content
-- This replaces the old stories table structure with individual phrase stories

-- Drop the old stories table if it exists
DROP TABLE IF EXISTS stories CASCADE;

-- Create new stories table for individual phrase stories
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,
    phrase_id TEXT NOT NULL,
    phrase TEXT NOT NULL,
    translation TEXT,
    story TEXT NOT NULL,
    context TEXT,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'generating', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_content_hash ON stories(content_hash);
CREATE INDEX idx_stories_phrase_id ON stories(phrase_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_created_at ON stories(created_at);

-- Create composite index for common queries
CREATE INDEX idx_stories_user_content ON stories(user_id, content_hash);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own stories" ON stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON stories
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to get stories for content
CREATE OR REPLACE FUNCTION get_stories_for_content(content_hash_param TEXT)
RETURNS TABLE (
    id UUID,
    phrase_id TEXT,
    phrase TEXT,
    translation TEXT,
    story TEXT,
    context TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.phrase_id,
        s.phrase,
        s.translation,
        s.story,
        s.context,
        s.status,
        s.created_at
    FROM stories s
    WHERE s.user_id = auth.uid() 
    AND s.content_hash = content_hash_param
    ORDER BY s.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get story statistics
CREATE OR REPLACE FUNCTION get_story_stats()
RETURNS TABLE (
    total_stories BIGINT,
    ready_stories BIGINT,
    generating_stories BIGINT,
    failed_stories BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_stories,
        COUNT(*) FILTER (WHERE status = 'ready') as ready_stories,
        COUNT(*) FILTER (WHERE status = 'generating') as generating_stories,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_stories
    FROM stories
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_stories_for_content(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_story_stats() TO authenticated;
