import { LostItemForm } from "@/components/lost-item-form";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useItem } from "@/hooks/use-items";
import { isFacebookImport } from "@/lib/item-platform";
import { useI18n } from "@/providers/i18n-provider";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ItemEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { data: authUser, isPending: authPending } = useAuthUser();
  const { data, isPending, isError, error, refetch } = useItem(id);
  const blockedRef = useRef(false);

  const item = data?.item;
  const isOwnPoster =
    item != null &&
    authUser != null &&
    !isFacebookImport(item) &&
    item.postedBy?.id === authUser.id;

  useEffect(() => {
    if (blockedRef.current || isPending || authPending) {
      return;
    }
    if (!item || !authUser) {
      return;
    }
    if (!isOwnPoster) {
      blockedRef.current = true;
      Alert.alert(t("edit.forbidden"), "", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [isPending, authPending, item, authUser, isOwnPoster, router, t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        center: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: c.pageBackground,
        },
        retryBtn: {
          marginTop: 16,
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 10,
          backgroundColor: c.brand,
        },
        backRow: {
          position: "absolute",
          left: 16,
          flexDirection: "row",
          alignItems: "center",
          zIndex: 1,
        },
        backLabel: {
          fontSize: 16,
          marginLeft: 4,
          color: c.brand,
        },
      }),
    [c],
  );

  const backRowStyle = [styles.backRow, { top: insets.top + 12 }];

  const backControl = (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [
        backRowStyle,
        pressed ? { opacity: 0.75 } : null,
      ]}
    >
      <IconSymbol name="chevron.left" size={22} color={c.brand} />
      <ThemedText style={styles.backLabel}>{t("detail.back")}</ThemedText>
    </Pressable>
  );

  if (!id) {
    return (
      <View style={styles.center}>
        {backControl}
        <ThemedText>{t("detail.missingId")}</ThemedText>
      </View>
    );
  }

  if (isPending || authPending) {
    return (
      <View style={styles.center}>
        {backControl}
        <ActivityIndicator size="large" color={c.brand} />
        <ThemedText type="bodyMuted" style={{ marginTop: 12 }}>
          {t("edit.loading")}
        </ThemedText>
      </View>
    );
  }

  if (isError || !item) {
    const message =
      error instanceof Error ? error.message : t("edit.loadFailed");
    return (
      <View style={styles.center}>
        {backControl}
        <ThemedText>{message}</ThemedText>
        <Pressable style={styles.retryBtn} onPress={() => refetch()}>
          <ThemedText style={{ color: c.onBrand }}>{t("detail.retry")}</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!isOwnPoster) {
    return (
      <View style={styles.center}>
        {backControl}
        <ActivityIndicator size="large" color={c.brand} />
      </View>
    );
  }

  return (
    <LostItemForm mode="edit" itemId={id} initialItem={item} />
  );
}
