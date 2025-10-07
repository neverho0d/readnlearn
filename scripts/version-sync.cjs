#!/usr/bin/env node

const fs = require("fs");

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
