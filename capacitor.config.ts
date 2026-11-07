import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vectorai.pro",
  appName: "Vector AI Pro",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    minSdkVersion: 26, // Android 8.0 Oreo ve üzeri tam destek
    buildOptions: {
      keystorePath: undefined,
      releaseType: "APK",
    },
  },
};

export default config;
