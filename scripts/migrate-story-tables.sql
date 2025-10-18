-- Story Generation Tables Migration
-- Creates tables for asynchronous story generation and storage

-- Stories table - stores generated stories
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,
    story TEXT NOT NULL,
    used_phrases JSONB NOT NULL,
    glosses JSONB NOT NULL,
    status TEXT DEFAULT 'ready' CHECK (status IN ('generating', 'ready', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, content_hash)
);

-- Story generation queue table
CREATE TABLE IF NOT EXISTS story_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,
    phrase_ids JSONB NOT NULL,
    l1 TEXT NOT NULL,
    l2 TEXT NOT NULL,
    level TEXT NOT NULL,
    difficulties JSONB NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Story-Phrase relationships table
CREATE TABLE IF NOT EXISTS story_phrases (
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    phrase_id UUID REFERENCES phrases(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, phrase_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_user_content ON stories(user_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_story_queue_user_status ON story_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_story_queue_created ON story_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_story_phrases_story ON story_phrases(story_id);
CREATE INDEX IF NOT EXISTS idx_story_phrases_phrase ON story_phrases(phrase_id);

-- RLS (Row Level Security) policies
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_phrases ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Users can view their own stories" ON stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON stories
    FOR DELETE USING (auth.uid() = user_id);

-- Story queue policies
CREATE POLICY "Users can view their own story queue" ON story_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own story queue" ON story_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own story queue" ON story_queue
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own story queue" ON story_queue
    FOR DELETE USING (auth.uid() = user_id);

-- Story phrases policies
CREATE POLICY "Users can view their own story phrases" ON story_phrases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM stories 
            WHERE stories.id = story_phrases.story_id 
            AND stories.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own story phrases" ON story_phrases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM stories 
            WHERE stories.id = story_phrases.story_id 
            AND stories.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own story phrases" ON story_phrases
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM stories 
            WHERE stories.id = story_phrases.story_id 
            AND stories.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_stories_updated_at 
    BEFORE UPDATE ON stories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_queue_updated_at 
    BEFORE UPDATE ON story_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
