#!/usr/bin/env node

/**
 * Automated Database Migration
 *
 * This script automatically applies database migrations using Supabase.
 * It uses the service role key to execute SQL directly.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing required environment variables:");
    console.error("   VITE_SUPABASE_URL");
    console.error("   SUPABASE_SERVICE_ROLE_KEY");
    console.error("\n💡 To get your service role key:");
    console.error("   1. Go to your Supabase dashboard");
    console.error("   2. Go to Settings > API");
    console.error("   3. Copy the 'service_role' key");
    console.error("   4. Set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(sqlFile) {
    console.log(`🔧 Running migration: ${sqlFile}`);

    const sqlPath = path.join(__dirname, sqlFile);
    if (!fs.existsSync(sqlPath)) {
        throw new Error(`SQL file not found: ${sqlFile}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    console.log("📝 SQL Content:");
    console.log("─".repeat(50));
    console.log(sqlContent);
    console.log("─".repeat(50));
    console.log();

    // Execute SQL using Supabase's SQL execution
    try {
        const { data, error } = await supabase.rpc("exec_sql", { sql: sqlContent });

        if (error) {
            throw new Error(`Migration failed: ${error.message}`);
        }

        console.log("✅ Migration completed successfully");
    } catch (rpcError) {
        console.log("⚠️  RPC method failed, trying alternative approach...");

        // Alternative: Use direct SQL execution via REST API
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseServiceKey}`,
                    apikey: supabaseServiceKey,
                },
                body: JSON.stringify({ sql: sqlContent }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log("✅ Migration completed successfully");
        } catch (httpError) {
            console.error("❌ Migration failed:", httpError.message);
            console.log("\n🔧 Manual fallback:");
            console.log("1. Open your Supabase dashboard");
            console.log("2. Go to SQL Editor");
            console.log("3. Copy and paste the SQL from the file");
            console.log("4. Run it manually");
            throw httpError;
        }
    }
}

// Run the migration
const sqlFile = process.argv[2] || "fix-get-due-phrases.sql";
runMigration(sqlFile).catch(console.error);
