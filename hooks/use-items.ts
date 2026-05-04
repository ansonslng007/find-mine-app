import { listItems, type ListItemsParams } from "@/lib/api/items";
import { useQuery } from "@tanstack/react-query";

export function useLostItemsList(params?: ListItemsParams) {
  const kind = params?.kind;
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  return useQuery({
    queryKey: ["items", { kind, limit, offset }],
    queryFn: () => listItems({ kind, limit, offset }),
  });
}
