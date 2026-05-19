import {
  formatRelativeTime,
  inferItemCategoryId,
} from "@/components/lost-items/format";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { ROUTE_PATH } from "@/constants/routePath";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useDeleteItem } from "@/hooks/use-delete-item";
import { useItem } from "@/hooks/use-items";
import { ApiError } from "@/lib/api/client";
import { createConversation } from "@/lib/api/chat";
import {
  formatItemPlatformTag,
  isFacebookImport,
  ITEM_PLATFORM_TAG_BG,
} from "@/lib/item-platform";
import { useI18n } from "@/providers/i18n-provider";
import { Image } from "expo-image";
import * as ExpoLinking from "expo-linking";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
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
  const { t, locale } = useI18n();
  const { data: authUser } = useAuthUser();
  const { data, isPending, isError, error, refetch } = useItem(id);
  const deleteItemMutation = useDeleteItem();
  const [contactBusy, setContactBusy] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: c.pageBackground,
        },
        heroWrap: {
          position: "relative",
          width: "100%",
        },
        hero: {
          width: "100%",
          aspectRatio: 1,
          backgroundColor: c.imagePlaceholder,
        },
        heroOverlay: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          paddingBottom: 12,
        },
        heroOverlayRight: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        },
        heroIconBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.35)",
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
        contactBtn: {
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 999,
          backgroundColor: c.brand,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 48,
          width: "100%",
        },
        contactBtnLabel: {
          color: c.onBrand,
          fontSize: 16,
          fontWeight: "600",
        },
        contactFooter: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.borderSubtle,
          backgroundColor: c.cardBackground,
          paddingHorizontal: 20,
          paddingTop: 14,
        },
        contactFooterHint: {
          fontSize: 14,
          lineHeight: 21,
          color: c.textMuted,
          textAlign: "center",
        },
        contactFooterOwn: {
          fontSize: 15,
          fontWeight: "600",
          color: c.textMuted,
          textAlign: "center",
          paddingVertical: 12,
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
          backgroundColor: c.badgeLost,
        },
        badgeText: {
          color: "#FFFFFF",
          fontSize: 13,
          fontWeight: "700",
        },
        titleRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        },
        badgePlatform: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: ITEM_PLATFORM_TAG_BG,
        },
        badgePlatformText: {
          color: "#FFFFFF",
          fontSize: 13,
          fontWeight: "600",
        },
      }),
    [c],
  );

  const item = data?.item;

  if (!id) {
    return (
      <View style={[styles.root, styles.center]}>
        <ThemedText type="labelError">{t("detail.missingId")}</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="body" style={{ color: c.brand }}>
            {t("detail.back")}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={c.brand} />
        <ThemedText type="bodyMuted">{t("detail.loading")}</ThemedText>
      </View>
    );
  }

  if (isError || !item) {
    return (
      <View style={[styles.root, styles.center]}>
        <ThemedText type="labelError" style={{ textAlign: "center" }}>
          {error instanceof Error ? error.message : t("detail.loadFailed")}
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
          <Text style={{ color: c.onBrand, fontWeight: "600" }}>
            {t("detail.retry")}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="bodyMuted">{t("detail.back")}</ThemedText>
        </Pressable>
      </View>
    );
  }

  const isLost = item.kind === "lost";
  const categoryId = inferItemCategoryId(item);
  const categoryLabel = t(`categories.${categoryId}`);
  const description = item.description?.trim() ?? "";
  const location = item.locationText?.trim() ?? "";
  const poster = item.postedBy ?? null;
  const sourcePostUrl = item.sourcePostUrl?.trim() || null;
  const platformTag = formatItemPlatformTag(item, t);
  const isFbGroupImport = isFacebookImport(item);
  const isOwnPoster =
    !isFbGroupImport &&
    poster != null &&
    authUser != null &&
    poster.id === authUser.id;
  const canMessagePoster =
    !isFbGroupImport && poster != null && !isOwnPoster;

  const handleOpenSourcePost = async () => {
    if (!sourcePostUrl) return;
    setContactBusy(true);
    try {
      const canOpen = await Linking.canOpenURL(sourcePostUrl);
      if (!canOpen) {
        Alert.alert(
          t("detail.openSourcePostFailedTitle"),
          t("detail.openSourcePostFailedBody"),
        );
        return;
      }
      await Linking.openURL(sourcePostUrl);
    } catch {
      Alert.alert(
        t("detail.openSourcePostFailedTitle"),
        t("detail.openSourcePostFailedBody"),
      );
    } finally {
      setContactBusy(false);
    }
  };

  const handleEditPost = () => {
    if (!item) {
      return;
    }
    router.push({
      pathname: ROUTE_PATH.ITEM_EDIT,
      params: { id: item.id },
    } as unknown as Href);
  };

  const handleDeletePost = () => {
    if (!item) {
      return;
    }
    Alert.alert(t("edit.deleteConfirmTitle"), t("edit.deleteConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("detail.deletePost"),
        style: "destructive",
        onPress: () => {
          deleteItemMutation.mutate(item.id, {
            onSuccess: () => {
              router.replace(
                item.kind === "found" ? "/(tabs)/found" : "/(tabs)",
              );
            },
            onError: (e) => {
              const msg =
                e instanceof ApiError ? e.message : t("edit.deleteFailed");
              Alert.alert(t("edit.deleteConfirmTitle"), msg);
            },
          });
        },
      },
    ]);
  };

  const handleSharePost = async () => {
    const url = ExpoLinking.createURL(`/item/${item.id}`);
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n${url}`,
        url,
      });
    } catch {
      // User dismissed share sheet.
    }
  };

  const handleMoreActions = () => {
    Alert.alert(t("detail.moreActions"), undefined, [
      { text: t("detail.editPost"), onPress: handleEditPost },
      {
        text: t("detail.deletePost"),
        style: "destructive",
        onPress: handleDeletePost,
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const handleContactPoster = async () => {
    if (!poster) {
      return;
    }
    if (!authUser) {
      return;
    }
    setContactBusy(true);
    try {
      const { conversation } = await createConversation({
        peerUserId: poster.id,
        itemId: item.id,
      });
      router.push({
        pathname: "/chat/[conversationId]",
        params: { conversationId: conversation.id },
      } as unknown as Href);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : t("detail.contactFailedBody");
      Alert.alert(t("detail.contactFailedTitle"), msg);
    } finally {
      setContactBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.hero}
            contentFit="cover"
            transition={200}
          />
          <View
            style={[
              styles.heroOverlay,
              { paddingTop: Math.max(insets.top, 8) },
            ]}
          >
            <Pressable
              onPress={() => router.back()}
              style={styles.heroIconBtn}
              hitSlop={8}
            >
              <IconSymbol name="chevron.left" size={22} color="#FFFFFF" />
            </Pressable>
            <View style={styles.heroOverlayRight}>
              <Pressable
                onPress={handleSharePost}
                style={styles.heroIconBtn}
                hitSlop={8}
              >
                <IconSymbol
                  name="square.and.arrow.up"
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>
              {isOwnPoster ? (
                <Pressable
                  onPress={handleMoreActions}
                  style={styles.heroIconBtn}
                  hitSlop={8}
                >
                  <IconSymbol name="ellipsis" size={22} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <ThemedText
              type="screenTitle"
              style={[styles.title, { flex: 1, minWidth: 0 }]}
            >
              {item.title}
            </ThemedText>
            <View
              style={[styles.badge, !isLost && { backgroundColor: c.badgeFound }]}
            >
              <Text style={styles.badgeText}>
                {isLost ? t("card.badgeLost") : t("card.badgeFound")}
              </Text>
            </View>
            {platformTag ? (
              <View style={styles.badgePlatform}>
                <Text style={styles.badgePlatformText}>{platformTag}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <IconSymbol name="tag.fill" size={18} color={c.textMuted} />
              <Text style={styles.metaText}>{categoryLabel}</Text>
            </View>
            <View style={styles.metaItem}>
              <IconSymbol name="clock" size={18} color={c.textMuted} />
              <Text style={styles.metaText}>
                {formatRelativeTime(item.createdAt, t, locale)}
              </Text>
            </View>
          </View>

          <ThemedText type="screenTitle" style={styles.sectionTitle}>
            {t("detail.description")}
          </ThemedText>
          <ThemedText type="body" style={styles.sectionBody}>
            {description || t("common.noDescription")}
          </ThemedText>

          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <IconSymbol name="mappin.circle.fill" size={22} color={c.brand} />
              <Text style={styles.locationTitle}>
                {t("detail.locationSection")}
              </Text>
            </View>
            <Text style={styles.locationBody}>
              {location || t("common.unknownLocation")}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.contactFooter,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        {isFbGroupImport ? (
          <Pressable
            style={styles.contactBtn}
            onPress={handleOpenSourcePost}
            disabled={contactBusy}
          >
            {contactBusy ? (
              <ActivityIndicator color={c.onBrand} />
            ) : (
              <Text style={styles.contactBtnLabel}>
                {t("detail.openSourcePost")}
              </Text>
            )}
          </Pressable>
        ) : null}
        {canMessagePoster ? (
          <Pressable
            style={styles.contactBtn}
            onPress={handleContactPoster}
            disabled={contactBusy}
          >
            {contactBusy ? (
              <ActivityIndicator color={c.onBrand} />
            ) : (
              <Text style={styles.contactBtnLabel}>
                {t("detail.contactPoster")}
              </Text>
            )}
          </Pressable>
        ) : null}
        {!canMessagePoster &&
        !isOwnPoster &&
        !isFbGroupImport &&
        poster == null ? (
          <ThemedText type="bodyMuted" style={styles.contactFooterHint}>
            {t("detail.contactUnavailableLegacy")}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}
