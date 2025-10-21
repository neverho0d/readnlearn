#!/usr/bin/env node

/**
 * Update get_due_phrases RPC function to include context field
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables");
    console.error("Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log("🔧 Updating get_due_phrases RPC function to include context...");

        const sqlPath = path.join(__dirname, "fix-get-due-phrases-with-context.sql");
        const sql = fs.readFileSync(sqlPath, "utf8");

        const { error } = await supabase.rpc("exec_sql", { sql });

        if (error) {
            console.error("❌ Migration failed:", error);
            process.exit(1);
        }

        console.log("✅ RPC function updated successfully!");
        console.log("📝 The get_due_phrases function now includes phrase_context field");
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
