#!/usr/bin/env node

const fs = require("fs");
const semver = require("semver");

const bumpType = process.argv[2];

if (!["patch", "minor", "major"].includes(bumpType)) {
    console.error("Usage: node version-bump.cjs <patch|minor|major>");
    process.exit(1);
}

// Read current version from VERSION file
const currentVersion = fs.readFileSync("VERSION", "utf8").trim();

// Bump version
const newVersion = semver.inc(currentVersion, bumpType);

if (!newVersion) {
    console.error(`Invalid version: ${currentVersion}`);
    process.exit(1);
}

// Update VERSION file
fs.writeFileSync("VERSION", newVersion + "\n");

console.log(`📈 Version bumped: ${currentVersion} → ${newVersion}`);
console.log("🔄 Run 'npm run version:sync' to update all config files");
