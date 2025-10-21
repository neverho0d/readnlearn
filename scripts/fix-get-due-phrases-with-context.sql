-- Fix get_due_phrases RPC function to include context field
-- This script updates the function to return phrase context for better learning experience

-- Function to get due phrases for a user with context
CREATE OR REPLACE FUNCTION get_due_phrases(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  phrase_id UUID,
  phrase_text TEXT,
  phrase_translation TEXT,
  phrase_context TEXT,
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
    p.context as phrase_context,
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

-- Test the function to make sure it works
-- SELECT * FROM get_due_phrases('your-user-id-here'::UUID, 5);
