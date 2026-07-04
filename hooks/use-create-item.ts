import { createItem, type CreateItemInput, type CreateItemResponse } from "@/lib/api/items";
import { notificationQueryKeys } from "@/hooks/use-notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation<CreateItemResponse, Error, CreateItemInput>({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
      }, 1500);
    },
  });
}
