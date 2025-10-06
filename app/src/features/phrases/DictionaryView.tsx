import React from "react";
import { ensureDb, loadPhrases } from "../../lib/db/phraseStore";

interface PhraseRow {
    id: string;
    lang: string;
    text: string;
    translation?: string | null;
    context?: string | null;
    tags_json?: string | null;
    tags?: string[];
    added_at?: string;
}

export const DictionaryView: React.FC = () => {
    const [rows, setRows] = React.useState<PhraseRow[]>([]);
    const [loading, setLoading] = React.useState(true);

    const refresh = React.useCallback(async () => {
        setLoading(true);
        try {
            // Try SQL first
            const db = await ensureDb();
            const list = (await db.select(
                "SELECT id, lang, text, translation, context, tags_json, added_at FROM phrases ORDER BY added_at DESC",
            )) as PhraseRow[];
            setRows(list);
        } catch {
            // Fallback to localStorage loader
            setRows(loadPhrases());
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void refresh();
    }, [refresh]);

    const remove = async (id: string) => {
        try {
            const db = await ensureDb();
            await db.execute("DELETE FROM phrases WHERE id=$1", [id]);
        } catch {
            const remaining = loadPhrases().filter((p) => p.id !== id);
            localStorage.setItem("readnlearn-phrases", JSON.stringify(remaining));
        }
        void refresh();
    };

    if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

    if (!rows.length) return <div style={{ padding: 16 }}>No phrases yet.</div>;

    return (
        <div style={{ padding: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                        <th style={{ padding: "8px" }}>Phrase</th>
                        <th style={{ padding: "8px" }}>Translation</th>
                        <th style={{ padding: "8px" }}>Lang</th>
                        <th style={{ padding: "8px" }}>Tags</th>
                        <th style={{ padding: "8px" }}></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const tags = r.tags_json ? JSON.parse(r.tags_json) : r.tags || [];
                        return (
                            <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                                <td style={{ padding: "8px" }}>{r.text}</td>
                                <td style={{ padding: "8px" }}>{r.translation}</td>
                                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{r.lang}</td>
                                <td style={{ padding: "8px" }}>{tags.join(", ")}</td>
                                <td style={{ padding: "8px", textAlign: "right" }}>
                                    <button
                                        onClick={() => remove(r.id)}
                                        style={{
                                            background: "transparent",
                                            color: "#e53e3e",
                                            border: "1px solid #e53e3e",
                                            borderRadius: 4,
                                            padding: "4px 8px",
                                            cursor: "pointer",
                                            fontSize: 12,
                                        }}
                                        title="Remove"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
