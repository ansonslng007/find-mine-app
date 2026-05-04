import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import {
  ONE_HOUR_MS,
  formatRelativeTimeZh,
  truncate,
} from "@/components/lost-items/format";
import type { Item } from "@/lib/api/items";
import { useAppColors } from "@/hooks/use-app-colors";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = Readonly<{ item: Item }>;

export function LostItemCard({ item }: Props) {
  const c = useAppColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          backgroundColor: c.cardBackground,
          borderRadius: 16,
          padding: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        },
        thumb: {
          width: 88,
          height: 88,
          borderRadius: 12,
          backgroundColor: c.imagePlaceholder,
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
        badge: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
        },
        badgeLost: {
          backgroundColor: c.badgeLost,
        },
        badgeFound: {
          backgroundColor: c.badgeFound,
        },
        badgeText: {
          color: c.onBrand,
          fontSize: 11,
          fontWeight: "700",
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
          lineHeight: 18,
        },
        timeRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
        },
      }),
    [c]
  );

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
          <ThemedText type="cardTitle" style={{ flex: 1 }} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <View
            style={[
              styles.badge,
              isLost ? styles.badgeLost : styles.badgeFound,
            ]}
          >
            <Text style={styles.badgeText}>
              {isLost ? "遺失" : "尋獲"}
            </Text>
          </View>
        </View>
        <ThemedText type="bodyMuted" numberOfLines={2} style={{ marginBottom: 6 }}>
          {desc ? truncate(desc, 72) : "（無描述）"}
        </ThemedText>
        <View style={styles.metaRow}>
          <View style={styles.locRow}>
            <IconSymbol
              name="mappin.circle.fill"
              size={14}
              color={c.textMuted}
            />
            <ThemedText type="caption" style={styles.locText} numberOfLines={1}>
              {loc}
            </ThemedText>
          </View>
          {showTime ? (
            <View style={styles.timeRow}>
              <IconSymbol name="clock" size={14} color={c.textMuted} />
              <ThemedText type="caption">
                {formatRelativeTimeZh(item.createdAt)}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
