#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const packageJson = require(path.join(root, "package.json"));
const version = packageJson.version;

// App name for APK file naming
const APK_NAME_PREFIX = "ista-kids-dev";

// Debug APK location (Standard Gradle output)
const apkSourceDir = path.join(
  root,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
);
const apkSourceFile = path.join(apkSourceDir, "app-debug.apk");
const buildsDir = path.join(root, "builds");
const outputFile = path.join(buildsDir, `${APK_NAME_PREFIX}-v${version}.apk`);

console.log("");
console.log(`🚀 Building ISTA Kids DEV APK`);
console.log(`   Version: ${version}-dev`);
console.log("");

try {
  // Step 1: Run Expo Prebuild to regenerate native projects with updated version
  console.log("🔄 Running Expo Prebuild...");
  execSync("npx expo prebuild --clean", {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  console.log("✅ Prebuild completed");
  console.log("");

  // Step 2: Run the Gradle build (Debug)
  console.log("📦 Running Gradle assembleDebug...");

  // Use gradlew.bat on Windows, ./gradlew on Unix
  const gradleCmd = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  execSync(`${gradleCmd} assembleDebug`, {
    cwd: path.join(root, "android"),
    stdio: "inherit",
    shell: true,
  });

  // Step 3: Create builds directory if it doesn't exist
  if (!fs.existsSync(buildsDir)) {
    fs.mkdirSync(buildsDir, { recursive: true });
    console.log("📁 Created builds/ directory");
  }

  // Step 4: Copy and rename the APK
  if (fs.existsSync(apkSourceFile)) {
    fs.copyFileSync(apkSourceFile, outputFile);

    const sizeInMB = (fs.statSync(outputFile).size / (1024 * 1024)).toFixed(2);

    console.log("");
    console.log("✅ DEV Build completed successfully!");
    console.log("");
    console.log("📱 APK Details:");
    console.log(`   File: builds/${APK_NAME_PREFIX}-v${version}.apk`);
    console.log(`   Size: ${sizeInMB} MB`);
    console.log(`   Path: ${outputFile}`);
    console.log("");
  } else {
    console.error("❌ APK file not found at expected location");
    console.error(`   Expected: ${apkSourceFile}`);
    process.exit(1);
  }
} catch (error) {
  console.error("");
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
