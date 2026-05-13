import {
  getItem,
  listItems,
  searchByImage,
  searchByText,
  type ListItemsParams,
  type SearchByImageParams,
  type SearchByTextParams,
} from "@/lib/api/items";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: ["items", "detail", id],
    queryFn: () => getItem(id as string),
    enabled: typeof id === "string" && id.length > 0,
  });
}

export function useItemsList(params?: ListItemsParams) {
  const kind = params?.kind;
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  return useQuery({
    queryKey: ["items", { kind, limit, offset }],
    queryFn: () => listItems({ kind, limit, offset }),
  });
}

export function useSearchByTextMutation() {
  return useMutation({
    mutationFn: (params: SearchByTextParams) => searchByText(params),
  });
}

export function useSearchByImageMutation() {
  return useMutation({
    mutationFn: (params: SearchByImageParams) => searchByImage(params),
  });
}
