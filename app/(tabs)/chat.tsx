import { PageLayoutWithHeader } from "@/components/layout/page-layout-with-header";
import { ThemedText } from "@/components/themed-text";
import { truncate } from "@/components/lost-items/format";
import { useAuthUser } from "@/hooks/use-auth-user";
import { ApiError } from "@/lib/api/client";
import {
  deleteConversation,
  listConversations,
  type ConversationListEntry,
} from "@/lib/api/chat";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import type { AppLocale } from "@/lib/i18n/types";
import { useI18n } from "@/providers/i18n-provider";
import { setChatTabFocused } from "@/lib/chat/chat-ui-focus";
import { CHAT_UNREAD_COUNT_QUERY_KEY } from "@/hooks/use-chat-unread-count";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { type Href, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

type SwipeableRef = React.ElementRef<typeof Swipeable>;

const CHAT_UNREAD_ACCENT = "#25D366";
const CHAT_DELETE_ACTION_WIDTH = 80;
const CHAT_DELETE_RED = "#E53935";

function formatChatListTime(iso: string, locale: AppLocale): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(locale === "zh-Hant" ? "zh-TW" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays < 7) {
    return d.toLocaleDateString(locale === "zh-Hant" ? "zh-TW" : "en-US", {
      weekday: "short",
    });
  }
  return d.toLocaleDateString(locale === "zh-Hant" ? "zh-TW" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
}

function ChatListError({
  message,
  onRetry,
  brandColor,
}: Readonly<{
  message: string;
  onRetry: () => void;
  brandColor: string;
}>) {
  const { t } = useI18n();
  const c = useAppColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        box: { alignItems: "center", gap: 12, paddingVertical: 32 },
        retry: {
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: brandColor,
        },
      }),
    [brandColor],
  );
  return (
    <View style={styles.box}>
      <ThemedText type="labelError" style={{ textAlign: "center" }}>
        {message}
      </ThemedText>
      <Pressable onPress={onRetry} style={styles.retry}>
        <ThemedText type="body" style={{ color: c.onBrand, fontWeight: "600" }}>
          {t("common.retry")}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function ChatListEmpty() {
  const { t } = useI18n();
  return (
    <View style={{ paddingVertical: 48, alignItems: "center" }}>
      <ThemedText type="bodyMuted" style={{ textAlign: "center" }}>
        {t("chat.listEmpty")}
      </ThemedText>
    </View>
  );
}

function ConversationRow({
  entry,
  onPress,
  rowBackgroundColor,
}: Readonly<{
  entry: ConversationListEntry;
  onPress: () => void;
  rowBackgroundColor: string;
}>) {
  const c = useAppColors();
  const { t, locale } = useI18n();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 12,
          paddingLeft: 16,
          backgroundColor: rowBackgroundColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.borderSubtle,
        },
        thumb: {
          width: 52,
          height: 52,
          borderRadius: 10,
          backgroundColor: c.imagePlaceholder,
        },
        mid: { flex: 1, gap: 4, minWidth: 0 },
        title: { fontWeight: "700", color: c.textPrimary },
        sub: { color: c.textMuted, fontSize: 14 },
        peer: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
        meta: {
          alignItems: "flex-end",
          gap: 6,
          minWidth: 48,
          paddingRight: 16,
        },
        time: { fontSize: 13, color: c.textMuted },
        timeUnread: { color: CHAT_UNREAD_ACCENT, fontWeight: "600" },
        badge: {
          minWidth: 22,
          height: 22,
          borderRadius: 11,
          paddingHorizontal: 5,
          backgroundColor: CHAT_UNREAD_ACCENT,
          alignItems: "center",
          justifyContent: "center",
        },
        badgeText: {
          color: "#FFFFFF",
          fontSize: 12,
          fontWeight: "700",
          lineHeight: 22,
          height: 22,
          minWidth: 12,
          textAlign: "center",
          textAlignVertical: "center",
          includeFontPadding: false,
        },
      }),
    [c, rowBackgroundColor],
  );

  const peerLabel =
    entry.peer.displayName?.trim() || t("chat.anonymousMember");
  const unreadCount = entry.unreadCount ?? 0;
  const hasUnread = unreadCount > 0;
  const timeIso = entry.lastMessage?.at;
  const timeLabel = timeIso ? formatChatListTime(timeIso, locale) : "";
  const unreadBadgeLabel =
    unreadCount > 99 ? "99+" : String(unreadCount);
  const itemTitle = entry.item
    ? truncate(entry.item.title, 42)
    : t("chat.itemDeleted");
  const lastMessagePreview =
    entry.lastMessage?.type === "voice"
      ? t("chat.voiceMessageList")
      : entry.lastMessage?.body ?? t("chat.noMessagesYet");

  return (
    <Pressable onPress={onPress} style={styles.row}>
      {entry.item ? (
        <Image
          source={{ uri: entry.item.imageUrl }}
          style={styles.thumb}
          contentFit="cover"
        />
      ) : (
        <View style={styles.thumb} />
      )}
      <View style={styles.mid}>
        <ThemedText type="default" style={styles.peer} numberOfLines={1}>
          {peerLabel}
        </ThemedText>
        <ThemedText type="default" style={styles.title} numberOfLines={1}>
          {itemTitle}
        </ThemedText>
        <ThemedText type="default" style={styles.sub} numberOfLines={2}>
          {lastMessagePreview}
        </ThemedText>
      </View>
      {timeLabel || hasUnread ? (
        <View style={styles.meta}>
          {timeLabel ? (
            <ThemedText
              type="default"
              style={hasUnread ? [styles.time, styles.timeUnread] : styles.time}
            >
              {timeLabel}
            </ThemedText>
          ) : null}
          {hasUnread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadBadgeLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function SwipeableConversationRow({
  entry,
  onPress,
  onDeletePress,
  onSwipeableWillOpen,
  rowBackgroundColor,
}: Readonly<{
  entry: ConversationListEntry;
  onPress: () => void;
  onDeletePress: () => void;
  onSwipeableWillOpen: (ref: SwipeableRef) => void;
  rowBackgroundColor: string;
}>) {
  const { t } = useI18n();
  const swipeRef = useRef<SwipeableRef>(null);

  const renderRightActions = useCallback(() => {
    return (
      <Pressable
        onPress={() => {
          swipeRef.current?.close();
          onDeletePress();
        }}
        style={{
          width: CHAT_DELETE_ACTION_WIDTH,
          backgroundColor: CHAT_DELETE_RED,
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        <IconSymbol name="trash.fill" size={22} color="#FFFFFF" />
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: "600",
            lineHeight: 16,
            includeFontPadding: false,
          }}
        >
          {t("chat.delete")}
        </Text>
      </Pressable>
    );
  }, [onDeletePress, t]);

  return (
    <Swipeable
      ref={swipeRef}
      containerStyle={{ backgroundColor: rowBackgroundColor }}
      childrenContainerStyle={{ backgroundColor: rowBackgroundColor }}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      onSwipeableWillOpen={() => {
        if (swipeRef.current) {
          onSwipeableWillOpen(swipeRef.current);
        }
      }}
    >
      <ConversationRow
        entry={entry}
        onPress={onPress}
        rowBackgroundColor={rowBackgroundColor}
      />
    </Swipeable>
  );
}

export default function ChatTabScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const c = useAppColors();
  const qc = useQueryClient();
  const { data: user, isPending: authPending } = useAuthUser();
  const openSwipeRef = useRef<SwipeableRef | null>(null);

  const closeOpenSwipe = useCallback(() => {
    openSwipeRef.current?.close();
    openSwipeRef.current = null;
  }, []);

  const handleSwipeableWillOpen = useCallback((ref: SwipeableRef) => {
    if (openSwipeRef.current && openSwipeRef.current !== ref) {
      openSwipeRef.current.close();
    }
    openSwipeRef.current = ref;
  }, []);

  const confirmDeleteConversation = useCallback(
    (conversationId: string) => {
      Alert.alert(t("chat.deleteConfirmTitle"), t("chat.deleteConfirmBody"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("chat.delete"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteConversation(conversationId);
                closeOpenSwipe();
                await qc.invalidateQueries({ queryKey: ["conversations"] });
                await qc.invalidateQueries({
                  queryKey: CHAT_UNREAD_COUNT_QUERY_KEY,
                });
              } catch {
                Alert.alert(t("chat.title"), t("chat.deleteFailed"));
              }
            })();
          },
        },
      ]);
    },
    [closeOpenSwipe, qc, t],
  );

  useFocusEffect(
    useCallback(() => {
      setChatTabFocused(true);
      if (user != null) {
        void qc.invalidateQueries({ queryKey: CHAT_UNREAD_COUNT_QUERY_KEY });
        void qc.invalidateQueries({ queryKey: ["conversations"] });
      }
      return () => {
        setChatTabFocused(false);
      };
    }, [qc, user]),
  );

  const q = useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
    enabled: user != null,
  });

  let body: React.ReactNode;
  if (authPending) {
    body = (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={c.brand} />
      </View>
    );
  } else if (q.isPending) {
    body = (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={c.brand} />
        <ThemedText type="bodyMuted" style={{ marginTop: 12 }}>
          {t("chat.loading")}
        </ThemedText>
      </View>
    );
  } else if (q.isError) {
    let msg: string;
    if (q.error instanceof ApiError) {
      msg = q.error.message;
    } else if (q.error instanceof Error) {
      msg = q.error.message;
    } else {
      msg = t("chat.loadFailed");
    }
    body = (
      <ChatListError
        message={msg}
        brandColor={c.brand}
        onRetry={() => q.refetch()}
      />
    );
  } else if (!q.data?.conversations.length) {
    body = <ChatListEmpty />;
  } else {
    body = (
      <FlatList
        style={{
          flex: 1,
          backgroundColor: c.pageBackground,
          marginHorizontal: -16,
        }}
        data={q.data.conversations}
        keyExtractor={(item) => item.id}
        onScrollBeginDrag={closeOpenSwipe}
        renderItem={({ item }) => (
          <SwipeableConversationRow
            entry={item}
            rowBackgroundColor={c.pageBackground}
            onPress={() =>
              router.push({
                pathname: "/chat/[conversationId]",
                params: { conversationId: item.id },
              } as unknown as Href)
            }
            onDeletePress={() => confirmDeleteConversation(item.id)}
            onSwipeableWillOpen={handleSwipeableWillOpen}
          />
        )}
        scrollEnabled
      />
    );
  }

  return (
    <PageLayoutWithHeader
      screenTitle={t("chat.title")}
      screenSubtitle={t("chat.subtitle")}
      icon="bubble.left.and.bubble.right"
      useScrollView={false}
    >
      <View style={{ flex: 1 }}>{body}</View>
    </PageLayoutWithHeader>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 24,
  },
});
