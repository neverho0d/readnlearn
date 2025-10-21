#!/usr/bin/env node

/**
 * Debug database to see what data exists
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qprbsawqpiolalyrzfvt.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcmJzYXdxcGlvbGFseXJ6ZnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTk2NzUsImV4cCI6MjA3NTY5NTY3NX0.p8l4A2IF1l7rgYXPd_LVnFPx7zZ3NcKy1VDWWkdO2qc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
    try {
        console.log("🔍 Debugging database...");

        // Check if we can access the phrases table
        const { data: phrases, error: phrasesError } = await supabase
            .from("phrases")
            .select("*")
            .limit(5);

        if (phrasesError) {
            console.error("❌ Failed to access phrases table:", phrasesError);
            return;
        }

        console.log(`📊 Found ${phrases?.length || 0} phrases in database`);

        if (phrases && phrases.length > 0) {
            console.log("📝 Sample phrase data:");
            console.log(JSON.stringify(phrases[0], null, 2));

            // Test RPC function with the first phrase's user_id
            const userId = phrases[0].user_id;
            console.log(`\n🧪 Testing RPC function with user_id: ${userId}`);

            const { data: rpcData, error: rpcError } = await supabase.rpc("get_due_phrases", {
                p_user_id: userId,
                p_limit: 3,
            });

            if (rpcError) {
                console.error("❌ RPC function failed:", rpcError);
                return;
            }

            console.log("🔍 RPC function result:");
            console.log(`Returned ${rpcData?.length || 0} phrases`);
            if (rpcData && rpcData.length > 0) {
                console.log("Fields returned:", Object.keys(rpcData[0]));
                console.log("Sample data:", JSON.stringify(rpcData[0], null, 2));
            }
        } else {
            console.log("❌ No phrases found in database");
        }
    } catch (error) {
        console.error("❌ Debug failed:", error);
    }
}

debugDatabase();
