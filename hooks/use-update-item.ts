import {
  updateItem,
  type ListItemsResponse,
  type UpdateItemInput,
  type UpdateItemResponse,
} from "@/lib/api/items";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function isItemsListQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    queryKey.length >= 2 &&
    queryKey[0] === "items" &&
    typeof queryKey[1] === "object" &&
    queryKey[1] !== null
  );
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation<UpdateItemResponse, Error, UpdateItemInput>({
    mutationFn: updateItem,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ["items", "detail", variables.itemId],
        data,
      );

      queryClient.setQueriesData<ListItemsResponse>(
        {
          queryKey: ["items"],
          predicate: (query) => isItemsListQueryKey(query.queryKey),
        },
        (old) => {
          if (!old?.items) {
            return old;
          }
          const idx = old.items.findIndex((it) => it.id === data.item.id);
          if (idx < 0) {
            return old;
          }
          const items = [...old.items];
          items[idx] = data.item;
          return { ...old, items };
        },
      );
    },
  });
}
