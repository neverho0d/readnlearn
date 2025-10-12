/// <reference types="vite/client" />

// Vite-exposed environment variables
declare const __TAURI_PLATFORM__: string | undefined;
declare const __TAURI_DEBUG__: string | undefined;

// sql.js module declaration
declare module "sql.js" {
    const initSqlJs: unknown;
    export default initSqlJs;
}
