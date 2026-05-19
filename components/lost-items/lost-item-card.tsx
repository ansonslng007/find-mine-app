import {
  ONE_HOUR_MS,
  formatRelativeTime,
  hasDisplayableReward,
  ITEM_REWARD_TAG_BG,
  ITEM_REWARD_TAG_TEXT_COLOR,
  truncate,
} from "@/components/lost-items/format";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ROUTE_PATH } from "@/constants/routePath";
import { useAppColors } from "@/hooks/use-app-colors";
import { useI18n } from "@/providers/i18n-provider";
import type { Item } from "@/lib/api/items";
import {
  formatItemPlatformTag,
  ITEM_PLATFORM_TAG_BG,
} from "@/lib/item-platform";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = Readonly<{ item: Item }>;

export function LostItemCard({ item }: Props) {
  const router = useRouter();
  const c = useAppColors();
  const { t, locale } = useI18n();
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
        badgePlatform: {
          backgroundColor: ITEM_PLATFORM_TAG_BG,
        },
        badgePlatformText: {
          color: "#FFFFFF",
          fontSize: 11,
          fontWeight: "600",
        },
        badgeReward: {
          backgroundColor: ITEM_REWARD_TAG_BG,
        },
        badgeRewardText: {
          color: ITEM_REWARD_TAG_TEXT_COLOR,
          fontSize: 11,
          fontWeight: "600",
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
    [c],
  );

  const desc = item.description ?? "";
  const loc = item.locationText ?? t("common.unknownLocation");
  const platformTag = formatItemPlatformTag(item, t);
  const showReward = hasDisplayableReward(item);
  const showTime =
    Date.now() - new Date(item.createdAt).getTime() < ONE_HOUR_MS;

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: ROUTE_PATH.ITEM, params: { id: item.id } })
      }
    >
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
            {showReward ? (
              <View style={[styles.badge, styles.badgeReward]}>
                <Text style={styles.badgeRewardText}>{t("detail.reward")}</Text>
              </View>
            ) : null}
            {platformTag ? (
              <View style={[styles.badge, styles.badgePlatform]}>
                <Text style={styles.badgePlatformText}>{platformTag}</Text>
              </View>
            ) : null}
          </View>
          <ThemedText
            type="bodyMuted"
            numberOfLines={2}
            style={{ marginBottom: 6 }}
          >
            {desc ? truncate(desc, 72) : t("common.noDescription")}
          </ThemedText>
          <View style={styles.metaRow}>
            <View style={styles.locRow}>
              <IconSymbol
                name="mappin.circle.fill"
                size={14}
                color={c.textMuted}
              />
              <ThemedText
                type="caption"
                style={styles.locText}
                numberOfLines={1}
              >
                {loc}
              </ThemedText>
            </View>
            {showTime ? (
              <View style={styles.timeRow}>
                <IconSymbol name="clock" size={14} color={c.textMuted} />
                <ThemedText type="caption">
                  {formatRelativeTime(item.createdAt, t, locale)}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
