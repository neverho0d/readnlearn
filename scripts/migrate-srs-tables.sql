-- SRS and Provider Tables Migration
-- This migration adds tables for spaced repetition system, provider caching, and usage tracking

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reviews table for SRS (Spaced Repetition System)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_id UUID REFERENCES phrases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 4),
  ease_factor REAL NOT NULL CHECK (ease_factor >= 1.3),
  interval_days INTEGER NOT NULL CHECK (interval_days >= 0),
  next_review_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for reviews table
CREATE INDEX IF NOT EXISTS idx_reviews_phrase_id ON reviews(phrase_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_next_review_at ON reviews(next_review_at);
CREATE INDEX IF NOT EXISTS idx_reviews_grade ON reviews(grade);
CREATE INDEX IF NOT EXISTS idx_reviews_ease_factor ON reviews(ease_factor);

-- Provider cache table for caching API responses
CREATE TABLE IF NOT EXISTS provider_cache (
  cache_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  method TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for provider cache
CREATE INDEX IF NOT EXISTS idx_provider_cache_provider ON provider_cache(provider);
CREATE INDEX IF NOT EXISTS idx_provider_cache_expires_at ON provider_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_provider_cache_user_id ON provider_cache(user_id);

-- Usage tracking table for monitoring API usage and costs
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  method TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  request_count INTEGER DEFAULT 1,
  tracked_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_provider ON usage_tracking(provider);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tracked_at ON usage_tracking(tracked_at);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, tracked_at);

-- Study sessions table for tracking learning sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'review', -- 'review', 'new', 'mixed'
  total_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  correct_items INTEGER NOT NULL DEFAULT 0,
  average_grade REAL,
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for study sessions
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON study_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_session_type ON study_sessions(session_type);

-- Study session items table for tracking individual items in a session
CREATE TABLE IF NOT EXISTS study_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE NOT NULL,
  phrase_id UUID REFERENCES phrases(id) ON DELETE CASCADE NOT NULL,
  item_order INTEGER NOT NULL,
  grade INTEGER CHECK (grade BETWEEN 1 AND 4),
  response_time_seconds INTEGER,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for study session items
CREATE INDEX IF NOT EXISTS idx_study_session_items_session_id ON study_session_items(session_id);
CREATE INDEX IF NOT EXISTS idx_study_session_items_phrase_id ON study_session_items(phrase_id);
CREATE INDEX IF NOT EXISTS idx_study_session_items_item_order ON study_session_items(item_order);

-- RLS policies for reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews" ON reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for provider_cache table
ALTER TABLE provider_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cache entries" ON provider_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cache entries" ON provider_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cache entries" ON provider_cache
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cache entries" ON provider_cache
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for usage_tracking table
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own usage" ON usage_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for study_sessions table
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study sessions" ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions" ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions" ON study_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for study_session_items table
ALTER TABLE study_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study session items" ON study_session_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions 
      WHERE study_sessions.id = study_session_items.session_id 
      AND study_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own study session items" ON study_session_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_sessions 
      WHERE study_sessions.id = study_session_items.session_id 
      AND study_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own study session items" ON study_session_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM study_sessions 
      WHERE study_sessions.id = study_session_items.session_id 
      AND study_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own study session items" ON study_session_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM study_sessions 
      WHERE study_sessions.id = study_session_items.session_id 
      AND study_sessions.user_id = auth.uid()
    )
  );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_reviews_updated_at 
  BEFORE UPDATE ON reviews 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add functions for SRS calculations
CREATE OR REPLACE FUNCTION calculate_next_review_date(
  p_grade INTEGER,
  p_previous_ease_factor REAL,
  p_previous_interval INTEGER,
  p_previous_repetitions INTEGER
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  new_ease_factor REAL;
  new_interval INTEGER;
  new_repetitions INTEGER;
BEGIN
  -- Validate inputs
  IF p_grade < 1 OR p_grade > 4 THEN
    RAISE EXCEPTION 'Grade must be between 1 and 4';
  END IF;
  
  IF p_previous_ease_factor < 1.3 THEN
    RAISE EXCEPTION 'Previous ease factor must be at least 1.3';
  END IF;
  
  -- Calculate new ease factor
  IF p_grade >= 3 THEN
    new_ease_factor := p_previous_ease_factor + (0.1 - (5 - p_grade) * (0.08 + (5 - p_grade) * 0.02));
  ELSE
    new_ease_factor := GREATEST(1.3, p_previous_ease_factor - 0.2);
  END IF;
  
  -- Calculate new interval
  IF p_grade < 3 THEN
    new_repetitions := 0;
    new_interval := 1;
  ELSE
    new_repetitions := p_previous_repetitions + 1;
    
    IF new_repetitions = 1 THEN
      new_interval := 1;
    ELSIF new_repetitions = 2 THEN
      new_interval := 6;
    ELSE
      new_interval := ROUND(p_previous_interval * new_ease_factor);
    END IF;
  END IF;
  
  RETURN NOW() + (new_interval || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to get due phrases for a user
CREATE OR REPLACE FUNCTION get_due_phrases(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  phrase_id UUID,
  phrase_text TEXT,
  phrase_translation TEXT,
  last_grade INTEGER,
  ease_factor REAL,
  interval_days INTEGER,
  repetitions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as phrase_id,
    p.text as phrase_text,
    p.translation as phrase_translation,
    r.grade as last_grade,
    r.ease_factor,
    r.interval_days,
    COALESCE((
      SELECT COUNT(*)::INTEGER 
      FROM reviews r2 
      WHERE r2.phrase_id = p.id AND r2.user_id = p_user_id
    ), 0) as repetitions
  FROM phrases p
  LEFT JOIN reviews r ON p.id = r.phrase_id
  WHERE p.user_id = p_user_id
    AND (r.next_review_at IS NULL OR r.next_review_at <= NOW())
  ORDER BY 
    CASE WHEN r.next_review_at IS NULL THEN 0 ELSE 1 END,
    r.next_review_at ASC,
    p.added_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM provider_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get user's SRS statistics
CREATE OR REPLACE FUNCTION get_user_srs_stats(p_user_id UUID)
RETURNS TABLE (
  total_reviews INTEGER,
  average_grade REAL,
  retention_rate REAL,
  due_count INTEGER,
  overdue_count INTEGER,
  total_phrases INTEGER,
  mastered_phrases INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(r.id)::INTEGER as total_reviews,
    AVG(r.grade)::REAL as average_grade,
    (COUNT(CASE WHEN r.grade >= 3 THEN 1 END)::REAL / NULLIF(COUNT(r.id), 0) * 100)::REAL as retention_rate,
    COUNT(CASE WHEN r.next_review_at <= NOW() THEN 1 END)::INTEGER as due_count,
    COUNT(CASE WHEN r.next_review_at < NOW() THEN 1 END)::INTEGER as overdue_count,
    COUNT(p.id)::INTEGER as total_phrases,
    COUNT(CASE WHEN r.ease_factor > 2.5 THEN 1 END)::INTEGER as mastered_phrases
  FROM phrases p
  LEFT JOIN reviews r ON p.id = r.phrase_id
  WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments to tables
COMMENT ON TABLE reviews IS 'Stores spaced repetition system data for each phrase review';
COMMENT ON TABLE provider_cache IS 'Caches API responses from external providers to reduce costs and improve performance';
COMMENT ON TABLE usage_tracking IS 'Tracks API usage and costs per user and provider';
COMMENT ON TABLE study_sessions IS 'Records learning sessions with statistics';
COMMENT ON TABLE study_session_items IS 'Individual items reviewed in a study session';

-- Add comments to important columns
COMMENT ON COLUMN reviews.grade IS 'User performance grade (1=again, 2=hard, 3=good, 4=easy)';
COMMENT ON COLUMN reviews.ease_factor IS 'SM-2 ease factor (minimum 1.3)';
COMMENT ON COLUMN reviews.interval_days IS 'Days until next review';
COMMENT ON COLUMN reviews.next_review_at IS 'When this phrase should be reviewed next';

COMMENT ON COLUMN provider_cache.cache_key IS 'Unique key for cached response';
COMMENT ON COLUMN provider_cache.expires_at IS 'When this cache entry expires';

COMMENT ON COLUMN usage_tracking.cost_usd IS 'Cost in USD for this API call';
COMMENT ON COLUMN usage_tracking.tokens_used IS 'Number of tokens consumed';

COMMENT ON COLUMN study_sessions.average_grade IS 'Average grade for this session';
COMMENT ON COLUMN study_sessions.duration_seconds IS 'Session duration in seconds';
