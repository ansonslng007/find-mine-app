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

export const LOST_ITEM_CATEGORY_CHIPS: {
  id: LostItemCategoryId;
  label: string;
}[] = [
  { id: "all", label: "全部" },
  { id: "electronics", label: "電子產品" },
  { id: "clothing", label: "服飾" },
  { id: "accessories", label: "配件" },
  { id: "documents", label: "證件" },
  { id: "keys", label: "鑰匙" },
  { id: "wallet", label: "錢包" },
  { id: "bag", label: "提袋" },
  { id: "pet", label: "寵物" },
  { id: "other", label: "其他" },
];
