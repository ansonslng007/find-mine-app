import { formatNotificationTime } from "@/components/notifications/format-notification-time";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ROUTE_PATH } from "@/constants/routePath";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from "@/hooks/use-notifications";
import { useAppColors } from "@/hooks/use-app-colors";
import type { ItemMatchNotification } from "@/lib/api/notifications";
import { useI18n } from "@/providers/i18n-provider";
import { Image } from "expo-image";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function notificationMessage(
  n: ItemMatchNotification,
  t: (key: string, vars?: Record<string, string>) => string,
): string {
  const targetKind = n.targetItem.kind;
  if (n.role === "source") {
    const peer =
      targetKind === "found"
        ? t("notifications.kindFound")
        : t("notifications.kindLost");
    return t("notifications.messageSource", { peer });
  }
  const newKind =
    targetKind === "lost"
      ? t("notifications.kindLost")
      : t("notifications.kindFound");
  return t("notifications.messageMatched", { kind: newKind });
}

type NotificationRowProps = Readonly<{
  item: ItemMatchNotification;
  onPress: (item: ItemMatchNotification) => void;
}>;

function NotificationRow({ item, onPress }: NotificationRowProps) {
  const c = useAppColors();
  const { t, locale } = useI18n();
  const isUnread = item.readAt == null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "flex-start",
          paddingVertical: 14,
          paddingHorizontal: 16,
          gap: 10,
        },
        dotCol: {
          width: 10,
          paddingTop: 18,
        },
        unreadDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: c.brand,
        },
        thumb: {
          width: 48,
          height: 48,
          borderRadius: 8,
          backgroundColor: c.imagePlaceholder,
        },
        body: {
          flex: 1,
          gap: 4,
        },
        titleLine: {
          lineHeight: 20,
        },
        quoteTitle: {
          color: c.textMuted,
        },
        time: {
          marginTop: 2,
        },
      }),
    [c],
  );

  return (
    <Pressable
      style={styles.row}
      onPress={() => onPress(item)}
    >
      <View style={styles.dotCol}>
        {isUnread ? <View style={styles.unreadDot} /> : null}
      </View>
      <Image
        source={{ uri: item.targetItem.imageUrl }}
        style={styles.thumb}
        contentFit="cover"
      />
      <View style={styles.body}>
        <ThemedText type="body" style={styles.titleLine}>
          {notificationMessage(item, t)}
        </ThemedText>
        <ThemedText
          type="bodyMuted"
          style={styles.quoteTitle}
          numberOfLines={2}
        >
          「{item.targetItem.title}」
        </ThemedText>
        <ThemedText type="caption" style={styles.time}>
          {formatNotificationTime(item.createdAt, locale)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function NotificationsEmpty() {
  const { t } = useI18n();
  const c = useAppColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        box: {
          alignItems: "center",
          paddingVertical: 48,
          gap: 8,
        },
      }),
    [],
  );
  return (
    <View style={styles.box}>
      <ThemedText type="bodyMuted">{t("notifications.empty")}</ThemedText>
    </View>
  );
}

export default function NotificationsScreen() {
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { data, isPending, isError, refetch, isRefetching } =
    useNotificationsList();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  const [permDenied, setPermDenied] = useState(false);

  React.useEffect(() => {
    void Notifications.getPermissionsAsync().then(({ status }) => {
      setPermDenied(status !== "granted");
    });
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: c.pageBackground,
        },
        header: {
          paddingHorizontal: 8,
          paddingBottom: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.borderSubtle,
          backgroundColor: c.pageBackground,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
        },
        backBtn: {
          padding: 8,
        },
        title: {
          flex: 1,
          textAlign: "center",
          fontSize: 18,
          fontWeight: "700",
        },
        markAll: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          minWidth: 72,
          alignItems: "flex-end",
        },
        markAllText: {
          color: c.brand,
          fontSize: 15,
          fontWeight: "600",
        },
        banner: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: c.chipBackground,
          gap: 8,
        },
        bannerText: {
          flex: 1,
          fontSize: 13,
        },
        separator: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: c.borderSubtle,
          marginLeft: 16 + 10 + 48 + 10,
        },
        errorBox: {
          padding: 24,
          alignItems: "center",
          gap: 12,
        },
      }),
    [c],
  );

  const handlePressRow = useCallback(
    (item: ItemMatchNotification) => {
      if (item.readAt == null) {
        markOne.mutate(item.id);
      }
      router.push({
        pathname: ROUTE_PATH.ITEM,
        params: { id: item.targetItem.id },
      });
    },
    [markOne, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: ItemMatchNotification }) => (
      <NotificationRow item={item} onPress={handlePressRow} />
    ),
    [handlePressRow],
  );

  const list = data?.notifications ?? [];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <IconSymbol name="chevron.left" size={24} color={c.textPrimary} />
          </Pressable>
          <ThemedText type="screenTitle" style={styles.title}>
            {t("notifications.title")}
          </ThemedText>
          <Pressable
            style={styles.markAll}
            onPress={() => markAll.mutate()}
            disabled={markAll.isPending}
          >
            <ThemedText style={styles.markAllText}>
              {t("notifications.markAllRead")}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {permDenied ? (
        <Pressable
          style={styles.banner}
          onPress={() => void Linking.openSettings()}
        >
          <ThemedText type="bodyMuted" style={styles.bannerText}>
            {t("notifications.permissionBanner")}
          </ThemedText>
          <IconSymbol name="chevron.right" size={18} color={c.textMuted} />
        </Pressable>
      ) : null}

      {isPending ? (
        <View style={styles.errorBox}>
          <ActivityIndicator size="large" color={c.brand} />
        </View>
      ) : null}

      {isError ? (
        <View style={styles.errorBox}>
          <ThemedText type="labelError">{t("notifications.loadFailed")}</ThemedText>
          <Pressable onPress={() => void refetch()}>
            <ThemedText style={{ color: c.brand }}>{t("common.retry")}</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {!isPending && !isError ? (
        <FlatList
          data={list}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={NotificationsEmpty}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24,
            flexGrow: list.length === 0 ? 1 : undefined,
          }}
        />
      ) : null}
    </View>
  );
}
