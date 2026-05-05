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
  /** 是否在卡片右側顯示相對時間（設計圖其中一列） */
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
