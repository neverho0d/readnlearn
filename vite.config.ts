import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    root: resolve(__dirname, "./app"),
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./app/src"),
            "@/components": resolve(__dirname, "./app/src/components"),
            "@/features": resolve(__dirname, "./app/src/features"),
            "@/lib": resolve(__dirname, "./app/src/lib"),
            "@/adapters": resolve(__dirname, "./app/src/adapters"),
            "@/types": resolve(__dirname, "./app/src/types"),
        },
    },
    define: {
        // Expose Tauri environment variables to client-side code
        __TAURI_PLATFORM__: JSON.stringify(process.env.TAURI_PLATFORM),
        __TAURI_DEBUG__: JSON.stringify(process.env.TAURI_DEBUG),
    },
    server: {
        port: 1420,
        strictPort: true,
        watch: { ignored: ["**/src-tauri/**", "**/*.tsx"] },
        headers: {
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
        },
    },
    build: {
        target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
        minify: process.env.TAURI_DEBUG ? false : "esbuild",
        sourcemap: !!process.env.TAURI_DEBUG,
    },
});
