import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Merges `app.json` with env-driven Google Maps keys for `react-native-maps`
 * (`PROVIDER_GOOGLE`). Do not use the `react-native-maps` config plugin here —
 * Expo resolves it by loading the package entry (JSX), which breaks `expo config`.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const ios = config.ios ?? {};
  const android = config.android ?? {};
  return {
    ...config,
    ios: {
      ...ios,
      config: {
        ...(typeof ios === "object" && ios && "config" in ios
          ? (ios as { config?: Record<string, unknown> }).config
          : {}),
        googleMapsApiKey: googleMapsKey,
      },
    },
    android: {
      ...android,
      config: {
        ...(typeof android === "object" &&
        android &&
        "config" in android
          ? (android as { config?: Record<string, unknown> }).config
          : {}),
        googleMaps: {
          ...(
            (
              android as {
                config?: { googleMaps?: Record<string, unknown> };
              }
            ).config?.googleMaps ?? {}
          ),
          apiKey: googleMapsKey,
        },
      },
    },
  } as ExpoConfig;
};
