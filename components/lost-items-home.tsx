import { CategoryChipRow } from "@/components/lost-items/category-chip-row";
import { passesCategoryChip } from "@/components/lost-items/format";
import { AppHeader } from "@/components/layout/app-header";
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
        page: {
          flex: 1,
          backgroundColor: c.pageBackground,
          paddingHorizontal: 16,
        },
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

  const listEmpty = isPending ? (
    <View style={pageStyles.centerBlock}>
      <ActivityIndicator size="large" color={c.brand} />
      <ThemedText type="bodyMuted">載入中…</ThemedText>
    </View>
  ) : isError ? (
    <View style={pageStyles.centerBlock}>
      <ThemedText type="labelError" style={pageStyles.labelError}>
        {error instanceof Error ? error.message : "無法載入列表"}
      </ThemedText>
      <PillButton
        label="重試"
        onPress={() => refetch()}
        accessibilityRole="button"
        accessibilityLabel="重試"
      />
    </View>
  ) : (
    <ThemedText type="bodyMuted" style={pageStyles.empty}>
      沒有符合的項目
    </ThemedText>
  );

  return (
    <View style={[pageStyles.page, { paddingTop: insets.top + 8 }]}>
      <AppHeader
        screenTitle="失物"
        screenSubtitle="一起找回遺失物"
        icon="shippingbox.fill"
      />
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
    </View>
  );
}
