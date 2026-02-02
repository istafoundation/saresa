const {
  withDangerousMod,
  withAndroidManifest,
  withMainApplication,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withAppBlocking = (config) => {
  // 1. Copy the native files from relevant `native/` directories to `android/`
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidSrcPath = path.join(
        projectRoot,
        "android/app/src/main/java/in/istafoundation/kids"
      );
      const nativeSrcPath = path.join(
        projectRoot,
        "native/android/src/main/java/in/istafoundation/kids"
      );

      if (!fs.existsSync(nativeSrcPath)) {
        console.warn(
          "Warning: No native source code found at " +
            nativeSrcPath +
            ". Skipping file copy."
        );
        return config;
      }

      // Ensure destination directory exists
      await fs.promises.mkdir(androidSrcPath, { recursive: true });

      // Read files from native source
      const files = await fs.promises.readdir(nativeSrcPath);

      for (const file of files) {
        const srcFile = path.join(nativeSrcPath, file);
        const destFile = path.join(androidSrcPath, file);
        const content = await fs.promises.readFile(srcFile, "utf-8");
        await fs.promises.writeFile(destFile, content, "utf-8");
      }

      return config;
    },
  ]);

  // 2. Add permissions and service to AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const mainApplication = manifest.manifest.application[0];

    // Add permissions
    const permissions = [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.PACKAGE_USAGE_STATS",
      "android.permission.QUERY_ALL_PACKAGES",
      "android.permission.USE_FULL_SCREEN_INTENT",
    ];

    if (!manifest.manifest["uses-permission"]) {
      manifest.manifest["uses-permission"] = [];
    }

    permissions.forEach((permission) => {
      if (
        !manifest.manifest["uses-permission"].some(
          (p) => p.$["android:name"] === permission
        )
      ) {
        manifest.manifest["uses-permission"].push({
          $: { "android:name": permission },
        });
      }
    });

    // Add service to application
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    const serviceName = ".AppMonitorService";
    if (
      !mainApplication.service.some(
        (s) => s.$["android:name"] === serviceName
      )
    ) {
      mainApplication.service.push({
        $: {
          "android:name": serviceName,
          "android:foregroundServiceType": "dataSync",
        },
      });
    }

    // Add queries
    if (!manifest.manifest.queries) {
      manifest.manifest.queries = [];
    }
    
    // Ensure we have a queries entry for RecognitionService if it's not already there (though Expo Speech Rec handles this usually)
    // We'll leave the queries modification to minimal if not strictly required here, 
    // but the user's manual manifest had RecognitionService. Let's add it if missing just in case.
    // Actually, let's just trust Expo Speech Recognition plugin for that part if it's doing it.
    // But since we are replacing manual edits, let's be safe.
    
    // Check if we need to add RecognitionService query manually? 
    // The previous manifest showed it. Let's add it carefully.
    
    // For now, focusing on the App Blocking parts.
    
    return config;
  });

  // 3. Register the package in MainApplication.kt
  config = withMainApplication(config, async (config) => {
    const mainApplication = config.modResults;
    
    // We need to inject `add(AppBlockerPackage())` into `getPackages()`
    // The contents is a string in mainApplication.contents
    
    if (mainApplication.contents.includes("AppBlockerPackage()")) {
        return config;
    }
    
    // Attempt to match the getPackages method
    const packageListMatch = /PackageList\(this\)\.packages\.apply\s*\{/;
    
    if (packageListMatch.test(mainApplication.contents)) {
        mainApplication.contents = mainApplication.contents.replace(
            packageListMatch,
            `PackageList(this).packages.apply {\n              add(AppBlockerPackage())`
        );
    } else {
        console.warn("Could not find place to inject AppBlockerPackage in MainApplication.kt");
    }
    
    return config;
  });

  return config;
};

module.exports = withAppBlocking;
