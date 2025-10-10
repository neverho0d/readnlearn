/**
 * Database Factory
 *
 * Creates the appropriate database adapter based on environment configuration.
 * This allows the application to seamlessly switch between different database backends.
 */

import { DatabaseAdapter } from "./DatabaseAdapter";
import { SQLiteAdapter } from "./SQLiteAdapter";
import { PostgreSQLAdapter } from "./PostgreSQLAdapter";

export type DatabaseType = "sqlite" | "postgresql" | "mysql" | "sqlite-browser";

export interface DatabaseConfig {
    type: DatabaseType;
    connectionString?: string;
    options?: {
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
        ssl?: boolean;
        dbPath?: string;
    };
}

export class DatabaseFactory {
    private static instance: DatabaseAdapter | null = null;

    /**
     * Get the database adapter instance (singleton pattern)
     */
    static async getInstance(config?: DatabaseConfig): Promise<DatabaseAdapter> {
        if (this.instance && this.instance.isConnected()) {
            return this.instance;
        }

        const finalConfig = config || this.getDefaultConfig();
        this.instance = await this.createAdapter(finalConfig);
        return this.instance;
    }

    /**
     * Create a new database adapter instance
     */
    static async createAdapter(config: DatabaseConfig): Promise<DatabaseAdapter> {
        let adapter: DatabaseAdapter;

        switch (config.type) {
            case "sqlite":
                adapter = new SQLiteAdapter(config.options?.dbPath);
                break;

            case "postgresql":
                if (!config.connectionString) {
                    throw new Error("PostgreSQL connection string is required");
                }
                adapter = new PostgreSQLAdapter(config.connectionString, config.options);
                break;

            case "mysql":
                // TODO: Implement MySQL adapter
                throw new Error("MySQL adapter not yet implemented");

            case "sqlite-browser":
                // TODO: Implement browser SQLite adapter (fallback only)
                throw new Error("Browser SQLite adapter not yet implemented");

            default:
                throw new Error(`Unsupported database type: ${config.type}`);
        }

        // Connect the adapter before returning it
        await adapter.connect();
        return adapter;
    }

    /**
     * Get default configuration based on environment
     */
    private static getDefaultConfig(): DatabaseConfig {
        // Check if running in Tauri with improved detection

        // Early Tauri detection: Check for Tauri-specific globals
        if (typeof window !== "undefined") {
            const hasTauriGlobals =
                typeof (window as any).__TAURI__ !== "undefined" ||
                typeof (window as any).__TAURI_INTERNALS__ !== "undefined" ||
                typeof (window as any).__TAURI_METADATA__ !== "undefined";

            if (hasTauriGlobals) {
                console.log("✅ DatabaseFactory: Tauri environment detected via globals");
                return {
                    type: "sqlite",
                    options: {
                        dbPath: "sqlite:readnlearn.db",
                    },
                };
            }
        }

        // Primary Tauri detection: window.__TAURI__ (most reliable)
        const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;

        // Secondary detection: Vite-exposed environment variables
        const isTauriPlatform =
            typeof __TAURI_PLATFORM__ !== "undefined" && __TAURI_PLATFORM__ !== null;

        // Tertiary detection: process.env (fallback)
        const isTauriProcess =
            typeof process !== "undefined" && process.env?.TAURI_PLATFORM !== undefined;

        // Protocol detection (for Tauri apps)
        const isTauriProtocol =
            typeof window !== "undefined" && window.location.protocol === "tauri:";

        // Additional detection: Check for Tauri-specific user agent
        const isTauriUserAgent =
            typeof window !== "undefined" && window.navigator.userAgent.includes("Tauri");

        const isTauriApp =
            isTauri || isTauriPlatform || isTauriProcess || isTauriProtocol || isTauriUserAgent;

        console.log("DatabaseFactory Tauri detection:", {
            isTauri,
            isTauriPlatform,
            isTauriProcess,
            isTauriProtocol,
            isTauriUserAgent,
            isTauriApp,
            userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "N/A",
        });

        if (isTauriApp) {
            // Tauri desktop application - use SQLite
            console.log("✅ DatabaseFactory: Using Tauri SQLite");
            return {
                type: "sqlite",
                options: {
                    dbPath: "sqlite:readnlearn.db",
                },
            };
        }

        // Check for cloud deployment environment variables (only if process is available)
        if (typeof process !== "undefined" && process.env?.DATABASE_URL) {
            // Cloud deployment with PostgreSQL
            return {
                type: "postgresql",
                connectionString: process.env.DATABASE_URL,
            };
        }

        if (typeof process !== "undefined" && process.env?.POSTGRES_HOST) {
            // Cloud deployment with PostgreSQL (individual connection params)
            return {
                type: "postgresql",
                connectionString: `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`,
                options: {
                    ssl: process.env.NODE_ENV === "production",
                },
            };
        }

        // Fallback to SQLite (should not happen in production)
        console.warn("No database configuration found, falling back to SQLite");
        return {
            type: "sqlite",
            options: {
                dbPath: "sqlite:readnlearn.db",
            },
        };
    }

    /**
     * Disconnect and reset the database instance
     */
    static async disconnect(): Promise<void> {
        if (this.instance) {
            await this.instance.disconnect();
            this.instance = null;
        }
    }

    /**
     * Get database information
     */
    static async getDatabaseInfo(): Promise<import("./DatabaseAdapter").DatabaseInfo> {
        const db = await this.getInstance();
        return db.getDatabaseInfo();
    }
}
