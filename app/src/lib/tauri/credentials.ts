/**
 * Tauri Credential Storage
 *
 * Provides secure credential storage using Tauri's backend.
 * This is used for storing Supabase session tokens securely.
 */

// Dynamic import for Tauri API
async function getTauriInvoke() {
    try {
        // Check if we're in a Tauri environment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window !== "undefined" && (window as any).__TAURI__) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const module = await import("@tauri-apps/api/tauri" as any);
                return module.invoke;
            } catch {
                // Tauri API not available
                return null;
            }
        }
        return null;
    } catch {
        return null;
    }
}

export interface CredentialStorage {
    // eslint-disable-next-line no-unused-vars
    storeCredential(service: string, key: string, value: string): Promise<void>;
    // eslint-disable-next-line no-unused-vars
    getCredential(service: string, key: string): Promise<string | null>;
    // eslint-disable-next-line no-unused-vars
    deleteCredential(service: string, key: string): Promise<void>;
}

class TauriCredentialStorage implements CredentialStorage {
    async storeCredential(_service: string, _key: string, _value: string): Promise<void> {
        const invoke = await getTauriInvoke();
        if (!invoke) {
            throw new Error("Tauri not available");
        }
        try {
            await invoke("store_credential", { service: _service, key: _key, value: _value });
        } catch (error) {
            console.error("Failed to store credential:", error);
            throw error;
        }
    }

    async getCredential(_service: string, _key: string): Promise<string | null> {
        const invoke = await getTauriInvoke();
        if (!invoke) {
            return null;
        }
        try {
            const result = await invoke("get_credential", {
                service: _service,
                key: _key,
            });
            return result;
        } catch (error) {
            console.error("Failed to get credential:", error);
            return null;
        }
    }

    async deleteCredential(_service: string, _key: string): Promise<void> {
        const invoke = await getTauriInvoke();
        if (!invoke) {
            throw new Error("Tauri not available");
        }
        try {
            await invoke("delete_credential", { service: _service, key: _key });
        } catch (error) {
            console.error("Failed to delete credential:", error);
            throw error;
        }
    }
}

// Export singleton instance
export const credentialStorage = new TauriCredentialStorage();
