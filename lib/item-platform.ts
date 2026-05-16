/** DB `items.platform` values for externally imported posts. */
export const ITEM_PLATFORM_FACEBOOK = "facebook" as const;

/** Platform source tag background (Facebook brand blue). */
export const ITEM_PLATFORM_TAG_BG = "#0866FF";

export type ItemPlatform = typeof ITEM_PLATFORM_FACEBOOK;

/** i18n key under `platform.*`, e.g. platform.facebook → "Facebook". */
export function platformLabelKey(
  platform: string | null | undefined,
): string | null {
  if (platform === ITEM_PLATFORM_FACEBOOK) return "platform.facebook";
  return null;
}

/** Resolve platform for UI (DB field, or facebook when source_post_url exists). */
export function getEffectiveItemPlatform(item: {
  platform?: string | null;
  sourcePostUrl?: string | null;
}): string | null {
  const p = item.platform?.trim();
  if (p) return p;
  if (item.sourcePostUrl?.trim()) return ITEM_PLATFORM_FACEBOOK;
  return null;
}

/** Display label such as Facebook. */
export function formatPlatformTag(
  platform: string | null | undefined,
  t: (key: string) => string,
): string | null {
  const key = platformLabelKey(platform);
  if (!key) return null;
  const label = t(key);
  if (!label || label === key) return null;
  return label;
}

export function formatItemPlatformTag(
  item: {
    platform?: string | null;
    sourcePostUrl?: string | null;
  },
  t: (key: string) => string,
): string | null {
  return formatPlatformTag(getEffectiveItemPlatform(item), t);
}

export function isFacebookImport(item: {
  platform?: string | null;
  sourcePostUrl?: string | null;
}): boolean {
  return (
    getEffectiveItemPlatform(item) === ITEM_PLATFORM_FACEBOOK &&
    Boolean(item.sourcePostUrl?.trim())
  );
}
