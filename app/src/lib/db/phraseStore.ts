// Simple persistence for phrases
// Uses Tauri SQL plugin when available; falls back to localStorage
import Database from "@tauri-apps/plugin-sql";

export interface SavedPhrase {
  id: string;
  lang: string; // L2
  text: string;
  translation: string;
  context: string;
  tags: string[];
  addedAt: string; // ISO
}

const STORAGE_KEY = "readnlearn-phrases";

export async function ensureDb() {
  const db = await Database.load("sqlite:readnlearn.db");
  await db.execute(
    `CREATE TABLE IF NOT EXISTS phrases (
      id TEXT PRIMARY KEY,
      lang TEXT NOT NULL,
      text TEXT NOT NULL,
      translation TEXT,
      context TEXT,
      tags_json TEXT,
      added_at TEXT NOT NULL
    )`,
  );
  return db;
}

export function loadPhrases(): SavedPhrase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedPhrase[]) : [];
  } catch {
    return [];
  }
}

export async function savePhrase(
  p: Omit<SavedPhrase, "id" | "addedAt">,
): Promise<SavedPhrase> {
  try {
    const db = await ensureDb();
    const saved: SavedPhrase = {
      ...p,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString(),
    };
    await db.execute(
      `INSERT INTO phrases (id, lang, text, translation, context, tags_json, added_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        saved.id,
        saved.lang,
        saved.text,
        saved.translation,
        saved.context,
        JSON.stringify(saved.tags),
        saved.addedAt,
      ],
    );
    return saved;
  } catch (e) {
    // Fallback to localStorage
    const current = loadPhrases();
    const saved: SavedPhrase = {
      ...p,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([saved, ...current]));
    return saved;
  }
}
