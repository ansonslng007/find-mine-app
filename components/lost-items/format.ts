import type { LostItemCategoryId } from "@/constants/mock-lost-items";
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

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export type ItemCategoryId = Exclude<LostItemCategoryId, "all">;

export function inferItemCategoryId(item: Item): ItemCategoryId {
  const blob = `${item.title} ${item.description ?? ""}`.toLowerCase();
  if (
    /iphone|airpods|ipad|手機|耳機|筆電|laptop|phone|電子|充電|pixel|samsung|macbook/.test(
      blob,
    )
  ) {
    return "electronics";
  }
  if (/貓|狗|寵物|項圈|柴犬|虎斑|貓咪/.test(blob)) {
    return "pet";
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

export function passesCategoryChip(
  item: Item,
  category: LostItemCategoryId,
): boolean {
  if (category === "all") return true;
  const tagged = item as Item & { category?: LostItemCategoryId };
  if (tagged.category === undefined) return true;
  return tagged.category === category;
}
