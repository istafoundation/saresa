import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import Constants from "expo-constants";
import { COLORS, SPACING, BORDER_RADIUS } from "../constants/theme";

interface UpdateDownloaderProps {
  visible: boolean;
  updateUrl: string;
  version: string;
  onClose: () => void;
}

export function UpdateDownloader({
  visible,
  updateUrl,
  version,
  onClose,
}: UpdateDownloaderProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [downloadedFileUri, setDownloadedFileUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const APK_NAME = Constants.expoConfig?.extra?.apkName || "ista-english";

  const downloadUpdate = useCallback(async () => {
    if (Platform.OS !== "android") {
      Alert.alert("Info", "Direct download is only available on Android");
      return;
    }

    setDownloading(true);
    setProgress(0);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const fileName = `${APK_NAME}-v${version}.apk`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        updateUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const percentComplete = Math.round(
            (downloadProgress.totalBytesWritten /
              downloadProgress.totalBytesExpectedToWrite) *
              100
          );
          setProgress(percentComplete > 0 ? percentComplete : 0);
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (result?.uri) {
        setDownloadedFileUri(result.uri);
        setDownloadComplete(true);
        setProgress(100);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error("Download failed - no URI returned");
      }

      setDownloading(false);
    } catch (err) {
      console.error("[UpdateDownloader] Download error:", err);
      setError(
        `Download failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setDownloading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [updateUrl, version]);

  const installUpdate = useCallback(async () => {
    if (!downloadedFileUri) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const contentUri = await FileSystem.getContentUriAsync(downloadedFileUri);

      // Try ACTION_INSTALL_PACKAGE intent first
      try {
        await IntentLauncher.startActivityAsync(
          "android.intent.action.INSTALL_PACKAGE",
          {
            data: contentUri,
            flags: 1 | 0x10000000, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
          }
        );
        onClose();
        return;
      } catch (installErr) {
        console.log(
          "[UpdateDownloader] INSTALL_PACKAGE failed, trying VIEW:",
          installErr
        );
      }

      // Fallback to ACTION_VIEW
      try {
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1 | 0x10000000,
          type: "application/vnd.android.package-archive",
        });
        onClose();
        return;
      } catch (viewErr) {
        console.log("[UpdateDownloader] VIEW intent failed:", viewErr);
      }

      // Final fallback - show permission help
      Alert.alert(
        "Installation Permission Required",
        'Please enable "Install unknown apps" for this app in Settings to update.',
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
        ]
      );
    } catch (err) {
      console.error("[UpdateDownloader] Install error:", err);
      Alert.alert("Installation Error", "Could not open the installer.");
    }
  }, [downloadedFileUri, onClose]);

  const handleClose = () => {
    if (!downloading) {
      setDownloadComplete(false);
      setProgress(0);
      setError(null);
      setDownloadedFileUri(null);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={styles.overlay}>
          <MotiView
            from={{ opacity: 0, scale: 0.9, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 15 }}
            style={styles.container}
          >
            {/* Header Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={downloadComplete ? [COLORS.success, "#2ECC71"] : [COLORS.primary, COLORS.primaryDark]}
                style={styles.iconGradient}
              >
                <Ionicons 
                  name={downloadComplete ? "checkmark-circle" : "cloud-download"} 
                  size={32} 
                  color="#FFF" 
                />
              </LinearGradient>
            </View>

            <Text style={styles.title}>
              {downloadComplete ? "Ready to Install!" : "Update Available"}
            </Text>

            <Text style={styles.version}>Version {version}</Text>

            <Text style={styles.message}>
              {downloadComplete 
                ? "The update has been downloaded. Install now to get the latest magical features!" 
                : "A new version of ISTA English is available! Update now to continue your learning journey."}
            </Text>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="warning" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {downloading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress}% Downloaded</Text>
              </View>
            )}

            <View style={styles.buttons}>
              {!downloading && !downloadComplete && (
                <>
                  <TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
                    <Text style={styles.secondaryButtonText}>Later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={downloadUpdate}>
                    <Text style={styles.primaryButtonText}>Download Update</Text>
                  </TouchableOpacity>
                </>
              )}

              {downloadComplete && (
                <>
                  <TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
                    <Text style={styles.secondaryButtonText}>Later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={installUpdate}>
                    <Text style={styles.primaryButtonText}>Install Now</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </MotiView>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  version: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15', // 15% opacity
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    flex: 1,
  },
  progressContainer: {
    width: "100%",
    marginBottom: SPACING.lg,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: COLORS.background, // lighter background
    borderRadius: 5,
    overflow: "hidden",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.success,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xs,
    fontWeight: "600",
  },
  buttons: {
    flexDirection: "row",
    gap: SPACING.md,
    width: "100%",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "transparent",
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.textMuted + "40", // Low opacity border
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
});
