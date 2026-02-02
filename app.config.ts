import { ExpoConfig, ConfigContext } from 'expo/config';
const pkg = require('./package.json');
const versionCode = require('./version.json');

const IS_DEV = process.env.APP_VARIANT === 'dev';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "ISTA Kids Dev" : "ISTA Kids",
  slug: "ista-kids",
  version: IS_DEV ? `${pkg.version}-dev` : pkg.version,
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  scheme: "ista-kids",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#1A0A2E"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? "in.istafoundation.kids.dev" : "in.istafoundation.kids"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1A0A2E"
    },
    package: IS_DEV ? "in.istafoundation.kids.dev" : "in.istafoundation.kids",
    versionCode: versionCode.android.versionCode,
    permissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.REQUEST_INSTALL_PACKAGES"
    ]
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro"
  },
  plugins: [
    "expo-router",
    "expo-audio",
    "./plugins/withAndroidSigning",
    "./plugins/withAppBlocking",
    [
      "expo-speech-recognition",
      {
        "microphonePermission": "Allow Saresa to access your microphone to recognize your speech."
      }
    ]
  ],
  extra: {
    githubRepo: pkg.repository?.url?.replace("https://github.com/", "") || "istafoundation/saresa",
    apkName: pkg.config?.apkName || "ista-kids"
  }
});
