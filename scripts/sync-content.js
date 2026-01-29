const { spawn } = require('child_process');
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
  "contentPacks",
  "gameContent" // duplicate but harmless
];

async function run() {
  console.log("🔄 Starting Content Sync (Prod -> Dev)...");

  // Load env vars to get deployment names
  const prodEnv = fs.readFileSync('.env.production', 'utf8');
  const prodDeploymentMatch = prodEnv.match(/CONVEX_DEPLOYMENT=(.+)/);
  if (!prodDeploymentMatch) {
    console.error("❌ Could not find CONVEX_DEPLOYMENT in .env.production");
    process.exit(1);
  }
  let prodDeployment = prodDeploymentMatch[1].split('#')[0].trim();
  if (prodDeployment.includes(':')) prodDeployment = prodDeployment.split(':')[1];
  console.log(`   Source: ${prodDeployment}`);

  const devEnv = fs.readFileSync('.env.development', 'utf8');
  const devDeploymentMatch = devEnv.match(/CONVEX_DEPLOYMENT=(.+)/);
  if (!devDeploymentMatch || !devDeploymentMatch[1]) {
    console.error("❌ Could not find CONVEX_DEPLOYMENT in .env.development. Did you run 'npx convex dev'?");
    process.exit(1);
  }
  let devDeployment = devDeploymentMatch[1].split('#')[0].trim();
  if (devDeployment.includes(':')) devDeployment = devDeployment.split(':')[1];
  console.log(`   Target: ${devDeployment}`);

  // Get Sync Secret
  const syncSecretMatch = devEnv.match(/SYNC_API_KEY=(.+)/);
  const syncSecret = syncSecretMatch ? syncSecretMatch[1].trim() : null;
  
  if (!syncSecret) {
      console.warn("⚠️  SYNC_API_KEY not found in .env.development. Tables might not be cleared if not Admin.");
  }

  // Create temp dir (clean up previous if exists)
  if (fs.existsSync('temp_sync')) {
    fs.rmSync('temp_sync', { recursive: true, force: true });
  }
  fs.mkdirSync('temp_sync');

  // 1. Export from Prod
  console.log("📦 Exporting data from Production...");
  const exportCmd = `npx convex export --deployment-name ${prodDeployment} --path temp_sync/snapshot.zip`;
  
  try {
     require('child_process').execSync(exportCmd, { stdio: 'inherit' });
  } catch (e) {
      console.error("❌ Export failed");
      process.exit(1);
  }

  // 2. Clear tables in Dev
  console.log("🧹 Clearing content tables in Dev...");
  try {
      const argsObj = { 
          tableNames: CONTENT_TABLES,
          secret: syncSecret // Must be present in .env.development
      };
      const argsJson = JSON.stringify(argsObj);
      const argsEscaped = argsJson.replace(/"/g, '\\"');
      const finalArgs = `"${argsEscaped}"`;
      
      console.log(`   Running admin:clearTables...`);
      require('child_process').execSync(`npx convex run admin:clearTables --deployment-name ${devDeployment} ${finalArgs}`, { stdio: 'inherit' });
  } catch (e) {
      console.error("❌ Failed to clear tables. Make sure you are an admin in Dev or SYNC_API_KEY is recognized.");
      process.exit(1);
  }
  
  // 3. Import to Dev (Filter using PowerShell)
  console.log("📥 Preparing content snapshot (Using PowerShell)...");
  
  try {
      // Unzip
      const absTempPath = path.resolve('temp_sync');
      const zipPath = path.join(absTempPath, 'snapshot.zip');
      const extractPath = path.join(absTempPath, 'extracted');
      
      console.log("   Unzipping...");
      require('child_process').execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`, { stdio: 'inherit' });

      // Filter files
      console.log("   Filtering tables...");
      const files = getAllFiles(extractPath);
      
      files.forEach(filePath => {
          const relPath = path.relative(extractPath, filePath);
          
          let tableName = "";
          const parts = relPath.split(path.sep);
          const fileName = parts[parts.length - 1];
          
          if (parts.length > 1 && fileName.endsWith('.jsonl')) {
              // folder/doc.jsonl -> folder is table
              tableName = parts[parts.length - 2];
          } else if (fileName.endsWith('.jsonl')) {
              tableName = fileName.replace('.jsonl', '');
          }

          // Special case for root metadata files to keep? 
          // Usually keep nothing else.
          
          if (CONTENT_TABLES.includes(tableName)) {
              console.log(`   Keeping: ${relPath}`);
          } else {
              // Delete
              fs.unlinkSync(filePath);
              // Clean up empty dir if needed?
              if (parts.length > 1) {
                  const dirPath = path.dirname(filePath);
                  try {
                      if (fs.readdirSync(dirPath).length === 0) {
                          fs.rmdirSync(dirPath);
                      }
                  } catch(e) {}
              }
          }
      });

      // Zip again
      console.log("   Re-zipping...");
      const newZipPath = path.join(absTempPath, 'content_only.zip');
      // Compress-Archive expects contents.
      // Note: we need to zip the CONTENTS of extracted, not extracted folder itself.
      const sourcePath = path.join(extractPath, '*');
      require('child_process').execSync(`powershell -Command "Compress-Archive -Path '${sourcePath}' -DestinationPath '${newZipPath}' -Force"`, { stdio: 'inherit' });
      
      console.log("✅ Created filtered content snapshot.");
      
      // Now import
      require('child_process').execSync(`npx convex import --deployment-name ${devDeployment} temp_sync/content_only.zip --replace`, { stdio: 'inherit' });
      
  } catch (e) {
      console.error("❌ Import failed", e);
      process.exit(1);
  }
  
  console.log("🎉 Content Sync Complete!");
  
  // Cleanup
  if (fs.existsSync('temp_sync')) {
     try {
       fs.rmSync('temp_sync', { recursive: true, force: true });
     } catch (e) { console.warn("Could not clean up temp_sync (file locked?)"); }
  }
}

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath)
  arrayOfFiles = arrayOfFiles || []

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file))
    }
  })

  return arrayOfFiles
}

run();
