#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const version = packageJson.version;

console.log(`Syncing version ${version} across all files...`);

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
console.log(`📦 package.json: ${version}`);
console.log(`⚙️  tauri.conf.json: ${version}`);
console.log(`🦀 Cargo.toml: ${version}`);
