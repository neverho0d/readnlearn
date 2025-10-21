#!/usr/bin/env node

/**
 * Test the get_due_phrases RPC function to see what data it returns
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qprbsawqpiolalyrzfvt.supabase.co";
const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcmJzYXdxcGlvbGFseXJ6ZnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTk2NzUsImV4cCI6MjA3NTY5NTY3NX0.p8l4A2IF1l7rgYXPd_LVnFPx7zZ3NcKy1VDWWkdO2qc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPCFunction() {
    try {
        console.log("🧪 Testing get_due_phrases RPC function...");

        // First, let's see what phrases exist
        const { data: phrases, error: phrasesError } = await supabase
            .from("phrases")
            .select("id, text, translation, context")
            .limit(3);

        if (phrasesError) {
            console.error("❌ Failed to get phrases:", phrasesError);
            return;
        }

        console.log("📝 Sample phrases from database:");
        phrases?.forEach((phrase, index) => {
            console.log(`${index + 1}. ID: ${phrase.id}`);
            console.log(`   Text: ${phrase.text}`);
            console.log(`   Translation: ${phrase.translation || "NULL"}`);
            console.log(`   Context: ${phrase.context || "NULL"}`);
            console.log("");
        });

        // Now test the RPC function
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_due_phrases", {
            p_user_id: phrases?.[0]?.id || "00000000-0000-0000-0000-000000000000",
            p_limit: 3,
        });

        if (rpcError) {
            console.error("❌ RPC function failed:", rpcError);
            return;
        }

        console.log("🔍 RPC function result:");
        console.log("Fields returned:", rpcData?.[0] ? Object.keys(rpcData[0]) : "No data");
        if (rpcData?.[0]) {
            console.log("Sample data:", JSON.stringify(rpcData[0], null, 2));
        }
    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

testRPCFunction();
