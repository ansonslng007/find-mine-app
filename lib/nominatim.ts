import type { AppLocale } from "@/lib/i18n/types";

export type NominatimReverseResponse = {
  address?: unknown;
  name?: string;
};

export type NominatimReverseOptions = {
  signal?: AbortSignal;
  locale?: AppLocale;
};

/** Nominatim `accept-language` for reverse geocoding (place names). */
export function nominatimAcceptLanguage(locale: AppLocale): string {
  return locale === "en" ? "en" : "zh-Hant,zh-TW,zh";
}

export async function nominatimReverse(
  lat: number,
  lng: number,
  opts?: NominatimReverseOptions,
): Promise<NominatimReverseResponse> {
  const locale = opts?.locale ?? "zh-Hant";
  const acceptLanguage = nominatimAcceptLanguage(locale);
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=json` +
    `&lat=${encodeURIComponent(String(lat))}` +
    `&lon=${encodeURIComponent(String(lng))}` +
    `&accept-language=${encodeURIComponent(acceptLanguage)}`;
  const response = await fetch(url, {
    signal: opts?.signal,
    headers: {
      Accept: "application/json",
      "Accept-Language": acceptLanguage,
      "User-Agent": "FindMyApp/1.0",
    },
  });
  if (!response.ok) {
    throw new Error("reverse geocode failed");
  }
  return response.json();
}
