import type { LostItemCategoryId } from "@/constants/items";
import type { Item } from "@/lib/api/items";
import type { AppLocale } from "@/lib/i18n/types";

const ONE_HOUR_MS = 60 * 60 * 1000;

export { ONE_HOUR_MS };

export type TranslateFn = (
  scope: string,
  options?: Record<string, unknown>,
) => string;

export function formatRelativeTime(
  iso: string,
  t: TranslateFn,
  locale: AppLocale,
): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) {
    return t("time.justNow");
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return t("time.minutesAgo", { count: min });
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return t("time.hoursAgo", { count: hr });
  }
  const day = Math.floor(hr / 24);
  if (day < 7) {
    return t("time.daysAgo", { count: day });
  }
  const dateStr = new Date(iso).toLocaleDateString(
    locale === "zh-Hant" ? "zh-TW" : "en-US",
  );
  return dateStr;
}

/** Local calendar date for item occurredAt (lost/found time). */
export function formatOccurredAt(
  iso: string | null | undefined,
  locale: AppLocale,
): string | null {
  if (iso == null || iso.trim() === "") {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleDateString(locale === "zh-Hant" ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export type ItemCategoryId = Exclude<LostItemCategoryId, "all">;

const CATEGORY_IDS_NO_ALL = new Set<string>(
  (
    [
      "electronics",
      "clothing",
      "accessories",
      "documents",
      "keys",
      "wallet",
      "bag",
      "other",
    ] as const
  ).map((s) => s),
);

export function inferItemCategoryId(item: Item): ItemCategoryId {
  if (item.category && CATEGORY_IDS_NO_ALL.has(item.category)) {
    return item.category as ItemCategoryId;
  }
  const blob = `${item.title} ${item.description ?? ""}`.toLowerCase();
  if (
    /iphone|airpods|ipad|手機|耳機|筆電|laptop|phone|電子|充電|pixel|samsung|macbook/.test(
      blob,
    )
  ) {
    return "electronics";
  }
  if (/鑰匙|key/.test(blob)) {
    return "keys";
  }
  if (/錢包|皮夾|wallet/.test(blob)) {
    return "wallet";
  }
  if (/後背包|背包|bag|托特|登山包/.test(blob)) {
    return "bag";
  }
  if (/證件|護照|文件|文件夾|folder|影本/.test(blob)) {
    return "documents";
  }
  if (/衣|外套|夾克|jacket|shirt|鞋|羽絨/.test(blob)) {
    return "clothing";
  }
  if (/手錶|眼鏡|配件|airtag/.test(blob)) {
    return "accessories";
  }
  return "other";
}

/** Reward tag on list cards (yellow pill, like platform source tags). */
export const ITEM_REWARD_TAG_BG = "#FACC15";
export const ITEM_REWARD_TAG_TEXT_COLOR = "#713F12";

export function hasDisplayableReward(item: Item): boolean {
  const amount = item.rewardAmount ?? 0;
  return item.kind === "lost" && Number.isFinite(amount) && amount > 0;
}

export function formatItemRewardAmount(
  amount: number,
  currencyPrefix: string,
  locale: AppLocale = "zh-Hant",
): string {
  const formatted = new Intl.NumberFormat(
    locale === "zh-Hant" ? "zh-HK" : "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(amount);
  return `${currencyPrefix}${formatted}`;
}

export function passesCategoryChip(
  item: Item,
  category: LostItemCategoryId,
): boolean {
  if (category === "all") return true;
  const id = inferItemCategoryId(item);
  return id === category;
}

/** When no ISO bounds, all items pass. If any bound is set, items without occurredAt are excluded. */
export function itemMatchesOccurredRange(
  item: Item,
  occurredAfterIso: string | null | undefined,
  occurredBeforeIso: string | null | undefined,
): boolean {
  const hasAfter = Boolean(occurredAfterIso);
  const hasBefore = Boolean(occurredBeforeIso);
  if (!hasAfter && !hasBefore) {
    return true;
  }
  if (item.occurredAt == null || item.occurredAt === "") {
    return false;
  }
  const t = new Date(item.occurredAt).getTime();
  if (hasAfter && t < new Date(occurredAfterIso as string).getTime()) {
    return false;
  }
  if (hasBefore && t > new Date(occurredBeforeIso as string).getTime()) {
    return false;
  }
  return true;
}

const EARTH_RADIUS_M = 6371000;

function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a1 = (lat1 * Math.PI) / 180;
  const a2 = (lat2 * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(a1) * Math.cos(a2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Aligns with list/search API geo filter: pass when no center or radius; exclude items without coordinates. */
export function itemMatchesSearchGeo(
  item: Item,
  centerLat: number | null | undefined,
  centerLng: number | null | undefined,
  radiusMeters: number | null | undefined,
): boolean {
  if (
    centerLat == null ||
    centerLng == null ||
    radiusMeters == null ||
    radiusMeters <= 0
  ) {
    return true;
  }
  if (item.locationLatitude == null || item.locationLongitude == null) {
    return false;
  }
  const d = haversineDistanceMeters(
    centerLat,
    centerLng,
    item.locationLatitude,
    item.locationLongitude,
  );
  return d <= radiusMeters;
}
