#!/usr/bin/env node

/**
 * Fix Card Reviews Constraint Script
 *
 * This script applies the database migration to fix the card_reviews constraint issue.
 * Run this script to add the missing unique constraint on (user_id, card_id).
 */

const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing card_reviews constraint issue...\n");

// Read the SQL migration file
const sqlFile = path.join(__dirname, "fix-card-reviews-constraint.sql");
const sqlContent = fs.readFileSync(sqlFile, "utf8");

console.log("📄 SQL Migration Content:");
console.log("─".repeat(50));
console.log(sqlContent);
console.log("─".repeat(50));

console.log("\n📋 Instructions:");
console.log("1. Open your Supabase dashboard");
console.log("2. Go to the SQL Editor");
console.log("3. Copy and paste the SQL content above");
console.log("4. Execute the SQL");
console.log("5. Verify the constraint was added successfully");

console.log("\n✅ After running this migration:");
console.log("- The card_reviews table will have a unique constraint on (user_id, card_id)");
console.log("- The ON CONFLICT clause in updateCardReview will work correctly");
console.log("- Study session progress saving will no longer fail");

console.log("\n🔍 To verify the fix:");
console.log("- Check that card_reviews has constraint: card_reviews_user_id_card_id_key");
console.log("- Try running a study session to confirm progress saves correctly");
