const DEFAULT_CLOUD_API_BASE_URL =
  "https://find-mine-backend-pmnpalawqa-df.a.run.app";

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  return trimTrailingSlash(
    process.env.EXPO_PUBLIC_CLOUD_API_BASE_URL?.trim() ||
      DEFAULT_CLOUD_API_BASE_URL,
  );
}
