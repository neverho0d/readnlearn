#!/usr/bin/env node

// Read-n-Learn factory reset (command-line only)
// Clears the Tauri app data directory so the app returns to initial state

import fs from "fs";
import os from "os";
import path from "path";

function getTauriDataDir() {
    const home = os.homedir();
    const platform = os.platform();
    const appId = "com.psv.tauri-app";

    if (platform === "win32") {
        return path.join(home, "AppData", "Roaming", appId);
    }
    if (platform === "darwin") {
        return path.join(home, "Library", "Application Support", appId);
    }
    // linux and others
    return path.join(home, ".local", "share", appId);
}

function reset() {
    const { process } = globalThis;
    const dataDir = getTauriDataDir();
    try {
        const { console } = globalThis;
        if (fs.existsSync(dataDir)) {
            fs.rmSync(dataDir, { recursive: true, force: true });
            console.log("✅ Cleared app data:", dataDir);
        } else {
            console.log("ℹ️ No app data directory found:", dataDir);
        }
        console.log("✅ Reset complete. Launch the app to see initial state.");
        process.exit(0);
    } catch (err) {
        const { console } = globalThis;
        console.error("❌ Reset failed:", err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}

reset();
