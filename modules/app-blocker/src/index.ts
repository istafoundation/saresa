import { NativeModule, requireNativeModule } from 'expo-modules-core';

interface InstalledApp {
  name: string;
  packageName: string;
  isSystemApp: boolean;
}

interface AppBlockerModuleType extends NativeModule {
  checkUsagePermission(): Promise<boolean>;
  requestUsagePermission(): void;
  checkOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): void;
  getInstalledApps(): Promise<InstalledApp[]>;
  setBlockedApps(blockedApps: string[]): Promise<boolean>;
  startMonitoring(): Promise<boolean>;
  stopMonitoring(): Promise<boolean>;
  checkNotificationPermission(): Promise<boolean>;
  openNotificationSettings(): void;
}

// This will be null on iOS/web where the native module doesn't exist
let AppBlocker: AppBlockerModuleType | null = null;

try {
  AppBlocker = requireNativeModule<AppBlockerModuleType>('AppBlocker');
} catch {
  // Module not available on this platform
}

export { AppBlocker, InstalledApp };
