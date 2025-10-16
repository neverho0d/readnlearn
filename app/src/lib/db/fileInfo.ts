import { supabase } from "../supabase/client";

export interface FileInfo {
    id?: string;
    user_id?: string;
    source_file: string; // file path or URI
    content_hash: string; // SHA-256 base64
    file_format?: "text" | "markdown";
    language?: string; // detected L2 code
    bytes?: number;
    updated_at?: string;
}

export async function upsertFileInfo(info: FileInfo): Promise<void> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const payload = { ...info, user_id: user?.id, updated_at: new Date().toISOString() };
    const { error } = await supabase
        .from("file_info")
        .upsert(payload, { onConflict: "user_id,content_hash" });
    if (error) throw error;
}

export async function getFileInfoByHash(hash: string): Promise<FileInfo | null> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from("file_info")
        .select("source_file,content_hash,file_format,language,bytes,updated_at")
        .eq("user_id", user?.id)
        .eq("content_hash", hash)
        .maybeSingle();
    if (error) return null;
    return data as unknown as FileInfo | null;
}
