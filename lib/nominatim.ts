export type NominatimReverseResponse = {
  address?: unknown;
  name?: string;
};

export async function nominatimReverse(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<NominatimReverseResponse> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`;
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "FindMyApp/1.0",
    },
  });
  if (!response.ok) {
    throw new Error("reverse geocode failed");
  }
  return response.json();
}
