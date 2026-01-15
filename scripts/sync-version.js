#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");
const appJsonPath = path.join(root, "app.json");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

const newVersion = packageJson.version;

// Update app.json version
appJson.expo.version = newVersion;

// Auto-increment Android versionCode (required for Play Store updates)
appJson.expo.android = appJson.expo.android || {};
const currentVersionCode = appJson.expo.android.versionCode || 1;
appJson.expo.android.versionCode = currentVersionCode + 1;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");

console.log("");
console.log("✅ Version synced successfully!");
console.log(`   📦 Version: ${newVersion}`);
console.log(`   🔢 Android versionCode: ${appJson.expo.android.versionCode}`);
console.log("");
