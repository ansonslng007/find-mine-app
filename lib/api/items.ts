import { apiClient } from "./client";

export type ItemKind = "lost" | "found";

export type Item = {
  id: string;
  kind: ItemKind;
  title: string;
  description: string | null;
  locationText: string | null;
  occurredAt: string | null;
  imageUrl: string;
  imageSha256: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateItemResponse = {
  item: Item;
  embedding: { modelVersion: string; dimensions: number };
};

export type CreateItemImagePart = {
  uri: string;
  name: string;
  type: string;
};

export type CreateItemInput = {
  kind: ItemKind;
  title: string;
  description?: string;
  locationText?: string;
  occurredAt?: string;
  modelVersion: string;
  embedding: number[];
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

export async function createItem(
  input: CreateItemInput,
): Promise<CreateItemResponse> {
  const form = new FormData();
  form.append("kind", input.kind);
  form.append("title", input.title);
  if (input.description != null && input.description !== "") {
    form.append("description", input.description);
  }
  if (input.locationText != null && input.locationText !== "") {
    form.append("locationText", input.locationText);
  }
  if (input.occurredAt != null && input.occurredAt !== "") {
    form.append("occurredAt", input.occurredAt);
  }
  form.append("modelVersion", input.modelVersion);
  form.append("embedding", JSON.stringify(input.embedding));
  // React Native FormData accepts { uri, name, type } for file fields.
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
