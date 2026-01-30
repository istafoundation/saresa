#!/usr/bin/env node
/**
 * Convex Development Server Wrapper
 * 
 * This script runs `npx convex dev` with the correct environment and handles
 * the .env.local file that Convex creates (which can conflict with our setup).
 * 
 * Usage: npm run convex:dev
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_LOCAL = path.join(__dirname, '..', '.env.local');
const ENV_LOCAL_BACKUP = path.join(__dirname, '..', '.env.local.backup');

function run() {
  console.log("");
  console.log("🚀 Starting Convex Development Server...");
  console.log("");
  
  // Check if .env.local exists and back it up (we'll restore if it's different)
  let existingEnvLocal = null;
  if (fs.existsSync(ENV_LOCAL)) {
    existingEnvLocal = fs.readFileSync(ENV_LOCAL, 'utf8');
    console.log("📋 Existing .env.local found - will merge after convex dev updates it");
  }

  // Run convex dev
  const convex = spawn('npx', ['convex', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..')
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log("\n🛑 Stopping Convex dev server...");
    convex.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    convex.kill('SIGTERM');
  });

  convex.on('close', (code) => {
    // After convex dev exits, sync .env.local back to .env.development
    if (fs.existsSync(ENV_LOCAL)) {
      const newEnvLocal = fs.readFileSync(ENV_LOCAL, 'utf8');
      const devEnvPath = path.join(__dirname, '..', '.env.development');
      
      // Extract CONVEX_DEPLOYMENT and EXPO_PUBLIC_CONVEX_URL from .env.local
      const deploymentMatch = newEnvLocal.match(/CONVEX_DEPLOYMENT=(.+)/);
      const urlMatch = newEnvLocal.match(/CONVEX_URL=(.+)/);
      
      if (deploymentMatch) {
        let devEnv = fs.readFileSync(devEnvPath, 'utf8');
        
        // Update CONVEX_DEPLOYMENT
        if (devEnv.includes('CONVEX_DEPLOYMENT=')) {
          devEnv = devEnv.replace(/CONVEX_DEPLOYMENT=.+/, deploymentMatch[0]);
        }
        
        // Update URL if present
        if (urlMatch) {
          const expoUrl = urlMatch[0].replace('CONVEX_URL=', 'EXPO_PUBLIC_CONVEX_URL=');
          if (devEnv.includes('EXPO_PUBLIC_CONVEX_URL=')) {
            devEnv = devEnv.replace(/EXPO_PUBLIC_CONVEX_URL=.+/, expoUrl);
          }
        }
        
        fs.writeFileSync(devEnvPath, devEnv);
        console.log("✅ Synced Convex settings to .env.development");
      }
    }
    
    process.exit(code);
  });
}

run();
