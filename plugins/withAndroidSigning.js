/**
 * Expo Config Plugin for Android Release Signing
 * 
 * This plugin configures Android release builds to use a keystore for signing.
 * It reads credentials from certs/keystore.properties (not from environment variables)
 * to avoid hardcoding passwords in build.gradle.
 */
const { withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withAndroidSigning = (config) => {
  // Step 1: Copy keystore and properties files to android/app
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidAppDir = path.join(projectRoot, "android", "app");
      
      // Copy release.keystore
      const keystoreSrc = path.join(projectRoot, "certs", "release.keystore");
      const keystoreDest = path.join(androidAppDir, "release.keystore");

      if (fs.existsSync(keystoreSrc)) {
        fs.copyFileSync(keystoreSrc, keystoreDest);
        console.log("✅ Copied release.keystore to android/app/");
      } else {
        console.warn("⚠️  release.keystore not found in certs/ directory");
      }
      
      // Copy keystore.properties  
      const propsSrc = path.join(projectRoot, "certs", "keystore.properties");
      const propsDest = path.join(androidAppDir, "keystore.properties");
      
      if (fs.existsSync(propsSrc)) {
        fs.copyFileSync(propsSrc, propsDest);
        console.log("✅ Copied keystore.properties to android/app/");
      } else {
        console.warn("⚠️  keystore.properties not found in certs/ directory");
        console.warn("   Release builds may fail. Create certs/keystore.properties with:");
        console.warn("   storeFile=release.keystore");
        console.warn("   storePassword=<your-password>");
        console.warn("   keyAlias=<your-alias>");
        console.warn("   keyPassword=<your-password>");
      }
      
      return config;
    },
  ]);

  // Step 2: Modify build.gradle to read from keystore.properties
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents = addSigningConfig(config.modResults.contents);
    } else {
      console.warn("⚠️  Cannot modify build.gradle because it is not Groovy");
    }
    return config;
  });
};

function addSigningConfig(buildGradle) {
  // Check if we already added our signing config
  if (buildGradle.includes("keystoreProperties.load")) {
    return buildGradle;
  }
  
  // Also check for old hardcoded style and skip if present
  if (buildGradle.includes("signingConfigs {") && buildGradle.includes("storeFile file('release.keystore')")) {
    // Already has signing config (old style) - don't add duplicate
    return buildGradle;
  }

  // Add keystore properties loader at the top of android block
  const keystoreLoader = `
    // Load keystore configuration from properties file
    def keystorePropertiesFile = rootProject.file("app/keystore.properties")
    def keystoreProperties = new Properties()
    if (keystorePropertiesFile.exists()) {
        keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    }
`;

  // Signing configuration using properties file
  const signingConfig = `
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                v1SigningEnabled true
                v2SigningEnabled true
            }
        }
    }
`;

  // Add keystore loader after "android {" 
  let newGradle = buildGradle.replace(
    /android\s*\{/,
    `android {${keystoreLoader}`
  );

  // Add signing config before buildTypes
  newGradle = newGradle.replace(
    "buildTypes {",
    `${signingConfig}\n    buildTypes {`
  );

  // Update release buildType to use our signing config
  newGradle = newGradle.replace(
    /signingConfig signingConfigs.debug/g,
    "signingConfig signingConfigs.release"
  );

  // If no signingConfig in release block, add it
  if (!newGradle.includes("signingConfig signingConfigs.release")) {
    newGradle = newGradle.replace(
      /buildTypes\s*\{\s*release\s*\{/,
      "buildTypes {\n        release {\n            signingConfig signingConfigs.release"
    );
  }

  return newGradle;
}

module.exports = withAndroidSigning;
