#!/usr/bin/env node

const { execSync } = require("child_process");

console.log("🔧 Checking Tauri version alignment...");

try {
    // Check npm @tauri-apps/api version
    const npmTauriVersion = execSync("npm list @tauri-apps/api --depth=0", { encoding: "utf8" });
    const npmVersionMatch = npmTauriVersion.match(/@tauri-apps\/api@([\d.]+)/);
    const npmVersion = npmVersionMatch ? npmVersionMatch[1] : "unknown";
    
    // Check Rust tauri crate version
    const rustTauriVersion = execSync("cd src-tauri && cargo tree | grep 'tauri v' | head -1", { encoding: "utf8" });
    const rustVersionMatch = rustTauriVersion.match(/tauri v([\d.]+)/);
    const rustVersion = rustVersionMatch ? rustVersionMatch[1] : "unknown";
    
    console.log(`📦 NPM @tauri-apps/api: ${npmVersion}`);
    console.log(`🦀 Rust tauri crate: ${rustVersion}`);
    
    if (npmVersion !== rustVersion) {
        console.error("❌ Tauri version mismatch detected!");
        console.log("💡 To fix version mismatch, run:");
        console.log("   npm update @tauri-apps/api");
        console.log("   cd src-tauri && cargo update");
        console.log("   npm run tauri:build  # Test build");
        console.log("\n🚫 Tauri versions must be aligned before release.");
        process.exit(1);
    }
    
    console.log("✅ Tauri versions are aligned!");
} catch (error) {
    console.error("❌ Failed to check Tauri version alignment:");
    console.error(error.message);
    console.log("💡 Make sure Tauri is properly installed:");
    console.log("   npm install");
    console.log("   cd src-tauri && cargo build");
    console.log("\n🚫 Tauri version check failed.");
    process.exit(1);
}
