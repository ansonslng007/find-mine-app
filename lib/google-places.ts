type AutocompletePrediction = Readonly<{
  description: string;
  place_id: string;
}>;

type PlaceDetailsResult = Readonly<{
  geometry?: unknown;
  formatted_address?: string;
  name?: string;
  place_id?: string;
}>;

export async function fetchPlaceAutocompletePredictions(
  input: string,
  opts: Readonly<{
    apiKey: string;
    language: string;
    country?: string;
    signal?: AbortSignal;
  }>,
): Promise<AutocompletePrediction[]> {
  const trimmed = input.trim();
  if (!trimmed || !opts.apiKey) {
    return [];
  }

  const params = new URLSearchParams({
    input: trimmed,
    key: opts.apiKey,
    language: opts.language,
  });
  if (opts.country) {
    params.set("components", `country:${opts.country}`);
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
  const response = await fetch(url, { signal: opts.signal });
  if (!response.ok) {
    throw new Error("place autocomplete failed");
  }

  const json = (await response.json()) as {
    status?: string;
    predictions?: { description?: string; place_id?: string }[];
  };

  if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
    throw new Error(json.status ?? "place autocomplete error");
  }

  const predictions = json.predictions ?? [];
  return predictions
    .filter((p) => p.place_id && p.description)
    .map((p) => ({
      description: p.description as string,
      place_id: p.place_id as string,
    }));
}

export async function fetchPlaceDetails(
  placeId: string,
  opts: Readonly<{
    apiKey: string;
    language: string;
    fields: string;
    signal?: AbortSignal;
  }>,
): Promise<PlaceDetailsResult> {
  const params = new URLSearchParams({
    place_id: placeId,
    key: opts.apiKey,
    language: opts.language,
    fields: opts.fields,
  });

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
  const response = await fetch(url, { signal: opts.signal });
  if (!response.ok) {
    throw new Error("place details failed");
  }

  const json = (await response.json()) as {
    status?: string;
    result?: PlaceDetailsResult;
  };

  if (json.status !== "OK" || !json.result) {
    throw new Error(json.status ?? "place details error");
  }

  return json.result;
}
