#!/usr/bin/env node

/**
 * Update get_due_phrases RPC function to include context field
 * This script uses the Supabase client to execute SQL directly
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qprbsawqpiolalyrzfvt.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcmJzYXdxcGlvbGFseXJ6ZnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTk2NzUsImV4cCI6MjA3NTY5NTY3NX0.p8l4A2IF1l7rgYXPd_LVnFPx7zZ3NcKy1VDWWkdO2qc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRPCFunction() {
    try {
        console.log("🔧 Updating get_due_phrases RPC function to include context...");

        // SQL to update the RPC function
        const sql = `
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
    `;

        // Execute the SQL using a direct query
        const { error } = await supabase.rpc("exec", { sql });

        if (error) {
            console.error("❌ Failed to update RPC function:", error);
            process.exit(1);
        }

        console.log("✅ RPC function updated successfully!");
        console.log("📝 The get_due_phrases function now includes phrase_context field");
    } catch (error) {
        console.error("❌ Failed to update RPC function:", error);
        process.exit(1);
    }
}

updateRPCFunction();
