import type { AppLocale } from "@/lib/i18n/types";

export function formatNotificationTime(iso: string, locale: AppLocale): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) {
    return locale === "zh-Hant" ? "剛剛" : "Just now";
  }
  if (diffMin < 60) {
    return locale === "zh-Hant" ? `${diffMin} 分鐘` : `${diffMin} min`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return locale === "zh-Hant" ? `${diffHours} 小時` : `${diffHours} hr`;
  }

  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(locale === "zh-Hant" ? "zh-TW" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 7) {
    return locale === "zh-Hant" ? `${diffDays} 天` : `${diffDays} d`;
  }

  return d.toLocaleDateString(locale === "zh-Hant" ? "zh-TW" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
}
