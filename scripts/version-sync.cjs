#!/usr/bin/env node

const fs = require("fs");
const { execSync } = require("child_process");

// Read version from VERSION file
const version = fs.readFileSync("VERSION", "utf8").trim();

console.log(`Syncing version ${version} across all files...`);

// Update package.json
const packageJsonPath = "package.json";
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
packageJson.version = version;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

// Update tauri.conf.json
const tauriConfPath = "src-tauri/tauri.conf.json";
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 4));

// Update Cargo.toml
const cargoTomlPath = "src-tauri/Cargo.toml";
let cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
cargoToml = cargoToml.replace(/version = "[\d.]+"/, `version = "${version}"`);
fs.writeFileSync(cargoTomlPath, cargoToml);

console.log("✅ Version synced successfully!");
console.log(`📄 VERSION: ${version}`);
console.log(`📦 package.json: ${version}`);
console.log(`⚙️  tauri.conf.json: ${version}`);
console.log(`🦀 Cargo.toml: ${version}`);

// Security audit check
console.log(`\n🔒 Running security audit...`);
try {
    execSync("npm audit --audit-level=moderate", { stdio: "inherit" });
    console.log("✅ Security audit passed - no vulnerabilities found!");
} catch (error) {
    console.error("❌ Security audit failed - vulnerabilities detected!");
    console.log("💡 To fix vulnerabilities, run:");
    console.log("   npm audit fix");
    console.log("   npm audit --audit-level=moderate");
    console.log("\n🚫 Release blocked due to security issues.");
    console.log("Please fix all vulnerabilities before proceeding with the release.");
    process.exit(1);
}

// Tauri version alignment check
console.log(`\n🔧 Checking Tauri version alignment...`);
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
        console.log("\n🚫 Release blocked due to Tauri version mismatch.");
        console.log("Please align Tauri versions before proceeding with the release.");
        process.exit(1);
    }
    
    console.log("✅ Tauri versions are aligned!");
} catch (error) {
    console.error("❌ Failed to check Tauri version alignment:");
    console.error(error.message);
    console.log("💡 Make sure Tauri is properly installed:");
    console.log("   npm install");
    console.log("   cd src-tauri && cargo build");
    console.log("\n🚫 Release blocked due to Tauri version check failure.");
    process.exit(1);
}

// Git operations
const tagName = `v${version}`;

try {
    console.log(`\n🏷️  Creating Git tag: ${tagName}`);

    // Check if tag already exists
    try {
        execSync(`git tag -l "${tagName}"`, { stdio: "pipe" });
        console.log(`⚠️  Tag ${tagName} already exists. Skipping tag creation.`);
    } catch (error) {
        console.error(`❌ Git tag ${tagName} creation failed: ${error.message}`);
        // Tag doesn't exist, create it
        execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { stdio: "inherit" });
        console.log(`✅ Git tag ${tagName} created successfully!`);
    }

    console.log(`\n🚀 Pushing tag to remote...`);
    execSync(`git push origin ${tagName}`, { stdio: "inherit" });
    console.log(`✅ Tag ${tagName} pushed to remote successfully!`);

    console.log(`\n🎉 Complete! Version ${version} is now tagged and pushed.`);
    console.log(`📋 Next steps:`);
    console.log(`   • The release workflow will trigger automatically`);
    console.log(`   • Check GitHub Actions for build progress`);
    console.log(`   • Download artifacts from the Releases page`);
} catch (error) {
    console.error(`❌ Git operation failed: ${error.message}`);
    console.log(`💡 Make sure you have:`);
    console.log(
        `   • Committed all changes: git add . && git commit -m "Update version to ${version}"`,
    );
    console.log(`   • Set up remote: git remote add origin <your-repo-url>`);
    console.log(`   • Authenticated with GitHub (SSH key or token)`);
    process.exit(1);
}
