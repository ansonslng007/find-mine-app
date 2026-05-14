import { apiClient } from "./client";

export type ItemKind = "lost" | "found";

export type ItemPostedBy = {
  id: string;
  displayName: string | null;
};

export type Item = {
  id: string;
  kind: ItemKind;
  title: string;
  description: string | null;
  category: string;
  locationText: string | null;
  /** Geocoded latitude when available (Places / GPS). */
  locationLatitude: number | null;
  /** Geocoded longitude when available (Places / GPS). */
  locationLongitude: number | null;
  occurredAt: string | null;
  imageUrl: string;
  imageSha256: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  postedBy: ItemPostedBy | null;
};

export type CreateItemResponse = {
  item: Item;
};

export type CreateItemImagePart = {
  uri: string;
  name: string;
  type: string;
};

export type CreateItemInput = {
  kind: ItemKind;
  title: string;
  category: string;
  description?: string;
  locationText?: string;
  /** Must be sent together with `locationLongitude` when set. */
  locationLatitude?: number;
  locationLongitude?: number;
  occurredAt?: string;
  image: CreateItemImagePart;
};

export type ListItemsParams = {
  kind?: ItemKind;
  limit?: number;
  offset?: number;
};

export type ListItemsResponse = {
  items: Item[];
};

export async function listItems(
  params?: ListItemsParams,
): Promise<ListItemsResponse> {
  const { data } = await apiClient.get<ListItemsResponse>("/api/v1/items", {
    params: {
      kind: params?.kind,
      limit: params?.limit,
      offset: params?.offset,
    },
  });
  return data;
}

export type GetItemResponse = {
  item: Item;
};

export async function getItem(id: string): Promise<GetItemResponse> {
  const { data } = await apiClient.get<GetItemResponse>(`/api/v1/items/${id}`);
  return data;
}

export type ItemCategoriesResponse = {
  categories: string[];
};

export async function getItemCategories(): Promise<ItemCategoriesResponse> {
  const { data } = await apiClient.get<ItemCategoriesResponse>(
    "/api/v1/items/meta/categories",
  );
  return data;
}

export type SearchByTextParams = {
  query: string;
  kind?: ItemKind;
  limit?: number;
  /** Default true: vector recall + lexical RRF. */
  hybrid?: boolean;
  /** Vector candidate count before fusion (50–200); server clamps to at least `limit`. */
  recallLimit?: number;
};

export type SearchByTextResult = {
  item: Item;
  distance: number;
};

export type SearchByTextResponse = {
  results: SearchByTextResult[];
  modelVersion: string;
};

export async function searchByText(
  params: SearchByTextParams,
): Promise<SearchByTextResponse> {
  const body: Record<string, unknown> = { query: params.query };
  if (params.kind !== undefined) {
    body.kind = params.kind;
  }
  if (params.limit !== undefined) {
    body.limit = params.limit;
  }
  if (params.hybrid !== undefined) {
    body.hybrid = params.hybrid;
  }
  if (params.recallLimit !== undefined) {
    body.recallLimit = params.recallLimit;
  }
  const { data } = await apiClient.post<SearchByTextResponse>(
    "/api/v1/items/search-by-text",
    body,
  );
  return data;
}

export type SearchByImageParams = {
  uri: string;
  mime: string;
  kind?: ItemKind;
  limit?: number;
};

export type SearchByImageResult = {
  item: Item;
  distance: number;
};

export type SearchByImageResponse = {
  results: SearchByImageResult[];
  modelVersion: string;
};

export async function searchByImage(
  params: SearchByImageParams,
): Promise<SearchByImageResponse> {
  const form = new FormData();
  form.append(
    "image",
    {
      uri: params.uri,
      name: imageMimeToUploadName(params.mime),
      type: params.mime || "image/jpeg",
    } as any,
  );
  if (params.kind != null) {
    form.append("kind", params.kind);
  }
  if (params.limit != null) {
    form.append("limit", String(params.limit));
  }
  const { data } = await apiClient.post<SearchByImageResponse>(
    "/api/v1/items/search-by-image",
    form,
  );
  return data;
}

export type AnalyzeItemImageResponse = {
  category: string;
  description: string;
  title?: string;
};

export async function analyzeItemImage(input: {
  uri: string;
  mime: string;
}): Promise<AnalyzeItemImageResponse> {
  const form = new FormData();
  form.append(
    "image",
    {
      uri: input.uri,
      name: imageMimeToUploadName(input.mime),
      type: input.mime || "image/jpeg",
    } as any,
  );
  const { data } = await apiClient.post<AnalyzeItemImageResponse>(
    "/api/v1/items/analyze-image",
    form,
  );
  return data;
}

function imageMimeToUploadName(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "upload.png";
  if (m.includes("webp")) return "upload.webp";
  return "upload.jpg";
}

export async function createItem(
  input: CreateItemInput,
): Promise<CreateItemResponse> {
  const form = new FormData();
  form.append("kind", input.kind);
  form.append("title", input.title);
  form.append("category", input.category);
  if (input.description != null && input.description !== "") {
    form.append("description", input.description);
  }
  if (input.locationText != null && input.locationText !== "") {
    form.append("locationText", input.locationText);
  }
  if (
    input.locationLatitude != null &&
    input.locationLongitude != null &&
    Number.isFinite(input.locationLatitude) &&
    Number.isFinite(input.locationLongitude)
  ) {
    form.append("locationLatitude", String(input.locationLatitude));
    form.append("locationLongitude", String(input.locationLongitude));
  }
  if (input.occurredAt != null && input.occurredAt !== "") {
    form.append("occurredAt", input.occurredAt);
  }
  form.append(
    "image",
    {
      uri: input.image.uri,
      name: input.image.name,
      type: input.image.type,
    } as any,
  );
  const { data } = await apiClient.post<CreateItemResponse>(
    "/api/v1/items",
    form,
  );
  return data;
}
