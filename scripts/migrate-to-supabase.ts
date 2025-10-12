/**
 * Migration Script: SQLite to Supabase
 *
 * This script helps migrate existing SQLite data to Supabase.
 * It exports data from SQLite and provides instructions for importing to Supabase.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

interface SQLitePhrase {
    id: string;
    lang: string;
    text: string;
    translation: string | null;
    context: string | null;
    tags_json: string | null;
    added_at: string;
    source_file: string | null;
    content_hash: string | null;
    line_no: number | null;
    col_offset: number | null;
}

interface SupabasePhrase {
    id: string;
    user_id: string;
    lang: string;
    text: string;
    translation: string | null;
    context: string | null;
    tags: string[];
    added_at: string;
    source_file: string | null;
    content_hash: string | null;
    line_no: number | null;
    col_offset: number | null;
    updated_at: string;
}

/**
 * Export data from SQLite database
 * Note: This is a placeholder - actual implementation would depend on the SQLite file location
 */
function exportFromSQLite(): SQLitePhrase[] {
    console.log("📤 Exporting data from SQLite...");

    // In a real implementation, you would:
    // 1. Connect to the SQLite database
    // 2. Query all phrases
    // 3. Return the data

    // For now, return empty array as placeholder
    console.log("⚠️  SQLite export not implemented - please manually export your phrases");
    return [];
}

/**
 * Transform SQLite data to Supabase format
 */
function transformData(sqliteData: SQLitePhrase[], userId: string): SupabasePhrase[] {
    console.log("🔄 Transforming data for Supabase...");

    return sqliteData.map((phrase) => ({
        id: phrase.id,
        user_id: userId,
        lang: phrase.lang,
        text: phrase.text,
        translation: phrase.translation,
        context: phrase.context,
        tags: phrase.tags_json ? JSON.parse(phrase.tags_json) : [],
        added_at: phrase.added_at,
        source_file: phrase.source_file,
        content_hash: phrase.content_hash,
        line_no: phrase.line_no,
        col_offset: phrase.col_offset,
        updated_at: new Date().toISOString(),
    }));
}

/**
 * Generate SQL import script for Supabase
 */
function generateSQLImport(supabaseData: SupabasePhrase[]): string {
    console.log("📝 Generating SQL import script...");

    const sql = `
-- Migration script for ReadNLearn phrases
-- Generated on ${new Date().toISOString()}

-- Insert phrases
INSERT INTO phrases (
  id, user_id, lang, text, translation, context, tags, 
  added_at, source_file, content_hash, line_no, col_offset, updated_at
) VALUES
${supabaseData
    .map(
        (phrase) => `(
  '${phrase.id}',
  '${phrase.user_id}',
  '${phrase.lang}',
  '${phrase.text.replace(/'/g, "''")}',
  ${phrase.translation ? `'${phrase.translation.replace(/'/g, "''")}'` : "NULL"},
  ${phrase.context ? `'${phrase.context.replace(/'/g, "''")}'` : "NULL"},
  '${JSON.stringify(phrase.tags)}',
  '${phrase.added_at}',
  ${phrase.source_file ? `'${phrase.source_file.replace(/'/g, "''")}'` : "NULL"},
  ${phrase.content_hash ? `'${phrase.content_hash}'` : "NULL"},
  ${phrase.line_no || "NULL"},
  ${phrase.col_offset || "NULL"},
  '${phrase.updated_at}'
)`,
    )
    .join(",\n")};

-- Verify the import
SELECT COUNT(*) as imported_phrases FROM phrases WHERE user_id = '${supabaseData[0]?.user_id || "YOUR_USER_ID"}';
`;

    return sql.trim();
}

/**
 * Generate JSON import file for Supabase
 */
function generateJSONImport(supabaseData: SupabasePhrase[]): string {
    console.log("📄 Generating JSON import file...");

    return JSON.stringify(supabaseData, null, 2);
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
    console.log("🚀 Starting migration from SQLite to Supabase...");
    console.log("");

    // Step 1: Export from SQLite
    const sqliteData = exportFromSQLite();

    if (sqliteData.length === 0) {
        console.log("📋 Manual migration steps:");
        console.log("1. Export your phrases from the old application");
        console.log("2. Create a Supabase account at https://supabase.com");
        console.log("3. Create a new project");
        console.log("4. Run the database schema setup (see supabase-migration-plan.plan.md)");
        console.log("5. Import your phrases using the Supabase dashboard or API");
        console.log("");
        console.log("💡 For automated migration, implement the SQLite export function");
        return;
    }

    // Step 2: Get user ID (you'll need to replace this with actual user ID)
    const userId = "YOUR_USER_ID_HERE";
    console.log(`👤 Using user ID: ${userId}`);

    // Step 3: Transform data
    const supabaseData = transformData(sqliteData, userId);
    console.log(`✅ Transformed ${supabaseData.length} phrases`);

    // Step 4: Generate import files
    const sqlScript = generateSQLImport(supabaseData);
    const jsonData = generateJSONImport(supabaseData);

    // Step 5: Save files
    const outputDir = join(process.cwd(), "migration-output");
    if (!existsSync(outputDir)) {
        require("fs").mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(join(outputDir, "phrases-import.sql"), sqlScript);
    writeFileSync(join(outputDir, "phrases-import.json"), jsonData);

    console.log("");
    console.log("✅ Migration files generated:");
    console.log(`📁 ${join(outputDir, "phrases-import.sql")}`);
    console.log(`📁 ${join(outputDir, "phrases-import.json")}`);
    console.log("");
    console.log("📋 Next steps:");
    console.log("1. Update the user_id in the generated files");
    console.log("2. Run the SQL script in your Supabase SQL editor");
    console.log("3. Or use the JSON file with the Supabase API");
    console.log("");
    console.log("🔗 Supabase Dashboard: https://supabase.com/dashboard");
}

// Run migration if called directly
if (require.main === module) {
    migrate().catch(console.error);
}

export { migrate, exportFromSQLite, transformData, generateSQLImport, generateJSONImport };
