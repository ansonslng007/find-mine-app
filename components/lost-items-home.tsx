import {
  LOST_ITEM_CATEGORY_CHIPS,
  type LostItemCategoryId,
} from "@/constants/mock-lost-items";
import { useLostItemsList } from "@/hooks/use-items";
import type { Item } from "@/lib/api/items";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";

const PRIMARY = "#2563EB";
const PAGE_BG = "#F3F4F6";
const CARD_BG = "#FFFFFF";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const BADGE_LOST = "#EF4444";
const BADGE_FOUND = "#2563EB";
const CHIP_INACTIVE_BG = "#E5E7EB";

const ONE_HOUR_MS = 60 * 60 * 1000;

function formatRelativeTimeZh(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return "剛剛";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  return new Date(iso).toLocaleDateString("zh-TW");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function passesCategoryChip(item: Item, category: LostItemCategoryId): boolean {
  if (category === "all") return true;
  const tagged = item as Item & { category?: LostItemCategoryId };
  if (tagged.category === undefined) return true;
  return tagged.category === category;
}

export function LostItemsHome() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LostItemCategoryId>("all");
  const { data, isPending, isError, error, refetch, isRefetching } =
    useLostItemsList({ kind: "lost" });

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

  const renderItem = ({ item }: { item: Item }) => {
    const desc = item.description ?? "";
    const loc = item.locationText ?? "未填地點";
    const isLost = item.kind === "lost";
    const showTime =
      Date.now() - new Date(item.createdAt).getTime() < ONE_HOUR_MS;

    return (
      <View style={styles.card}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.thumb}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[
                styles.badge,
                isLost ? styles.badgeLost : styles.badgeFound,
              ]}
            >
              <Text style={styles.badgeText}>{isLost ? "遺失" : "尋獲"}</Text>
            </View>
          </View>
          <Text style={styles.desc} numberOfLines={2}>
            {desc ? truncate(desc, 72) : "（無描述）"}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.locRow}>
              <IconSymbol name="mappin.circle.fill" size={14} color={MUTED} />
              <Text style={styles.locText} numberOfLines={1}>
                {loc}
              </Text>
            </View>
            {showTime ? (
              <View style={styles.timeRow}>
                <IconSymbol name="clock" size={14} color={MUTED} />
                <Text style={styles.timeText}>
                  {formatRelativeTimeZh(item.createdAt)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const listEmpty = isPending ? (
    <View style={styles.centerBlock}>
      <ActivityIndicator size="large" color={PRIMARY} />
      <Text style={styles.hint}>載入中…</Text>
    </View>
  ) : isError ? (
    <View style={styles.centerBlock}>
      <Text style={styles.errorText}>
        {error instanceof Error ? error.message : "無法載入列表"}
      </Text>
      <Pressable
        onPress={() => refetch()}
        style={styles.retryBtn}
        accessibilityRole="button"
        accessibilityLabel="重試"
      >
        <Text style={styles.retryLabel}>重試</Text>
      </Pressable>
    </View>
  ) : (
    <Text style={styles.empty}>沒有符合的項目</Text>
  );

  return (
    <View style={[styles.page, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <IconSymbol name="shippingbox.fill" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>失物</Text>
          <Text style={styles.headerSubtitle}>一起找回遺失物</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <IconSymbol name="magnifyingglass" size={20} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜尋物品…"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.filterBtn,
            pressed && styles.filterBtnPressed,
          ]}
          onPress={() => Alert.alert("篩選", "進階篩選將於之後版本開放。")}
          accessibilityRole="button"
          accessibilityLabel="篩選"
        >
          <IconSymbol name="slider.horizontal.3" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.chipsWrap}>
        {LOST_ITEM_CATEGORY_CHIPS.map((chip) => {
          const active = category === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setCategory(chip.id)}
              style={[
                styles.chip,
                active ? styles.chipActive : styles.chipInactive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={active ? styles.chipLabelActive : styles.chipLabel}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={isPending || isError ? [] : filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
          (isPending || isError || filtered.length === 0) &&
            styles.listEmptyGrow,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isPending}
            onRefresh={() => refetch()}
            tintColor={PRIMARY}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 15,
    color: MUTED,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CHIP_INACTIVE_BG,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    padding: 0,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnPressed: {
    opacity: 0.9,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipActive: {
    backgroundColor: PRIMARY,
  },
  chipInactive: {
    backgroundColor: CHIP_INACTIVE_BG,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  chipLabelActive: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
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
  hint: {
    fontSize: 15,
    color: MUTED,
  },
  errorText: {
    fontSize: 15,
    color: "#B91C1C",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },
  retryLabel: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  card: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: CHIP_INACTIVE_BG,
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeLost: {
    backgroundColor: BADGE_LOST,
  },
  badgeFound: {
    backgroundColor: BADGE_FOUND,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  desc: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  locRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  locText: {
    flex: 1,
    fontSize: 13,
    color: MUTED,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  timeText: {
    fontSize: 12,
    color: MUTED,
  },
  empty: {
    textAlign: "center",
    color: MUTED,
    marginTop: 32,
    fontSize: 15,
  },
});
