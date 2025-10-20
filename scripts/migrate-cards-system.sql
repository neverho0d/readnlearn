-- Migration: Cards System
-- Creates tables for the new card-based learning system

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phrase_id UUID REFERENCES phrases(id) ON DELETE CASCADE,
    card_type TEXT NOT NULL CHECK (card_type IN ('simple', 'cloze')),
    difficulty_type TEXT, -- 'prepositions', 'verbs', 'cases', etc. (null for simple cards)
    front_text TEXT NOT NULL, -- phrase or cloze text
    back_text TEXT NOT NULL, -- translation or answer
    cloze_hint TEXT, -- hint for cloze cards
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card reviews (SRS per card)
CREATE TABLE IF NOT EXISTS card_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 4),
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 1,
    repetitions INTEGER NOT NULL DEFAULT 0,
    next_review_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, card_id)
);

-- Note: We reuse the existing 'stories' table for dictionary-only story generation
-- The stories table already has the perfect schema:
-- - phrase_id, phrase, translation, story, context, status
-- - No need to create a new table

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_user_phrase ON cards(user_id, phrase_id);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_card_reviews_user_card ON card_reviews(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_card_reviews_next_review ON card_reviews(next_review_at);
CREATE INDEX IF NOT EXISTS idx_stories_user_phrase ON stories(user_id, phrase_id);

-- RLS Policies
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_reviews ENABLE ROW LEVEL SECURITY;

-- Cards policies
CREATE POLICY "Users can view their own cards" ON cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cards" ON cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" ON cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" ON cards
    FOR DELETE USING (auth.uid() = user_id);

-- Card reviews policies
CREATE POLICY "Users can view their own card reviews" ON card_reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own card reviews" ON card_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card reviews" ON card_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own card reviews" ON card_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Note: RLS policies for 'stories' table already exist from previous migrations

-- Function to get due cards for study
CREATE OR REPLACE FUNCTION get_due_cards(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    card_id UUID,
    phrase_id UUID,
    card_type TEXT,
    difficulty_type TEXT,
    front_text TEXT,
    back_text TEXT,
    cloze_hint TEXT,
    grade INTEGER,
    ease_factor REAL,
    interval_days INTEGER,
    repetitions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as card_id,
        c.phrase_id,
        c.card_type,
        c.difficulty_type,
        c.front_text,
        c.back_text,
        c.cloze_hint,
        COALESCE(cr.grade, 0) as grade,
        COALESCE(cr.ease_factor, 2.5) as ease_factor,
        COALESCE(cr.interval_days, 1) as interval_days,
        COALESCE(cr.repetitions, 0) as repetitions
    FROM cards c
    LEFT JOIN card_reviews cr ON c.id = cr.card_id AND cr.user_id = p_user_id
    WHERE c.user_id = p_user_id
      AND (cr.next_review_at IS NULL OR cr.next_review_at <= NOW())
    ORDER BY 
        CASE WHEN cr.next_review_at IS NULL THEN 0 ELSE 1 END,
        cr.next_review_at ASC,
        c.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get card statistics
CREATE OR REPLACE FUNCTION get_card_stats(p_user_id UUID)
RETURNS TABLE (
    total_cards INTEGER,
    due_cards INTEGER,
    mastered_cards INTEGER,
    average_grade REAL,
    retention_rate REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT c.id)::INTEGER as total_cards,
        COUNT(CASE WHEN cr.next_review_at IS NULL OR cr.next_review_at <= NOW() THEN 1 END)::INTEGER as due_cards,
        COUNT(CASE WHEN cr.repetitions >= 5 AND cr.ease_factor >= 2.5 THEN 1 END)::INTEGER as mastered_cards,
        COALESCE(AVG(cr.grade), 0)::REAL as average_grade,
        COALESCE(
            COUNT(CASE WHEN cr.grade >= 3 THEN 1 END)::REAL / NULLIF(COUNT(cr.id), 0),
            0
        )::REAL as retention_rate
    FROM cards c
    LEFT JOIN card_reviews cr ON c.id = cr.card_id AND cr.user_id = p_user_id
    WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
