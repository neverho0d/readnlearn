#!/usr/bin/env node

/**
 * Cards System Migration Runner
 *
 * Runs the database migration to create the new card-based learning system.
 * This script will guide you through the migration process.
 */

const fs = require("fs");
const path = require("path");

console.log("🔄 Cards System Migration");
console.log("========================");
console.log("");

// Check if migration file exists
const migrationFile = path.join(__dirname, "migrate-cards-system.sql");
if (!fs.existsSync(migrationFile)) {
    console.error("❌ Migration file not found:", migrationFile);
    process.exit(1);
}

// Read the migration file
const migrationSQL = fs.readFileSync(migrationFile, "utf8");

console.log("📋 Migration Overview:");
console.log("");
console.log("This migration will create:");
console.log("• cards table - stores simple and cloze cards");
console.log("• card_reviews table - SRS data per card");
console.log("• RLS policies for security");
console.log("• Helper functions for study sessions");
console.log("• Reuses existing 'stories' table for dictionary story generation");
console.log("");

console.log("⚠️  Important Notes:");
console.log("• This will NOT affect existing phrases or translations");
console.log("• Cards will be generated automatically for existing phrases");
console.log("• Stories will be available on-demand via phrase dropdown menu");
console.log("• Existing stories (11 stories) will be preserved and accessible");
console.log("");

console.log("📝 SQL Migration Script:");
console.log("========================");
console.log("");
console.log(migrationSQL);
console.log("");
console.log("========================");
console.log("");

console.log("🚀 Next Steps:");
console.log("");
console.log("1. Copy the SQL above");
console.log("2. Go to your Supabase dashboard");
console.log("3. Navigate to SQL Editor");
console.log("4. Paste and run the SQL");
console.log("5. Verify the tables were created successfully");
console.log("");

console.log("✅ After migration:");
console.log("• Cards will be generated for existing phrases");
console.log("• Study sessions will use the new card system");
console.log("• Stories will be available via phrase dropdown menu");
console.log("");

console.log("Press Ctrl+C to exit");
