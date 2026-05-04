import {
  formatRelativeTimeZh,
  inferDisplayCategory,
} from "@/components/lost-items/format";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { useItem } from "@/hooks/use-items";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { data, isPending, isError, error, refetch } = useItem(id);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: c.pageBackground,
        },
        topBar: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: c.cardBackground,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.borderSubtle,
        },
        closeRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        closeLabel: {
          fontSize: 17,
          fontWeight: "500",
          color: c.brand,
        },
        hero: {
          width: "100%",
          aspectRatio: 1,
          maxHeight: 420,
          backgroundColor: c.imagePlaceholder,
        },
        body: {
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 32,
        },
        title: {
          fontSize: 24,
          fontWeight: "700",
          lineHeight: 32,
          marginBottom: 16,
        },
        metaRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 20,
          marginBottom: 24,
        },
        metaItem: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        metaText: {
          fontSize: 15,
          color: c.textMuted,
        },
        sectionTitle: {
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 10,
        },
        sectionBody: {
          fontSize: 16,
          lineHeight: 24,
          marginBottom: 24,
        },
        locationCard: {
          backgroundColor: c.cardBackground,
          borderRadius: 16,
          padding: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
        },
        locationHeader: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        },
        locationTitle: {
          fontSize: 16,
          fontWeight: "700",
          color: c.textPrimary,
        },
        locationBody: {
          fontSize: 15,
          lineHeight: 22,
          color: c.textMuted,
        },
        center: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          gap: 12,
        },
        badge: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: "#D32F2F",
        },
        badgeText: {
          color: "#FFFFFF",
          fontSize: 13,
          fontWeight: "700",
        },
      }),
    [c],
  );

  const item = data?.item;

  if (!id) {
    return (
      <View style={[styles.root, styles.center]}>
        <ThemedText type="labelError">缺少物品 ID</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="body" style={{ color: c.brand }}>
            返回
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={c.brand} />
        <ThemedText type="bodyMuted">載入中…</ThemedText>
      </View>
    );
  }

  if (isError || !item) {
    return (
      <View style={[styles.root, styles.center]}>
        <ThemedText type="labelError" style={{ textAlign: "center" }}>
          {error instanceof Error ? error.message : "無法載入物品"}
        </ThemedText>
        <Pressable
          onPress={() => refetch()}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: c.brand,
          }}
        >
          <Text style={{ color: c.onBrand, fontWeight: "600" }}>重試</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="bodyMuted">返回</ThemedText>
        </Pressable>
      </View>
    );
  }

  const isLost = item.kind === "lost";
  const categoryLabel = inferDisplayCategory(item);
  const description = item.description?.trim() ?? "";
  const location = item.locationText?.trim() ?? "";

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable onPress={() => router.back()} style={styles.closeRow}>
          <IconSymbol name="xmark" size={22} color={c.brand} />
          <Text style={styles.closeLabel}>關閉</Text>
        </Pressable>
        <View
          style={[styles.badge, !isLost && { backgroundColor: c.badgeFound }]}
        >
          <Text style={styles.badgeText}>{isLost ? "遺失" : "尋獲"}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.hero}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.body}>
          <ThemedText type="screenTitle" style={styles.title}>
            {item.title}
          </ThemedText>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <IconSymbol name="tag.fill" size={18} color={c.textMuted} />
              <Text style={styles.metaText}>{categoryLabel}</Text>
            </View>
            <View style={styles.metaItem}>
              <IconSymbol name="clock" size={18} color={c.textMuted} />
              <Text style={styles.metaText}>
                {formatRelativeTimeZh(item.createdAt)}
              </Text>
            </View>
          </View>

          <ThemedText type="screenTitle" style={styles.sectionTitle}>
            描述
          </ThemedText>
          <ThemedText type="body" style={styles.sectionBody}>
            {description || "（無描述）"}
          </ThemedText>

          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <IconSymbol name="mappin.circle.fill" size={22} color={c.brand} />
              <Text style={styles.locationTitle}>地點</Text>
            </View>
            <Text style={styles.locationBody}>{location || "未填地點"}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
