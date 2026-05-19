import {
  updateItem,
  type UpdateItemInput,
  type UpdateItemResponse,
} from "@/lib/api/items";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation<UpdateItemResponse, Error, UpdateItemInput>({
    mutationFn: updateItem,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({
        queryKey: ["items", "detail", variables.itemId],
      });
    },
  });
}
