import { describe, expect, it } from "@jest/globals";

import { extractPlaceGeometry } from "./places-geometry";

describe("extractPlaceGeometry", () => {
  it("returns null for missing or invalid geometry", () => {
    expect(extractPlaceGeometry(null)).toBe(null);
    expect(extractPlaceGeometry({})).toBe(null);
    expect(extractPlaceGeometry({ geometry: { location: {} } })).toBe(null);
  });

  it("extracts numeric coordinates", () => {
    expect(
      extractPlaceGeometry({
        geometry: {
          location: { lat: 22.281, lng: 114.158 },
          viewport: { east: 1 },
        },
      }),
    ).toEqual({
      location: { lat: 22.281, lng: 114.158 },
      viewport: { east: 1 },
    });
  });

  it("supports Google SDK lat/lng functions and string numbers", () => {
    expect(
      extractPlaceGeometry({
        geometry: {
          location: { lat: () => 22.3193, lng: () => 114.1694 },
        },
      })?.location,
    ).toEqual({ lat: 22.3193, lng: 114.1694 });

    expect(
      extractPlaceGeometry({
        geometry: {
          location: { lat: "22.3", lng: "114.2" },
        },
      })?.location,
    ).toEqual({ lat: 22.3, lng: 114.2 });
  });
});
