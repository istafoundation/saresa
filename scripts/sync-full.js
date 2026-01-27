const fs = require('fs');

async function run() {
  console.log("🔄 Starting FULL Sync (Prod -> Dev)...");
  console.log("⚠️  WARNING: This will preserve NOTHING in Dev. It will be a mirror of Prod.");

  const prodEnv = fs.readFileSync('.env.production', 'utf8');
  const prodDeploymentMatch = prodEnv.match(/CONVEX_DEPLOYMENT=(.+)/);
  if (!prodDeploymentMatch) {
    console.error("❌ .env.production missing CONVEX_DEPLOYMENT");
    process.exit(1);
  }
  let prodDeployment = prodDeploymentMatch[1].split('#')[0].trim();
  if (prodDeployment.includes(':')) prodDeployment = prodDeployment.split(':')[1];

  const devEnv = fs.readFileSync('.env.development', 'utf8');
  const devDeploymentMatch = devEnv.match(/CONVEX_DEPLOYMENT=(.+)/);
  if (!devDeploymentMatch) {
    console.error("❌ .env.development missing CONVEX_DEPLOYMENT");
    process.exit(1);
  }
  let devDeployment = devDeploymentMatch[1].split('#')[0].trim();
  if (devDeployment.includes(':')) devDeployment = devDeployment.split(':')[1];

  // Create temp dir (clean up previous if exists)
  if (fs.existsSync('temp_sync')) {
    fs.rmSync('temp_sync', { recursive: true, force: true });
  }
  fs.mkdirSync('temp_sync');

  // 1. Export ALL
  console.log("📦 Exporting ALL data from Production...");
  try {
     require('child_process').execSync(`npx convex export --deployment-name ${prodDeployment} --path temp_sync/full_snapshot.zip`, { stdio: 'inherit' });
  } catch (e) {
      process.exit(1);
  }

  // 2. Import ALL (Replace)
  console.log("📥 Importing to Dev (Wipe and Replace)...");
  try {
      require('child_process').execSync(`npx convex import --deployment-name ${devDeployment} temp_sync/full_snapshot.zip --replace`, { stdio: 'inherit' });
  } catch (e) {
      process.exit(1);
  }

  console.log("🎉 Full Sync Complete!");
}

run();
