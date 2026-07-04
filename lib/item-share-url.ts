import * as Linking from "expo-linking";

const APP_SCHEME = "findmine";

function buildAppSchemeUrl(path: string): string {
  return `${APP_SCHEME}://${path.replace(/^\//, "")}`;
}

function joinWebBase(base: string, path: string): string {
  const normalized = base.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${normalized}${suffix}`;
}

/**
 * Shareable URL for an item detail screen.
 * - `EXPO_PUBLIC_WEB_BASE_URL` → web link (only when you have a web build that runs without native-only modules)
 * - Expo Go dev → `exp://…/--/item/…` (open in Expo Go, not mobile Chrome)
 * - Production native → `findmine://item/…` or whatever `Linking.createURL` returns
 */
export function buildItemShareUrl(itemId: string): string {
  const path = `/item/${encodeURIComponent(itemId)}`;

  const webBase = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim();
  if (webBase) {
    return joinWebBase(webBase, path);
  }

  const generated = Linking.createURL(path, { scheme: APP_SCHEME });

  if (generated.startsWith("http://") || generated.startsWith("https://")) {
    return buildAppSchemeUrl(path);
  }

  if (!generated.includes("://")) {
    return buildAppSchemeUrl(path);
  }

  return generated;
}
