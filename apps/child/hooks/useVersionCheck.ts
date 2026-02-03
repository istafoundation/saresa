import { useEffect, useCallback, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";

// Update this to your actual remote version file URL
const GITHUB_REPO = Constants.expoConfig?.extra?.githubRepo || "istafoundation/saresa";
const VERSION_CHECK_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/version.json`; 

interface VersionConfig {
  latestVersion: string;
  minVersion?: string;
  downloadUrl?: string; // Direct APK download URL
  updateUrl: string;    // Fallback URL (e.g., store or releases page)
  forceUpdate?: boolean;
  updateMessage?: string;
  isUpdateEnabled?: boolean; // Whether auto-update feature is enabled
}

function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    // Remove any suffixes like "-dev"
    const cleanVersion = v.replace(/-.*$/, "");
    return cleanVersion.split(".").map(Number);
  };

  const aParts = parseVersion(a);
  const bParts = parseVersion(b);

  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;

    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
  }

  return 0;
}

export function useVersionCheck() {
  const [showDownloader, setShowDownloader] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    downloadUrl: string;
  } | null>(null);
  const [isUpdateEnabled, setIsUpdateEnabled] = useState<boolean | null>(null);

  const checkVersion = useCallback(async () => {
    // Version check usually only makes sense for native mobile apps, 
    // but we can leave it enabled for checking.
    if (Platform.OS === "web") return;

    try {
      const response = await fetch(VERSION_CHECK_URL, {
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.ok) return;

      const config: VersionConfig = await response.json();
      
      // Store whether updates are enabled (default to true if not specified)
      setIsUpdateEnabled(config.isUpdateEnabled !== false);
      
      // Get current version from Expo config or Native application
      const currentVersion = Constants.expoConfig?.version || Application.nativeApplicationVersion || "0.0.0";

      const isOutdated = compareVersions(currentVersion, config.latestVersion) < 0;
      const isBelowMinimum = config.minVersion
        ? compareVersions(currentVersion, config.minVersion) < 0
        : false;

      const shouldForceUpdate = config.forceUpdate || isBelowMinimum;

      if (isOutdated) {
        const message =
          config.updateMessage ||
          `A new version (${config.latestVersion}) is available.`;

        // We only support direct APK download on Android
        const hasDirectDownload =
          config.downloadUrl && Platform.OS === "android";

        if (hasDirectDownload) {
          // If forced, show downloader immediately (or maybe alert first?)
          // Let's use Alert first then open downloader
          Alert.alert(
            shouldForceUpdate ? "Update Required" : "Update Available",
            message,
            [
              !shouldForceUpdate ? { text: "Later", style: "cancel" } : null,
              {
                text: "Update Now",
                onPress: () => {
                  setUpdateInfo({
                    version: config.latestVersion,
                    downloadUrl: config.downloadUrl!,
                  });
                  setShowDownloader(true);
                },
              },
            ].filter(Boolean) as any,
            { cancelable: !shouldForceUpdate }
          );
        } else {
          // iOS or no direct download -> Open Link
          Alert.alert(
            shouldForceUpdate ? "Update Required" : "Update Available",
            message,
            [
               !shouldForceUpdate ? { text: "Later", style: "cancel" } : null,
              {
                text: "Update Now",
                onPress: () => Linking.openURL(config.updateUrl),
              },
             ].filter(Boolean) as any,
            { cancelable: !shouldForceUpdate }
          );
        }
      }
    } catch (error) {
      // Silently fail - network error or invalid JSON
      console.log("[useVersionCheck] Error checking version:", error);
    }
  }, []);

  const closeDownloader = useCallback(() => {
    setShowDownloader(false);
  }, []);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  return {
    checkVersion,
    showDownloader,
    closeDownloader,
    updateInfo,
    /** Whether auto-updates are enabled (from remote config, null if not yet checked) */
    isUpdateEnabled,
  };
}
