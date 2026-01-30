#!/usr/bin/env node
/**
 * Content Sync Script (Prod -> Dev)
 * Syncs content tables from production to development deployment.
 * Cross-platform compatible (Windows, Mac, Linux).
 * 
 * Uses --url flag to explicitly target specific deployments.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Tables to sync (Content Only)
const CONTENT_TABLES = [
  "levels",
  "levelQuestions",
  "gameContent",
  "spices",
  "gameSettings",
  "contentVersions",
  "contentPacks"
];

function loadFromEnv(envFile, key) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const regex = new RegExp(`${key}=(.+)`);
  const match = envContent.match(regex);
  if (!match) return null;
  return match[1].split('#')[0].trim();
}

function getDeploymentName(fullDeployment) {
  if (fullDeployment && fullDeployment.includes(':')) {
    return fullDeployment.split(':')[1];
  }
  return fullDeployment;
}

// Cross-platform zip extraction
function extractZip(zipPath, destPath) {
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`, {
      stdio: 'inherit'
    });
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destPath}"`, { stdio: 'inherit' });
  }
}

// Cross-platform zip creation
function createZip(sourcePath, destPath) {
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Compress-Archive -Path '${sourcePath}\\*' -DestinationPath '${destPath}' -Force"`, {
      stdio: 'inherit'
    });
  } else {
    execSync(`cd "${sourcePath}" && zip -r "${destPath}" .`, { stdio: 'inherit', shell: true });
  }
}

async function run() {
  console.log("");
  console.log("🔄 Starting Content Sync (Prod -> Dev)...");
  console.log("");

  // Load URLs directly from env files
  const prodUrl = loadFromEnv('.env.production', 'EXPO_PUBLIC_CONVEX_URL');
  const devUrl = loadFromEnv('.env.development', 'EXPO_PUBLIC_CONVEX_URL');
  const prodDeployment = loadFromEnv('.env.production', 'CONVEX_DEPLOYMENT');
  const devDeployment = loadFromEnv('.env.development', 'CONVEX_DEPLOYMENT');
  
  if (!prodUrl) {
    console.error("❌ Could not find EXPO_PUBLIC_CONVEX_URL in .env.production");
    process.exit(1);
  }
  if (!prodDeployment) {
    console.error("❌ Could not find CONVEX_DEPLOYMENT in .env.production");
    process.exit(1);
  }
  console.log(`   Source (Prod): ${prodUrl}`);

  if (!devUrl) {
    console.error("❌ Could not find EXPO_PUBLIC_CONVEX_URL in .env.development");
    process.exit(1);
  }
  if (!devDeployment) {
    console.error("❌ Could not find CONVEX_DEPLOYMENT in .env.development");
    process.exit(1);
  }
  console.log(`   Target (Dev):  ${devUrl}`);
  console.log("");

  const syncSecret = loadFromEnv('.env.development', 'SYNC_API_KEY');

  // Create temp dir
  const tempDir = path.resolve('temp_sync');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir);

  try {
    // 1. Export from Production using --prod flag
    // Note: --url flag doesn't work correctly, --prod with CONVEX_DEPLOYMENT env var is required
    console.log("📦 Exporting data from Production...");
    const snapshotPath = path.join(tempDir, 'snapshot.zip');
    execSync(`npx convex export --prod --path "${snapshotPath}"`, { 
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, CONVEX_DEPLOYMENT: prodDeployment }
    });
    console.log("");

    // 2. Clear content tables in Dev
    console.log("🧹 Clearing content tables in Dev...");
    const argsObj = { tableNames: CONTENT_TABLES, secret: syncSecret };
    const argsJson = JSON.stringify(JSON.stringify(argsObj));
    
    try {
      execSync(`npx convex run admin:clearTables ${argsJson}`, { 
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, CONVEX_DEPLOYMENT: devDeployment }
      });
    } catch (e) {
      console.error("❌ Failed to clear tables.");
      process.exit(1);
    }
    console.log("");
    
    // 3. Extract and filter snapshot
    console.log("📥 Preparing content snapshot...");
    const extractPath = path.join(tempDir, 'extracted');
    fs.mkdirSync(extractPath);
    
    console.log("   Extracting snapshot...");
    extractZip(snapshotPath, extractPath);
    
    // Filter files - keep only content tables
    console.log("   Filtering to content tables only...");
    const allFiles = getAllFiles(extractPath);
    let keptCount = 0;
    let deletedCount = 0;
    const keptTables = new Set();
    
    for (const filePath of allFiles) {
      const relPath = path.relative(extractPath, filePath);
      const parts = relPath.split(path.sep);
      const fileName = parts[parts.length - 1];
      
      let tableName = "";
      if (parts.length > 1 && fileName.endsWith('.jsonl')) {
        tableName = parts[parts.length - 2];
      } else if (fileName.endsWith('.jsonl')) {
        tableName = fileName.replace('.jsonl', '');
      }

      if (CONTENT_TABLES.includes(tableName)) {
        if (!keptTables.has(tableName)) {
          console.log(`   ✓ Keeping: ${tableName}`);
          keptTables.add(tableName);
        }
        keptCount++;
      } else if (tableName) {
        fs.unlinkSync(filePath);
        deletedCount++;
        
        const dirPath = path.dirname(filePath);
        try {
          if (fs.readdirSync(dirPath).length === 0) {
            fs.rmdirSync(dirPath);
          }
        } catch (e) { /* ignore */ }
      }
    }
    
    console.log(`   Kept ${keptCount} files from ${keptTables.size} tables, removed ${deletedCount} non-content files`);

    // Re-zip
    console.log("   Creating filtered snapshot...");
    const contentZipPath = path.join(tempDir, 'content_only.zip');
    createZip(extractPath, contentZipPath);
    
    console.log("✅ Created filtered content snapshot.");
    console.log("");
    
    // 4. Import to Dev
    console.log("📥 Importing content to Dev...");
    execSync(`npx convex import "${contentZipPath}" --replace -y`, { 
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, CONVEX_DEPLOYMENT: devDeployment }
    });
    
    console.log("");
    console.log("🎉 Content Sync Complete!");
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

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

run().catch(err => {
  console.error("❌ Sync failed:", err.message);
  process.exit(1);
});
