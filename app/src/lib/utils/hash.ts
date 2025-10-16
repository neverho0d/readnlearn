export async function sha256Base64(input: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    // In both web and Tauri, SubtleCrypto is available
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}
