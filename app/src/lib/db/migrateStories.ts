/**
 * Story Tables Migration
 *
 * Creates the stories and story_queue tables in Supabase.
 * This should be run once to set up the story generation infrastructure.
 */

import { supabase } from "../supabase/client";

export async function migrateStoryTables(): Promise<void> {
    try {
        console.log("Starting story tables migration...");

        // Check if stories table already exists
        const { data: storiesCheck, error: storiesError } = await supabase
            .from("stories")
            .select("id")
            .limit(1);

        if (!storiesError) {
            console.log("Stories table already exists, skipping migration");
            return;
        }

        console.log("Creating story tables...");

        // For now, we'll create a simple migration that can be run manually
        // The user needs to run the SQL migration in Supabase dashboard
        console.log("Please run the following SQL in your Supabase dashboard:");
        console.log(`
-- Create stories table
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

-- Create story_queue table
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

-- Create story_phrases table
CREATE TABLE IF NOT EXISTS story_phrases (
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    phrase_id UUID REFERENCES phrases(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, phrase_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_content ON stories(user_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_story_queue_user_status ON story_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_story_queue_created ON story_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_story_phrases_story ON story_phrases(story_id);
CREATE INDEX IF NOT EXISTS idx_story_phrases_phrase ON story_phrases(phrase_id);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_phrases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own stories" ON stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON stories
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own story queue" ON story_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own story queue" ON story_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own story queue" ON story_queue
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own story queue" ON story_queue
    FOR DELETE USING (auth.uid() = user_id);

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
        `);

        throw new Error(
            "Story tables migration required. Please run the SQL above in your Supabase dashboard.",
        );

        if (storiesTableError) {
            console.error("Failed to create stories table:", storiesTableError);
            throw storiesTableError;
        }

        // Create story_queue table
        const { error: queueTableError } = await supabase.rpc("exec_sql", {
            sql: `
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
            `,
        });

        if (queueTableError) {
            console.error("Failed to create story_queue table:", queueTableError);
            throw queueTableError;
        }

        // Create story_phrases table
        const { error: phrasesTableError } = await supabase.rpc("exec_sql", {
            sql: `
                CREATE TABLE IF NOT EXISTS story_phrases (
                    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
                    phrase_id UUID REFERENCES phrases(id) ON DELETE CASCADE,
                    PRIMARY KEY (story_id, phrase_id)
                );
            `,
        });

        if (phrasesTableError) {
            console.error("Failed to create story_phrases table:", phrasesTableError);
            throw phrasesTableError;
        }

        // Create indexes
        const { error: indexesError } = await supabase.rpc("exec_sql", {
            sql: `
                CREATE INDEX IF NOT EXISTS idx_stories_user_content ON stories(user_id, content_hash);
                CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
                CREATE INDEX IF NOT EXISTS idx_story_queue_user_status ON story_queue(user_id, status);
                CREATE INDEX IF NOT EXISTS idx_story_queue_created ON story_queue(created_at);
                CREATE INDEX IF NOT EXISTS idx_story_phrases_story ON story_phrases(story_id);
                CREATE INDEX IF NOT EXISTS idx_story_phrases_phrase ON story_phrases(phrase_id);
            `,
        });

        if (indexesError) {
            console.error("Failed to create indexes:", indexesError);
            throw indexesError;
        }

        // Enable RLS
        const { error: rlsError } = await supabase.rpc("exec_sql", {
            sql: `
                ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
                ALTER TABLE story_queue ENABLE ROW LEVEL SECURITY;
                ALTER TABLE story_phrases ENABLE ROW LEVEL SECURITY;
            `,
        });

        if (rlsError) {
            console.error("Failed to enable RLS:", rlsError);
            throw rlsError;
        }

        // Create RLS policies
        const { error: policiesError } = await supabase.rpc("exec_sql", {
            sql: `
                -- Stories policies
                CREATE POLICY IF NOT EXISTS "Users can view their own stories" ON stories
                    FOR SELECT USING (auth.uid() = user_id);

                CREATE POLICY IF NOT EXISTS "Users can insert their own stories" ON stories
                    FOR INSERT WITH CHECK (auth.uid() = user_id);

                CREATE POLICY IF NOT EXISTS "Users can update their own stories" ON stories
                    FOR UPDATE USING (auth.uid() = user_id);

                CREATE POLICY IF NOT EXISTS "Users can delete their own stories" ON stories
                    FOR DELETE USING (auth.uid() = user_id);

                -- Story queue policies
                CREATE POLICY IF NOT EXISTS "Users can view their own story queue" ON story_queue
                    FOR SELECT USING (auth.uid() = user_id);

                CREATE POLICY IF NOT EXISTS "Users can insert their own story queue" ON story_queue
                    FOR INSERT WITH CHECK (auth.uid() = user_id);

                CREATE POLICY IF NOT EXISTS "Users can update their own story queue" ON story_queue
                    FOR UPDATE USING (auth.uid() = user_id);

                CREATE POLICY IF NOT EXISTS "Users can delete their own story queue" ON story_queue
                    FOR DELETE USING (auth.uid() = user_id);

                -- Story phrases policies
                CREATE POLICY IF NOT EXISTS "Users can view their own story phrases" ON story_phrases
                    FOR SELECT USING (
                        EXISTS (
                            SELECT 1 FROM stories 
                            WHERE stories.id = story_phrases.story_id 
                            AND stories.user_id = auth.uid()
                        )
                    );

                CREATE POLICY IF NOT EXISTS "Users can insert their own story phrases" ON story_phrases
                    FOR INSERT WITH CHECK (
                        EXISTS (
                            SELECT 1 FROM stories 
                            WHERE stories.id = story_phrases.story_id 
                            AND stories.user_id = auth.uid()
                        )
                    );

                CREATE POLICY IF NOT EXISTS "Users can delete their own story phrases" ON story_phrases
                    FOR DELETE USING (
                        EXISTS (
                            SELECT 1 FROM stories 
                            WHERE stories.id = story_phrases.story_id 
                            AND stories.user_id = auth.uid()
                        )
                    );
            `,
        });

        if (policiesError) {
            console.error("Failed to create RLS policies:", policiesError);
            throw policiesError;
        }

        console.log("Story tables migration completed successfully!");
    } catch (error) {
        console.error("Story tables migration failed:", error);
        throw error;
    }
}

/**
 * Check if story tables exist
 */
export async function checkStoryTablesExist(): Promise<boolean> {
    try {
        const { error } = await supabase.from("stories").select("id").limit(1);

        return !error;
    } catch {
        return false;
    }
}
