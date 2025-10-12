/**
 * Tauri Credential Storage
 *
 * Provides secure credential storage using Tauri's backend.
 * This is used for storing Supabase session tokens securely.
 */

import { invoke } from "@tauri-apps/api/tauri";

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
        try {
            await invoke("store_credential", { service: _service, key: _key, value: _value });
        } catch (error) {
            console.error("Failed to store credential:", error);
            throw error;
        }
    }

    async getCredential(_service: string, _key: string): Promise<string | null> {
        try {
            const result = await invoke<string | null>("get_credential", {
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
