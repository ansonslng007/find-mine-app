/** Geometry returned from Google Place Details (location + optional viewport). */
export type PlaceGeometry = Readonly<{
  location: { lat: number; lng: number };
  viewport?: unknown;
}>;

/** Parse geometry from `details` in Places `onPress(data, details)`. */
export function extractPlaceGeometry(details: unknown): PlaceGeometry | null {
  if (!details || typeof details !== "object") {
    return null;
  }
  const d = details as { geometry?: unknown };
  const geometry = d.geometry;
  if (!geometry || typeof geometry !== "object") {
    return null;
  }
  const g = geometry as {
    location?: unknown;
    viewport?: unknown;
  };
  if (!g.location || typeof g.location !== "object") {
    return null;
  }
  const loc = g.location as { lat?: unknown; lng?: unknown };
  const rawLat = loc.lat;
  const rawLng = loc.lng;
  const lat =
    typeof rawLat === "function"
      ? (rawLat as () => number)()
      : typeof rawLat === "number"
        ? rawLat
        : Number(rawLat);
  const lng =
    typeof rawLng === "function"
      ? (rawLng as () => number)()
      : typeof rawLng === "number"
        ? rawLng
        : Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {
    location: { lat, lng },
    viewport: g.viewport,
  };
}
