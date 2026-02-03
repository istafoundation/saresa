#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");
const versionJsonPath = path.join(root, "version.json");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
let versionJson = { android: { versionCode: 1 } };

if (fs.existsSync(versionJsonPath)) {
    versionJson = JSON.parse(fs.readFileSync(versionJsonPath, "utf8"));
}

const newVersion = packageJson.version;

// Auto-increment Android versionCode
versionJson.android = versionJson.android || {};
const currentVersionCode = versionJson.android.versionCode || 1;
versionJson.android.versionCode = currentVersionCode + 1;

// Sync auto-update fields
const APK_NAME = packageJson.config?.apkName || "ista-english";
// Extract repo from URL (e.g. "https://github.com/user/repo" -> "user/repo")
const GITHUB_REPO = packageJson.repository?.url?.replace("https://github.com/", "").replace(".git", "") || "istafoundation/saresa";

versionJson.latestVersion = newVersion;
versionJson.downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${newVersion}/${APK_NAME}-v${newVersion}.apk`;
versionJson.updateUrl = `https://github.com/${GITHUB_REPO}/releases/latest`;
versionJson.isUpdateEnabled = versionJson.isUpdateEnabled ?? true; // Default to true if missing

fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2));

console.log("");
console.log("✅ Version synced successfully!");
console.log(`   📦 Package Version: ${newVersion}`);
console.log(`   🔢 Android versionCode: ${versionJson.android.versionCode}`);
console.log("");
