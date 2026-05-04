import {
  getItem,
  listItems,
  type ListItemsParams,
} from "@/lib/api/items";
import { useQuery } from "@tanstack/react-query";

export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: ["items", "detail", id],
    queryFn: () => getItem(id as string),
    enabled: typeof id === "string" && id.length > 0,
  });
}

export function useLostItemsList(params?: ListItemsParams) {
  const kind = params?.kind;
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  return useQuery({
    queryKey: ["items", { kind, limit, offset }],
    queryFn: () => listItems({ kind, limit, offset }),
  });
}
