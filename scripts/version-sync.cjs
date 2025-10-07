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

// Git operations
const tagName = `v${version}`;

try {
    console.log(`\n🏷️  Creating Git tag: ${tagName}`);

    // Check if tag already exists
    try {
        execSync(`git tag -l "${tagName}"`, { stdio: "pipe" });
        console.log(`⚠️  Tag ${tagName} already exists. Skipping tag creation.`);
    } catch (error) {
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
