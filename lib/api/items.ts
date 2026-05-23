import type { AppLocale } from "@/lib/i18n/types";
import { prepareImageForUpload } from "@/lib/image/prepare-upload-image";
import { apiClient, apiMultipartRequest } from "./client";

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
  /** Facebook group post URL when imported from external feed. */
  sourcePostUrl: string | null;
  /** External source, e.g. `facebook`; null when posted via the app. */
  platform: string | null;
  /** Finder reward in HKD; only set for lost items. */
  rewardAmount: number | null;
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
  /** HKD reward for lost items; optional, defaults to 0. */
  rewardAmount?: number;
  image: CreateItemImagePart;
};

export type UpdateItemInput = {
  itemId: string;
  kind: ItemKind;
  title: string;
  category: string;
  description?: string;
  locationText?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  occurredAt?: string;
  rewardAmount?: number;
  image?: CreateItemImagePart;
};

export type UpdateItemResponse = {
  item: Item;
};

export type ListItemsParams = {
  kind?: ItemKind;
  /** When true, only items posted by the signed-in user. */
  mine?: boolean;
  limit?: number;
  offset?: number;
  /** ISO 8601: occurred_at >= this. */
  occurredAfter?: string;
  /** ISO 8601: occurred_at <= this. */
  occurredBefore?: string;
  /** Search center latitude; send with nearLng and radiusMeters. */
  nearLat?: number;
  nearLng?: number;
  /** Haversine radius in meters. */
  radiusMeters?: number;
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
      mine: params?.mine === true ? "true" : undefined,
      limit: params?.limit,
      offset: params?.offset,
      occurredAfter: params?.occurredAfter,
      occurredBefore: params?.occurredBefore,
      nearLat: params?.nearLat,
      nearLng: params?.nearLng,
      radiusMeters: params?.radiusMeters,
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
  /** ISO 8601: occurred_at >= this. */
  occurredAfter?: string;
  /** ISO 8601: occurred_at <= this. */
  occurredBefore?: string;
  nearLat?: number;
  nearLng?: number;
  radiusMeters?: number;
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
  if (params.occurredAfter !== undefined) {
    body.occurredAfter = params.occurredAfter;
  }
  if (params.occurredBefore !== undefined) {
    body.occurredBefore = params.occurredBefore;
  }
  if (params.nearLat !== undefined) {
    body.nearLat = params.nearLat;
  }
  if (params.nearLng !== undefined) {
    body.nearLng = params.nearLng;
  }
  if (params.radiusMeters !== undefined) {
    body.radiusMeters = params.radiusMeters;
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
  /** Cosine distance upper bound (0–2); lower = stricter similarity. */
  maxDistance?: number;
  occurredAfter?: string;
  occurredBefore?: string;
  nearLat?: number;
  nearLng?: number;
  radiusMeters?: number;
};

export type SearchByImageResult = {
  item: Item;
  distance: number;
};

export type SearchByImageResponse = {
  results: SearchByImageResult[];
  modelVersion: string;
  maxDistance: number;
};

async function appendPreparedImagePart(
  form: FormData,
  uri: string,
  mime: string,
): Promise<void> {
  const prepared = await prepareImageForUpload(uri, mime);
  form.append(
    "image",
    {
      uri: prepared.uri,
      name: prepared.name,
      type: prepared.mime,
    } as any,
  );
}

export async function searchByImage(
  params: SearchByImageParams,
): Promise<SearchByImageResponse> {
  const form = new FormData();
  await appendPreparedImagePart(form, params.uri, params.mime);
  if (params.kind != null) {
    form.append("kind", params.kind);
  }
  if (params.limit != null) {
    form.append("limit", String(params.limit));
  }
  if (params.maxDistance != null) {
    form.append("maxDistance", String(params.maxDistance));
  }
  if (params.occurredAfter != null) {
    form.append("occurredAfter", params.occurredAfter);
  }
  if (params.occurredBefore != null) {
    form.append("occurredBefore", params.occurredBefore);
  }
  if (params.nearLat != null) {
    form.append("nearLat", String(params.nearLat));
  }
  if (params.nearLng != null) {
    form.append("nearLng", String(params.nearLng));
  }
  if (params.radiusMeters != null) {
    form.append("radiusMeters", String(params.radiusMeters));
  }
  return apiMultipartRequest<SearchByImageResponse>(
    "/api/v1/items/search-by-image",
    form,
  );
}

export type AnalyzeItemImageResponse = {
  category: string;
  description: string;
  title?: string;
};

export async function analyzeItemImage(input: {
  uri: string;
  mime: string;
  locale: AppLocale;
}): Promise<AnalyzeItemImageResponse> {
  const form = new FormData();
  await appendPreparedImagePart(form, input.uri, input.mime);
  form.append("locale", input.locale);
  return apiMultipartRequest<AnalyzeItemImageResponse>(
    "/api/v1/items/analyze-image",
    form,
    { timeoutMs: 120_000 },
  );
}

export async function createItem(
  input: CreateItemInput,
): Promise<CreateItemResponse> {
  const form = new FormData();
  appendItemFieldsToForm(form, input);
  await appendPreparedImagePart(form, input.image.uri, input.image.type);
  return apiMultipartRequest<CreateItemResponse>("/api/v1/items", form, {
    timeoutMs: 120_000,
  });
}

function appendItemFieldsToForm(
  form: FormData,
  input: Omit<CreateItemInput, "image">,
): void {
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
  if (
    input.kind === "lost" &&
    input.rewardAmount !== undefined &&
    Number.isFinite(input.rewardAmount)
  ) {
    form.append("rewardAmount", String(input.rewardAmount));
  }
}

export async function updateItem(
  input: UpdateItemInput,
): Promise<UpdateItemResponse> {
  const form = new FormData();
  appendItemFieldsToForm(form, input);
  if (input.image != null) {
    await appendPreparedImagePart(form, input.image.uri, input.image.type);
  }
  return apiMultipartRequest<UpdateItemResponse>(
    `/api/v1/items/${input.itemId}`,
    form,
    { method: "PATCH", timeoutMs: 120_000 },
  );
}

export async function deleteItem(itemId: string): Promise<void> {
  await apiClient.delete(`/api/v1/items/${itemId}`);
}
