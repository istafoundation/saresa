#!/usr/bin/env node
/**
 * Full Sync Script (Prod -> Dev)
 * WARNING: This will completely replace ALL data in Dev with Production data.
 * Cross-platform compatible (Windows, Mac, Linux).
 * 
 * Uses --url flag to explicitly target specific deployments.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadFromEnv(envFile, key) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const regex = new RegExp(`${key}=(.+)`);
  const match = envContent.match(regex);
  if (!match) return null;
  return match[1].split('#')[0].trim();
}

async function run() {
  console.log("");
  console.log("🔄 Starting FULL Sync (Prod -> Dev)...");
  console.log("⚠️  WARNING: This will COMPLETELY REPLACE all data in Dev with Production data.");
  console.log("");

  // Load URLs directly from env files
  const prodUrl = loadFromEnv('.env.production', 'EXPO_PUBLIC_CONVEX_URL');
  const devUrl = loadFromEnv('.env.development', 'EXPO_PUBLIC_CONVEX_URL');
  
  if (!prodUrl) {
    console.error("❌ Could not find EXPO_PUBLIC_CONVEX_URL in .env.production");
    process.exit(1);
  }
  console.log(`   Source (Prod): ${prodUrl}`);

  if (!devUrl) {
    console.error("❌ Could not find EXPO_PUBLIC_CONVEX_URL in .env.development");
    process.exit(1);
  }
  console.log(`   Target (Dev):  ${devUrl}`);
  console.log("");

  // Create temp dir
  const tempDir = path.resolve('temp_sync');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir);

  try {
    // 1. Export ALL from Production using --url flag
    console.log("📦 Exporting ALL data from Production...");
    const snapshotPath = path.join(tempDir, 'full_snapshot.zip');
    execSync(`npx convex export --url "${prodUrl}" --path "${snapshotPath}"`, { 
      stdio: 'inherit',
      shell: true
    });
    console.log("");

    // 2. Import ALL to Dev (Replace) using --url flag
    console.log("📥 Importing to Dev (Wipe and Replace)...");
    execSync(`npx convex import --url "${devUrl}" "${snapshotPath}" --replace -y`, { 
      stdio: 'inherit',
      shell: true
    });

    console.log("");
    console.log("🎉 Full Sync Complete!");
    console.log("");
    
  } finally {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) { 
        console.warn("⚠️  Could not clean up temp_sync"); 
      }
    }
  }
}

run().catch(err => {
  console.error("❌ Sync failed:", err.message);
  process.exit(1);
});
