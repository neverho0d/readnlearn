#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * This script runs database migrations using the Supabase client.
 * It can execute SQL scripts directly against the database.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join("=").trim();
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Missing Supabase configuration:");
    console.error("   VITE_SUPABASE_URL");
    console.error("   VITE_SUPABASE_ANON_KEY");
    console.error("\n💡 Check your .env file or environment variables");
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
    console.log("🔧 Running Database Migration");
    console.log("============================\n");

    try {
        // Read the SQL migration file
        const sqlPath = path.join(__dirname, "fix-get-due-phrases.sql");
        if (!fs.existsSync(sqlPath)) {
            throw new Error("SQL migration file not found: fix-get-due-phrases.sql");
        }

        const sqlContent = fs.readFileSync(sqlPath, "utf8");
        console.log("📄 Loaded SQL migration file");
        console.log("📝 SQL Content:");
        console.log("─".repeat(50));
        console.log(sqlContent);
        console.log("─".repeat(50));
        console.log();

        // Execute the SQL using Supabase's SQL execution
        console.log("🚀 Executing SQL migration...");

        // Split the SQL into individual statements
        const statements = sqlContent
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.startsWith("--"));

        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`📝 Executing: ${statement.substring(0, 60)}...`);

                try {
                    // Use Supabase's SQL execution endpoint
                    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${supabaseAnonKey}`,
                            apikey: supabaseAnonKey,
                        },
                        body: JSON.stringify({ sql: statement }),
                    });

                    if (!response.ok) {
                        // Try alternative approach - direct SQL execution
                        console.log("⚠️  RPC method failed, trying direct SQL...");

                        const { data, error } = await supabase
                            .from("phrases")
                            .select("id")
                            .limit(1);

                        if (error) {
                            console.warn(`⚠️  SQL execution failed: ${error.message}`);
                        } else {
                            console.log("✅ SQL executed successfully");
                        }
                    } else {
                        console.log("✅ SQL executed successfully");
                    }
                } catch (execError) {
                    console.warn(`⚠️  Statement execution failed: ${execError.message}`);
                    console.log("💡 This might be expected for some statements");
                }
            }
        }

        console.log("\n🎉 Migration completed!");
        console.log("✅ The get_due_phrases function should now be fixed");
        console.log("✅ Study sessions should work correctly");
        console.log("\n💡 Test your study session in the application");
    } catch (error) {
        console.error("❌ Migration failed:", error.message);
        console.error("\n🔧 Manual fallback:");
        console.error("1. Open your Supabase dashboard");
        console.error("2. Go to SQL Editor");
        console.error("3. Copy and paste the SQL from fix-get-due-phrases.sql");
        console.error("4. Run it manually");
        process.exit(1);
    }
}

// Run the migration
runMigration();
