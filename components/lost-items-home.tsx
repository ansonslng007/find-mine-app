import { CategoryChipRow } from "@/components/lost-items/category-chip-row";
import { passesCategoryChip } from "@/components/lost-items/format";
import { LostItemCard } from "@/components/lost-items/lost-item-card";
import { SearchFilterRow } from "@/components/lost-items/search-filter-row";
import { ThemedText } from "@/components/themed-text";
import { PillButton } from "@/components/ui/pill-button";
import { type LostItemCategoryId } from "@/constants/mock-lost-items";
import { useAppColors } from "@/hooks/use-app-colors";
import { useLostItemsList } from "@/hooks/use-items";
import type { Item } from "@/lib/api/items";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageLayoutWithHeader } from "./layout/page-layout-with-header";

type LostItemsListEmptyProps = Readonly<{
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  brandColor: string;
  centerBlockStyle: ViewStyle;
  labelErrorStyle: TextStyle;
  emptyTextStyle: TextStyle;
}>;

function LostItemsListEmpty({
  isPending,
  isError,
  error,
  onRetry,
  brandColor,
  centerBlockStyle,
  labelErrorStyle,
  emptyTextStyle,
}: LostItemsListEmptyProps) {
  const errorMessage = error instanceof Error ? error.message : "無法載入列表";

  if (isPending) {
    return (
      <View style={centerBlockStyle}>
        <ActivityIndicator size="large" color={brandColor} />
        <ThemedText type="bodyMuted">載入中…</ThemedText>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={centerBlockStyle}>
        <ThemedText type="labelError" style={labelErrorStyle}>
          {errorMessage}
        </ThemedText>
        <PillButton label="重試" onPress={onRetry} />
      </View>
    );
  }

  return (
    <ThemedText type="bodyMuted" style={emptyTextStyle}>
      沒有符合的項目
    </ThemedText>
  );
}

export function LostItemsHome() {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LostItemCategoryId>("all");
  const { data, isPending, isError, error, refetch, isRefetching } =
    useLostItemsList({ kind: "lost" });

  const pageStyles = useMemo(
    () =>
      StyleSheet.create({
        listContent: {
          gap: 12,
        },
        listEmptyGrow: {
          flexGrow: 1,
        },
        centerBlock: {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 48,
          gap: 12,
        },
        empty: {
          textAlign: "center",
          marginTop: 32,
        },
        labelError: {
          paddingHorizontal: 16,
        },
      }),
    [c],
  );

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!passesCategoryChip(item, category)) return false;
      if (!q) return true;
      const desc = item.description ?? "";
      const hay = `${item.title} ${desc}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data?.items, query, category]);

  const renderItem = ({ item }: { item: Item }) => <LostItemCard item={item} />;

  const listEmpty = (
    <LostItemsListEmpty
      isPending={isPending}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      brandColor={c.brand}
      centerBlockStyle={pageStyles.centerBlock}
      labelErrorStyle={pageStyles.labelError}
      emptyTextStyle={pageStyles.empty}
    />
  );

  return (
    <PageLayoutWithHeader
      screenTitle="失物"
      screenSubtitle="一起找回遺失物"
      icon="shippingbox.fill"
      useScrollView={false}
    >
      <SearchFilterRow query={query} onQueryChange={setQuery} />
      <CategoryChipRow category={category} onCategoryChange={setCategory} />

      <FlatList
        data={isPending || isError ? [] : filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={[
          pageStyles.listContent,
          { paddingBottom: insets.bottom + 100 },
          (isPending || isError || filtered.length === 0) &&
            pageStyles.listEmptyGrow,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isPending}
            onRefresh={() => refetch()}
            tintColor={c.brand}
          />
        }
      />
    </PageLayoutWithHeader>
  );
}
