import type { AppLocale } from "@/lib/i18n/types";

type Translate = (key: string, options?: Record<string, unknown>) => string;

type NominatimAddress = {
  road?: unknown;
  house_number?: unknown;
  neighbourhood?: unknown;
  suburb?: unknown;
  city?: unknown;
  county?: unknown;
  country?: unknown;
};

function asRecord(v: unknown): NominatimAddress {
  return v != null && typeof v === "object" ? (v as NominatimAddress) : {};
}

/** Turn Nominatim reverse JSON `address` into a single-line readable string (same as map pick on the post form). */
export function buildReadableAddressFromNominatim(
  address: unknown,
  name: string,
  latitude: number,
  longitude: number,
  opts: Readonly<{ locale: AppLocale; translate: Translate }>,
): string {
  const { road, house_number, neighbourhood, suburb, city, county, country } =
    asRecord(address);
  const t = opts.translate;
  const locationParts: string[] = [];
  const listSep = opts.locale === "zh-Hant" ? "，" : ", ";

  if (road && house_number) {
    locationParts.push(
      t("address.roadWithNumber", {
        road: String(road),
        house_number: String(house_number),
      }),
    );
  } else if (road) {
    locationParts.push(t("address.roadNearby", { road: String(road) }));
  } else if (name) {
    locationParts.push(name);
  }

  if (neighbourhood) {
    locationParts.push(String(neighbourhood));
  } else if (suburb) {
    locationParts.push(String(suburb));
  }

  if (city) {
    locationParts.push(String(city));
  } else if (county) {
    locationParts.push(String(county));
  }

  if (locationParts.length === 0) {
    const latDesc =
      latitude > 25.0
        ? t("address.north")
        : latitude > 23.5
          ? t("address.centralLat")
          : t("address.south");
    const lonDesc =
      longitude > 121.0
        ? t("address.east")
        : longitude > 120.5
          ? t("address.west")
          : t("address.centralLon");

    if (country) {
      return t("address.inCountry", {
        country: String(country),
        latDesc,
        lonDesc,
      });
    }
    return t("address.mystery", {
      lat: latitude.toFixed(4),
      lng: longitude.toFixed(4),
    });
  }

  return locationParts.join(listSep);
}
