import Constants from "expo-constants";

const DEFAULT_CLOUD_API_BASE_URL =
  "https://find-mine-backend-pmnpalawqa-df.a.run.app";
const DEFAULT_LOCAL_API_PORT = "3000";

type ExpoHostConstants = typeof Constants & {
  expoConfig?: { hostUri?: string | null } | null;
  manifest?: { debuggerHost?: string | null } | null;
  manifest2?: {
    extra?: { expoGo?: { debuggerHost?: string | null } | null } | null;
  } | null;
};

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function isDevRuntime(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

function getExpoDevHost(): string {
  const c = Constants as ExpoHostConstants;
  const hostWithPort =
    c.expoConfig?.hostUri ||
    c.manifest?.debuggerHost ||
    c.manifest2?.extra?.expoGo?.debuggerHost ||
    "";
  return hostWithPort.split(":")[0]?.trim() ?? "";
}

function getLocalApiBaseUrl(): string {
  const explicitLocal =
    process.env.EXPO_PUBLIC_LOCAL_API_BASE_URL?.trim() ?? "";
  if (explicitLocal) {
    return trimTrailingSlash(explicitLocal);
  }

  const host = getExpoDevHost();
  if (!host) {
    return "";
  }

  const port =
    process.env.EXPO_PUBLIC_LOCAL_API_PORT?.trim() || DEFAULT_LOCAL_API_PORT;
  return `http://${host}:${port}`;
}

export function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";
  if (explicit) {
    return trimTrailingSlash(explicit);
  }

  if (isDevRuntime()) {
    const local = getLocalApiBaseUrl();
    if (local) {
      return local;
    }
  }

  return trimTrailingSlash(
    process.env.EXPO_PUBLIC_CLOUD_API_BASE_URL?.trim() ||
      DEFAULT_CLOUD_API_BASE_URL,
  );
}
