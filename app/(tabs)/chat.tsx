import { PageLayoutWithHeader } from "@/components/layout/page-layout-with-header";
import { ThemedText } from "@/components/themed-text";
import { truncate } from "@/components/lost-items/format";
import { useAuthUser } from "@/hooks/use-auth-user";
import { ApiError } from "@/lib/api/client";
import {
  listConversations,
  type ConversationListEntry,
} from "@/lib/api/chat";
import { useAppColors } from "@/hooks/use-app-colors";
import { useI18n } from "@/providers/i18n-provider";
import { CHAT_UNREAD_COUNT_QUERY_KEY } from "@/hooks/use-chat-unread-count";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { type Href, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

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
}: Readonly<{
  entry: ConversationListEntry;
  onPress: () => void;
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
      }),
    [c],
  );

  const peerLabel =
    entry.peer.displayName?.trim() || t("chat.anonymousMember");
  const timeIso = entry.lastMessage?.at;
  const timeLabel = timeIso
    ? new Date(timeIso).toLocaleString(locale === "zh-Hant" ? "zh-TW" : "en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Image
        source={{ uri: entry.item.imageUrl }}
        style={styles.thumb}
        contentFit="cover"
      />
      <View style={styles.mid}>
        <ThemedText type="default" style={styles.peer} numberOfLines={1}>
          {peerLabel}
        </ThemedText>
        <ThemedText type="default" style={styles.title} numberOfLines={1}>
          {truncate(entry.item.title, 42)}
        </ThemedText>
        <ThemedText type="default" style={styles.sub} numberOfLines={2}>
          {entry.lastMessage?.body ?? t("chat.noMessagesYet")}
        </ThemedText>
      </View>
      {timeLabel ? (
        <ThemedText type="default" style={{ color: c.textMuted, fontSize: 13 }}>
          {timeLabel}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

export default function ChatTabScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const c = useAppColors();
  const qc = useQueryClient();
  const { data: user, isPending: authPending } = useAuthUser();

  useFocusEffect(
    useCallback(() => {
      if (user != null) {
        void qc.invalidateQueries({ queryKey: CHAT_UNREAD_COUNT_QUERY_KEY });
      }
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
        style={{ flex: 1 }}
        data={q.data.conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            entry={item}
            onPress={() =>
              router.push({
                pathname: "/chat/[conversationId]",
                params: { conversationId: item.id },
              } as unknown as Href)
            }
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
