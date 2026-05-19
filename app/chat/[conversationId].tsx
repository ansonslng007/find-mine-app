import { formatRelativeTime } from "@/components/lost-items/format";
import {
  BottomActionSheet,
  type BottomActionSheetItem,
} from "@/components/modal/bottom-action-sheet";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ROUTE_PATH } from "@/constants/routePath";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useAppColors } from "@/hooks/use-app-colors";
import { CHAT_UNREAD_COUNT_QUERY_KEY } from "@/hooks/use-chat-unread-count";
import { setActiveConversationId } from "@/lib/chat/active-conversation";
import type { MessageNewPayload } from "@/lib/chat/message-new-payload";
import {
  deleteConversation,
  getConversation,
  listMessages,
  markConversationRead,
  type ChatMessage,
} from "@/lib/api/chat";
import { useI18n } from "@/providers/i18n-provider";
import { useChatSocket } from "@/providers/chat-socket-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data: user } = useAuthUser();
  const { socket, joinConversation, leaveConversation, subscribeMessageNew } =
    useChatSocket();
  const [draft, setDraft] = useState("");
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

  const convQuery = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation(conversationId as string),
    enabled: typeof conversationId === "string" && conversationId.length > 0,
  });

  const msgQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      listMessages(conversationId as string, { limit: 100 }),
    enabled: typeof conversationId === "string" && conversationId.length > 0,
  });

  const messages = msgQuery.data?.messages ?? [];

  useFocusEffect(
    useCallback(() => {
      if (typeof conversationId !== "string" || conversationId.length === 0) {
        return;
      }
      setActiveConversationId(conversationId);
      void qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
      let cancelled = false;
      void (async () => {
        try {
          await markConversationRead(conversationId);
          if (!cancelled) {
            await qc.invalidateQueries({ queryKey: CHAT_UNREAD_COUNT_QUERY_KEY });
            await qc.invalidateQueries({ queryKey: ["conversations"] });
          }
        } catch {
          // ignore read receipt failures (offline / 401)
        }
      })();
      return () => {
        cancelled = true;
        setActiveConversationId(null);
      };
    }, [conversationId, qc]),
  );

  useEffect(() => {
    if (typeof conversationId !== "string" || conversationId.length === 0) {
      return;
    }
    const sid = conversationId;

    void joinConversation(sid).catch(() => {
      Alert.alert(t("chat.title"), t("chat.joinFailed"));
    });

    return () => {
      leaveConversation(sid);
    };
  }, [conversationId, joinConversation, leaveConversation, t]);

  useEffect(() => {
    if (typeof conversationId !== "string" || conversationId.length === 0) {
      return;
    }
    const sid = conversationId;

    return subscribeMessageNew((payload: MessageNewPayload) => {
      if (payload.conversationId !== sid) {
        return;
      }
      qc.setQueryData(
        ["messages", sid],
        (old: { messages: ChatMessage[] } | undefined) => {
          if (!old) {
            return {
              messages: [
                {
                  id: payload.id,
                  senderId: payload.senderId,
                  body: payload.body,
                  createdAt: payload.createdAt,
                },
              ],
            };
          }
          if (old.messages.some((m) => m.id === payload.id)) {
            return old;
          }
          return {
            messages: [
              {
                id: payload.id,
                senderId: payload.senderId,
                body: payload.body,
                createdAt: payload.createdAt,
              },
              ...old.messages,
            ],
          };
        },
      );
      if (payload.senderId !== user?.id) {
        void markConversationRead(sid).then(() =>
          qc.invalidateQueries({ queryKey: CHAT_UNREAD_COUNT_QUERY_KEY }),
        );
      }
    });
  }, [conversationId, qc, subscribeMessageNew, user?.id]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text || !conversationId) {
      return;
    }
    if (!socket?.connected) {
      Alert.alert(t("chat.title"), t("chat.notConnected"));
      return;
    }
    socket.emit(
      "message:send",
      { conversationId, body: text },
      (err?: string) => {
        if (err) {
          Alert.alert(t("chat.title"), t("chat.sendFailed"));
          return;
        }
        setDraft("");
      },
    );
  }, [conversationId, draft, socket, t]);

  const confirmDeleteConversation = useCallback(() => {
    if (typeof conversationId !== "string" || conversationId.length === 0) {
      return;
    }
    Alert.alert(t("chat.deleteConfirmTitle"), t("chat.deleteConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("chat.delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteConversation(conversationId);
              await qc.invalidateQueries({ queryKey: ["conversations"] });
              await qc.invalidateQueries({
                queryKey: CHAT_UNREAD_COUNT_QUERY_KEY,
              });
              router.back();
            } catch {
              Alert.alert(t("chat.title"), t("chat.deleteFailed"));
            }
          })();
        },
      },
    ]);
  }, [conversationId, qc, router, t]);

  const moreMenuActions = useMemo<BottomActionSheetItem[]>(
    () => [
      {
        key: "delete",
        label: t("chat.delete"),
        destructive: true,
        onPress: confirmDeleteConversation,
      },
    ],
    [confirmDeleteConversation, t],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: c.pageBackground },
        topBar: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingBottom: 10,
          backgroundColor: c.cardBackground,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.borderSubtle,
        },
        topBarSide: {
          width: 44,
          alignItems: "flex-start",
          justifyContent: "center",
        },
        topBarSideRight: {
          width: 44,
          alignItems: "flex-end",
          justifyContent: "center",
        },
        topBarCenter: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          minWidth: 0,
          gap: 2,
        },
        peerName: {
          fontWeight: "700",
          fontSize: 17,
          color: c.textPrimary,
          textAlign: "center",
        },
        peerLastSeen: {
          fontSize: 12,
          fontWeight: "400",
          color: "#4DB6AC",
          textAlign: "center",
        },
        itemStrip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: c.cardBackground,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.borderSubtle,
        },
        itemThumb: {
          width: 56,
          height: 56,
          borderRadius: 10,
          backgroundColor: c.imagePlaceholder,
        },
        itemMid: { flex: 1, minWidth: 0, gap: 4 },
        itemTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        },
        itemTitle: {
          flex: 1,
          fontSize: 16,
          lineHeight: 20,
          fontWeight: "600",
          color: c.textPrimary,
        },
        itemDescription: {
          fontSize: 14,
          color: c.textMuted,
        },
        linkBtn: {
          alignSelf: "flex-start",
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 999,
          backgroundColor: c.brand,
        },
        badge: {
          alignSelf: "center",
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
        },
        badgeText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "700",
          lineHeight: 20,
          includeFontPadding: false,
        },
        bubbleOut: {
          alignSelf: "flex-end",
          maxWidth: "80%",
          backgroundColor: c.brand,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 16,
          marginVertical: 4,
          marginHorizontal: 16,
        },
        bubbleIn: {
          alignSelf: "flex-start",
          maxWidth: "80%",
          backgroundColor: c.cardBackground,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 16,
          marginVertical: 4,
          marginHorizontal: 16,
        },
        inputRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: c.cardBackground,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.borderSubtle,
        },
        input: {
          flex: 1,
          minHeight: 40,
          maxHeight: 120,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 20,
          backgroundColor: c.pageBackground,
          color: c.textPrimary,
          fontSize: 16,
        },
      }),
    [c],
  );

  if (!conversationId) {
    return (
      <View style={[styles.root, { justifyContent: "center", padding: 24 }]}>
        <ThemedText type="labelError">{t("chat.missingConversation")}</ThemedText>
      </View>
    );
  }

  if (convQuery.isPending || msgQuery.isPending) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={c.brand} />
      </View>
    );
  }

  if (convQuery.isError || !convQuery.data) {
    return (
      <View style={[styles.root, { justifyContent: "center", padding: 24, gap: 16 }]}>
        <ThemedText type="labelError" style={{ textAlign: "center" }}>
          {t("chat.loadFailed")}
        </ThemedText>
        <Pressable
          onPress={() => convQuery.refetch()}
          style={[styles.linkBtn, { alignSelf: "center" }]}
        >
          <ThemedText type="body" style={{ color: c.onBrand, fontWeight: "600" }}>
            {t("common.retry")}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const { conversation } = convQuery.data;
  const peerLabel =
    conversation.peer.displayName?.trim() || t("chat.anonymousMember");
  const peerLastSeenLabel =
    conversation.peer.lastSeenAt != null
      ? t("chat.lastSeenOnline", {
          time: formatRelativeTime(conversation.peer.lastSeenAt, t, locale),
        })
      : null;
  const item = conversation.item;
  const isLost = item.kind === "lost";
  const itemDescription = item.description?.trim() ?? "";

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.topBarSide}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <IconSymbol name="chevron.left" size={22} color={c.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.topBarCenter}>
          <ThemedText type="default" style={styles.peerName} numberOfLines={1}>
            {peerLabel}
          </ThemedText>
          {peerLastSeenLabel != null ? (
            <ThemedText type="default" style={styles.peerLastSeen} numberOfLines={1}>
              {peerLastSeenLabel}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.topBarSideRight}>
          <Pressable onPress={() => setMoreMenuVisible(true)} hitSlop={12}>
            <IconSymbol name="ellipsis" size={22} color={c.textPrimary} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() =>
          router.push({
            pathname: ROUTE_PATH.ITEM,
            params: { id: item.id },
          })
        }
        style={styles.itemStrip}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.itemThumb}
          contentFit="cover"
        />
        <View style={styles.itemMid}>
          <View style={styles.itemTitleRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: isLost ? c.badgeLost : c.badgeFound },
              ]}
            >
              <ThemedText type="default" style={styles.badgeText}>
                {isLost ? t("card.badgeLost") : t("card.badgeFound")}
              </ThemedText>
            </View>
            <ThemedText type="default" style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </ThemedText>
          </View>
          {itemDescription.length > 0 ? (
            <ThemedText type="default" style={styles.itemDescription} numberOfLines={1}>
              {itemDescription}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>

      <FlatList
        style={{ flex: 1 }}
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item: m }) => {
          const mine = user?.id === m.senderId;
          return (
            <View style={mine ? styles.bubbleOut : styles.bubbleIn}>
              <ThemedText
                type="default"
                style={{
                  color: mine ? c.onBrand : c.textPrimary,
                  fontSize: 16,
                  lineHeight: 22,
                }}
              >
                {m.body}
              </ThemedText>
              <ThemedText
                type="default"
                style={{
                  fontSize: 11,
                  marginTop: 4,
                  color: mine ? "rgba(255,255,255,0.85)" : c.textMuted,
                }}
              >
                {new Date(m.createdAt).toLocaleString()}
              </ThemedText>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: "center" }}>
            <ThemedText type="bodyMuted">{t("chat.noMessagesYet")}</ThemedText>
          </View>
        }
        contentContainerStyle={{ paddingVertical: 12 }}
      />

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t("chat.inputPlaceholder")}
          placeholderTextColor={c.textMuted}
          multiline
          maxLength={4000}
        />
        <Pressable
          onPress={sendMessage}
          hitSlop={12}
          style={{
            padding: 10,
            borderRadius: 999,
            backgroundColor: c.brand,
          }}
        >
          <IconSymbol name="arrow.up.circle.fill" size={28} color={c.onBrand} />
        </Pressable>
      </View>

      <BottomActionSheet
        visible={moreMenuVisible}
        onClose={() => setMoreMenuVisible(false)}
        actions={moreMenuActions}
      />
    </KeyboardAvoidingView>
  );
}
