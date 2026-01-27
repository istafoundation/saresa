import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'dev';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "Saresa (Dev)" : "Saresa",
  slug: "saresa",
  version: IS_DEV ? "1.0.56-dev" : "1.0.56",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  scheme: "saresa",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#1A0A2E"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? "in.istafoundation.saresa.dev" : "in.istafoundation.saresa"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1A0A2E"
    },
    package: IS_DEV ? "in.istafoundation.saresa.dev" : "in.istafoundation.saresa",
    versionCode: 57,
    permissions: [
      "android.permission.RECORD_AUDIO"
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
    [
      "expo-speech-recognition",
      {
        "microphonePermission": "Allow Saresa to access your microphone to recognize your speech."
      }
    ]
  ]
});
