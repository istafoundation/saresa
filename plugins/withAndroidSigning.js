const { withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withAndroidSigning = (config) => {
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const keystoreSrc = path.join(projectRoot, "certs", "release.keystore");
      const keystoreDest = path.join(
        projectRoot,
        "android",
        "app",
        "release.keystore"
      );

      if (fs.existsSync(keystoreSrc)) {
        fs.copyFileSync(keystoreSrc, keystoreDest);
        console.log("✅ Copied release.keystore to android/app/");
      } else {
        console.warn("⚠️  release.keystore not found in certs/ directory");
      }
      return config;
    },
  ]);

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
  if (buildGradle.includes("signingConfigs {")) {
    if (buildGradle.includes("storeFile file('release.keystore')")) {
      return buildGradle;
    }
  }

  // Signing configuration for Saresa app
  // Package: in.istafoundation.saresa
  // Passwords are read from environment variables (set in .env file)
  const storePassword = process.env.KEYSTORE_PASSWORD || 'android';
  const keyPassword = process.env.KEY_PASSWORD || process.env.KEYSTORE_PASSWORD || 'android';
  
  const signingConfig = `
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword '${storePassword}'
            keyAlias 'saresa'
            keyPassword '${keyPassword}'
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
  `;

  let newGradle = buildGradle.replace(
    "buildTypes {",
    `${signingConfig}\n    buildTypes {`
  );

  newGradle = newGradle.replace(
    /signingConfig signingConfigs.debug/g,
    "signingConfig signingConfigs.release"
  );

  if (!newGradle.includes("signingConfig signingConfigs.release")) {
    newGradle = newGradle.replace(
      /buildTypes\s*\{\s*release\s*\{/,
      "buildTypes {\n        release {\n            signingConfig signingConfigs.release"
    );
  }

  return newGradle;
}

module.exports = withAndroidSigning;
