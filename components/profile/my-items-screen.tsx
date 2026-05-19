import { passesCategoryChip } from "@/components/lost-items/format";
import { LostItemCard } from "@/components/lost-items/lost-item-card";
import { CategoryChipRow } from "@/components/lost-items/category-chip-row";
import { ThemedText } from "@/components/themed-text";
import { PillButton } from "@/components/ui/pill-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { type LostItemCategoryId } from "@/constants/items";
import { useAppColors } from "@/hooks/use-app-colors";
import { useItemsList } from "@/hooks/use-items";
import type { Item, ItemKind } from "@/lib/api/items";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MyItemsTab = ItemKind;

type MyItemsTabBarProps = Readonly<{
  activeTab: MyItemsTab;
  onTabChange: (tab: MyItemsTab) => void;
  tabLostLabel: string;
  tabFoundLabel: string;
  styles: {
    tabRow: object;
    tabBtn: object;
    tabLabel: object;
    tabLabelActive: object;
    tabIndicator: object;
  };
}>;

function MyItemsTabBar({
  activeTab,
  onTabChange,
  tabLostLabel,
  tabFoundLabel,
  styles,
}: MyItemsTabBarProps) {
  return (
    <View style={styles.tabRow}>
      <Pressable
        style={styles.tabBtn}
        onPress={() => onTabChange("lost")}
      >
        <ThemedText
          type="body"
          style={[
            styles.tabLabel,
            activeTab === "lost" && styles.tabLabelActive,
          ]}
        >
          {tabLostLabel}
        </ThemedText>
        {activeTab === "lost" ? <View style={styles.tabIndicator} /> : null}
      </Pressable>
      <Pressable
        style={styles.tabBtn}
        onPress={() => onTabChange("found")}
      >
        <ThemedText
          type="body"
          style={[
            styles.tabLabel,
            activeTab === "found" && styles.tabLabelActive,
          ]}
        >
          {tabFoundLabel}
        </ThemedText>
        {activeTab === "found" ? <View style={styles.tabIndicator} /> : null}
      </Pressable>
    </View>
  );
}

type MyItemsListEmptyProps = Readonly<{
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  brandColor: string;
  centerStyle: object;
  screenT: (key: string) => string;
  t: (key: string) => string;
}>;

function MyItemsListEmpty({
  isPending,
  isError,
  error,
  onRetry,
  brandColor,
  centerStyle,
  screenT,
  t,
}: MyItemsListEmptyProps) {
  if (isPending) {
    return (
      <View style={centerStyle}>
        <ActivityIndicator size="large" color={brandColor} />
        <ThemedText type="bodyMuted">{screenT("loading")}</ThemedText>
      </View>
    );
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : t("common.loadListFailed");
    return (
      <View style={centerStyle}>
        <ThemedText type="labelError" style={{ textAlign: "center" }}>
          {message}
        </ThemedText>
        <PillButton label={t("common.retry")} onPress={onRetry} />
      </View>
    );
  }

  return (
    <ThemedText type="bodyMuted" style={{ textAlign: "center", marginTop: 32 }}>
      {screenT("empty")}
    </ThemedText>
  );
};

export function MyItemsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { t } = useI18n();
  const screenT = (key: string) => t(`myItems.${key}`);
  const [activeTab, setActiveTab] = useState<MyItemsTab>("lost");
  const [category, setCategory] = useState<LostItemCategoryId>("all");

  const { data, isPending, isError, error, refetch, isRefetching } =
    useItemsList({ kind: activeTab, mine: true });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: c.pageBackground,
        },
        header: {
          paddingHorizontal: 16,
          paddingBottom: 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.borderSubtle,
          backgroundColor: c.pageBackground,
        },
        topRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        },
        backBtn: {
          padding: 4,
          marginLeft: -4,
        },
        title: {
          flex: 1,
          fontSize: 18,
          fontWeight: "700",
        },
        tabRow: {
          flexDirection: "row",
          width: "100%",
        },
        tabBtn: {
          flex: 1,
          alignItems: "center",
          paddingVertical: 10,
        },
        tabLabel: {
          fontSize: 16,
          fontWeight: "500",
          color: c.textMuted,
          textAlign: "center",
        },
        tabLabelActive: {
          fontWeight: "700",
          color: c.textPrimary,
        },
        tabIndicator: {
          marginTop: 8,
          height: 2,
          alignSelf: "stretch",
          borderRadius: 1,
          backgroundColor: c.brand,
        },
        listArea: {
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 12,
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
      }),
    [c],
  );

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((item) => passesCategoryChip(item, category));
  }, [data?.items, category]);

  const listShouldGrow =
    isPending || isError || filteredItems.length === 0;

  const renderItem = ({ item }: { item: Item }) => (
    <LostItemCard item={item} />
  );

  const listEmpty = (
    <MyItemsListEmpty
      isPending={isPending}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      brandColor={c.brand}
      centerStyle={styles.centerBlock}
      screenT={screenT}
      t={t}
    />
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <IconSymbol name="chevron.left" size={24} color={c.textPrimary} />
          </Pressable>
          <ThemedText type="screenTitle" style={styles.title}>
            {screenT("title")}
          </ThemedText>
        </View>

        <MyItemsTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabLostLabel={screenT("tabLost")}
          tabFoundLabel={screenT("tabFound")}
          styles={{
            tabRow: styles.tabRow,
            tabBtn: styles.tabBtn,
            tabLabel: styles.tabLabel,
            tabLabelActive: styles.tabLabelActive,
            tabIndicator: styles.tabIndicator,
          }}
        />
      </View>

      <View style={styles.listArea}>
        <CategoryChipRow category={category} onCategoryChange={setCategory} />
        <FlatList
          data={isPending || isError ? [] : filteredItems}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
            listShouldGrow && styles.listEmptyGrow,
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
    </View>
  );
}
