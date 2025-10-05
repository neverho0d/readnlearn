import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./app/tests/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["app/src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.*", "app/tests/**"],
    },
  },
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
});
