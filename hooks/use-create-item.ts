import { createItem, type CreateItemInput, type CreateItemResponse } from "@/lib/api/items";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation<CreateItemResponse, Error, CreateItemInput>({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
