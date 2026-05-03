import { createItem, type CreateItemInput, type CreateItemResponse } from "@/lib/api/items";
import { useMutation } from "@tanstack/react-query";

export function useCreateItem() {
  return useMutation<CreateItemResponse, Error, CreateItemInput>({
    mutationFn: createItem,
  });
}
