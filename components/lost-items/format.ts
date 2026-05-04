import type { LostItemCategoryId } from "@/constants/mock-lost-items";
import type { Item } from "@/lib/api/items";

const ONE_HOUR_MS = 60 * 60 * 1000;

export { ONE_HOUR_MS };

export function formatRelativeTimeZh(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return "剛剛";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  return new Date(iso).toLocaleDateString("zh-TW");
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function passesCategoryChip(
  item: Item,
  category: LostItemCategoryId
): boolean {
  if (category === "all") return true;
  const tagged = item as Item & { category?: LostItemCategoryId };
  if (tagged.category === undefined) return true;
  return tagged.category === category;
}
