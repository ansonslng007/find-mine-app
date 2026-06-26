import {
  ONE_HOUR_MS,
  formatRelativeTime,
  hasDisplayableReward,
  ITEM_REWARD_TAG_BG,
  ITEM_REWARD_TAG_TEXT_COLOR,
  formatOccurredAt,
  inferItemCategoryId,
  truncate,
} from "@/components/lost-items/format";
import { ThemedText } from "@/components/themed-text";
import { AppCard } from "@/components/ui/app-card";
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
          padding: 12,
        },
        imageWrap: {
          position: "relative",
        },
        thumb: {
          width: 104,
          height: 104,
          borderRadius: 8,
          backgroundColor: c.imagePlaceholder,
        },
        kindPill: {
          bottom: 6,
          left: 6,
          paddingHorizontal: 8,
          paddingVertical: 4,
          position: "absolute",
          borderRadius: 6,
        },
        kindPillText: {
          color: "#FFFFFF",
          fontSize: 11,
          fontWeight: "800",
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
        tagRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 6,
        },
        badge: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
        },
        badgeCategory: {
          backgroundColor: c.chipBackground,
        },
        badgeCategoryText: {
          color: c.textPrimary,
          fontSize: 11,
          fontWeight: "700",
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
          flexWrap: "wrap",
          gap: 10,
        },
        metaChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          maxWidth: "100%",
        },
        locRow: {
          flex: 1,
          minWidth: 0,
        },
        locText: {
          fontSize: 13,
          lineHeight: 18,
        },
      }),
    [c],
  );

  const desc = item.description ?? "";
  const loc = item.locationText ?? t("common.unknownLocation");
  const platformTag = formatItemPlatformTag(item, t);
  const categoryLabel = t(`categories.${inferItemCategoryId(item)}`);
  const occurredAt = formatOccurredAt(item.occurredAt, locale);
  const showReward = hasDisplayableReward(item);
  const showTime =
    Date.now() - new Date(item.createdAt).getTime() < ONE_HOUR_MS;

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: ROUTE_PATH.ITEM, params: { id: item.id } })
      }
    >
      <AppCard style={styles.card}>
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
          />
          <View
            style={[
              styles.kindPill,
              {
                backgroundColor:
                  item.kind === "lost" ? c.badgeLost : c.badgeFound,
              },
            ]}
          >
            <Text style={styles.kindPillText}>
              {item.kind === "lost" ? t("card.badgeLost") : t("card.badgeFound")}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <ThemedText type="cardTitle" style={{ flex: 1 }} numberOfLines={1}>
              {item.title}
            </ThemedText>
          </View>
          <View style={styles.tagRow}>
            <View style={[styles.badge, styles.badgeCategory]}>
              <Text style={styles.badgeCategoryText}>{categoryLabel}</Text>
            </View>
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
            <View style={[styles.metaChip, styles.locRow]}>
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
            {occurredAt ? (
              <View style={styles.metaChip}>
                <IconSymbol name="calendar" size={14} color={c.textMuted} />
                <ThemedText type="caption">{occurredAt}</ThemedText>
              </View>
            ) : null}
            {showTime ? (
              <View style={styles.metaChip}>
                <IconSymbol name="clock" size={14} color={c.textMuted} />
                <ThemedText type="caption">
                  {formatRelativeTime(item.createdAt, t, locale)}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </AppCard>
    </Pressable>
  );
}
