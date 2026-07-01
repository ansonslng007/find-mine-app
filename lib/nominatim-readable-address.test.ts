import { describe, expect, it } from "@jest/globals";

import { buildReadableAddressFromNominatim } from "./nominatim-readable-address";

const translate = (key: string, options?: Record<string, unknown>) => {
  if (key === "address.roadWithNumber") {
    return `${options?.house_number} ${options?.road}`;
  }
  if (key === "address.roadNearby") {
    return `Near ${options?.road}`;
  }
  if (key === "address.inCountry") {
    return `${options?.country} ${options?.latDesc} ${options?.lonDesc}`;
  }
  if (key === "address.mystery") {
    return `${options?.lat},${options?.lng}`;
  }
  return key;
};

describe("buildReadableAddressFromNominatim", () => {
  it("builds an English address from road, district, and city parts", () => {
    expect(
      buildReadableAddressFromNominatim(
        {
          road: "Nathan Road",
          house_number: "1",
          neighbourhood: "Tsim Sha Tsui",
          city: "Hong Kong",
        },
        "",
        22.3,
        114.17,
        { locale: "en", translate },
      ),
    ).toBe("1 Nathan Road, Tsim Sha Tsui, Hong Kong");
  });

  it("uses the place name when no road is available", () => {
    expect(
      buildReadableAddressFromNominatim({}, "Victoria Park", 22.28, 114.19, {
        locale: "en",
        translate,
      }),
    ).toBe("Victoria Park");
  });

  it("falls back to country or coordinates when address parts are missing", () => {
    expect(
      buildReadableAddressFromNominatim(
        { country: "Hong Kong" },
        "",
        22.3,
        114.17,
        { locale: "en", translate },
      ),
    ).toBe("Hong Kong address.south address.centralLon");

    expect(
      buildReadableAddressFromNominatim({}, "", 22.3, 114.17, {
        locale: "en",
        translate,
      }),
    ).toBe("22.3000,114.1700");
  });
});
