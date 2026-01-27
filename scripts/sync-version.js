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

fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2));

console.log("");
console.log("✅ Version synced successfully!");
console.log(`   📦 Package Version: ${newVersion}`);
console.log(`   🔢 Android versionCode: ${versionJson.android.versionCode}`);
console.log("");
