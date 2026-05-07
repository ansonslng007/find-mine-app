export type LostItemCategoryId =
  | "all"
  | "electronics"
  | "clothing"
  | "accessories"
  | "documents"
  | "keys"
  | "wallet"
  | "bag"
  | "pet"
  | "other";

export type MockLostItem = {
  id: string;
  title: string;
  description: string;
  locationText: string;
  imageUrl: string;
  category: Exclude<LostItemCategoryId, "all">;
  createdAt: string;
  /** Whether to show relative time on the card right (per design mock row). */
  showRelativeTime?: boolean;
};

export const LOST_ITEM_CATEGORY_IDS: LostItemCategoryId[] = [
  "all",
  "electronics",
  "clothing",
  "accessories",
  "documents",
  "keys",
  "wallet",
  "bag",
  "pet",
  "other",
];
