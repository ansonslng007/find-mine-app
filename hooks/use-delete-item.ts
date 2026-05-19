import { deleteItem } from "@/lib/api/items";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteItem,
    onSuccess: (_data, itemId) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({
        queryKey: ["items", "detail", itemId],
      });
    },
  });
}
