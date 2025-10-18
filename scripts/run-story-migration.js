#!/usr/bin/env node

/**
 * Script to run the individual stories database migration
 *
 * This script helps ensure the database schema is updated to support
 * individual phrase stories instead of the old single-story approach.
 */

const fs = require("fs");
const path = require("path");

console.log("🔧 Read-n-Learn: Individual Stories Migration Helper");
console.log("==================================================");
console.log("");

console.log("📋 To complete the migration, you need to:");
console.log("");
console.log("1. Open your Supabase dashboard");
console.log("2. Go to the SQL Editor");
console.log("3. Copy and paste the contents of: scripts/migrate-individual-stories.sql");
console.log("4. Execute the SQL script");
console.log("");

// Read and display the migration script
const migrationPath = path.join(__dirname, "migrate-individual-stories.sql");
try {
    const migrationContent = fs.readFileSync(migrationPath, "utf8");
    console.log("📄 Migration script contents:");
    console.log("================================");
    console.log(migrationContent);
    console.log("================================");
    console.log("");
    console.log("✅ Copy the above SQL and run it in your Supabase SQL Editor");
} catch (error) {
    console.error("❌ Could not read migration script:", error.message);
    console.log("");
    console.log("Please ensure scripts/migrate-individual-stories.sql exists");
}

console.log("");
console.log("🎯 After running the migration:");
console.log("- The old stories table will be dropped");
console.log("- A new stories table will be created for individual phrase stories");
console.log("- Proper indexes and RLS policies will be set up");
console.log("- Story generation should work correctly");
console.log("");
console.log("⚠️  Note: This will delete any existing stories data!");
console.log("   Make sure to backup your data if needed.");
