#!/usr/bin/env node

/**
 * Fix get_due_phrases RPC Function
 *
 * This script helps you run the SQL migration to fix the "column r.repetitions does not exist" error.
 * The get_due_phrases RPC function is trying to access a non-existent 'repetitions' column.
 * This migration fixes it by calculating repetitions from the review count instead.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔧 Fix get_due_phrases RPC Function");
console.log("=====================================\n");

console.log("❌ Problem:");
console.log("   The get_due_phrases RPC function is trying to access r.repetitions column");
console.log("   but the reviews table doesn't have this column, causing the error:");
console.log('   "column r.repetitions does not exist"\n');

console.log("✅ Solution:");
console.log("   Update the RPC function to calculate repetitions from review count\n");

console.log("📋 Steps to fix:");
console.log("1. Open your Supabase dashboard");
console.log("2. Go to SQL Editor");
console.log("3. Copy and paste the contents of fix-get-due-phrases.sql");
console.log("4. Run the SQL script");
console.log("5. Test the function works\n");

console.log("📄 SQL Script location:");
console.log(`   ${path.join(__dirname, "fix-get-due-phrases.sql")}\n`);

console.log("📝 SQL Script contents:");
console.log("─".repeat(50));

const sqlPath = path.join(__dirname, "fix-get-due-phrases.sql");
if (fs.existsSync(sqlPath)) {
    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    console.log(sqlContent);
} else {
    console.log("❌ SQL script not found!");
}

console.log("─".repeat(50));
console.log("\n✅ After running this SQL, the study session should work correctly!");
