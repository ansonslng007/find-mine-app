import { IconSymbol } from "@/components/ui/icon-symbol";
import { ROUTE_PATH } from "@/constants/routePath";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useAppColors } from "@/hooks/use-app-colors";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function NotificationBellButton() {
  const c = useAppColors();
  const router = useRouter();
  const { data: user } = useAuthUser();
  const { data: unread } = useUnreadNotificationCount();

  const count = unread?.count ?? 0;
  const badgeLabel = count > 99 ? "99+" : String(count);
  const badgeIsWide = badgeLabel.length > 1;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        hit: {
          padding: 8,
          marginRight: -4,
        },
        badge: {
          position: "absolute",
          top: 4,
          right: 2,
          height: 18,
          borderRadius: 9,
          backgroundColor: c.danger,
          alignItems: "center",
          justifyContent: "center",
          minWidth: 18,
          paddingHorizontal: badgeIsWide ? 4 : 0,
          ...(badgeIsWide ? {} : { width: 18 }),
        },
        badgeText: {
          color: "#fff",
          fontSize: 11,
          fontWeight: "700",
          lineHeight: 18,
          height: 18,
          textAlign: "center",
          textAlignVertical: "center",
          includeFontPadding: false,
        },
      }),
    [c.danger, badgeIsWide],
  );

  if (!user) {
    return null;
  }

  return (
    <Pressable
      style={styles.hit}
      onPress={() => router.push(ROUTE_PATH.NOTIFICATIONS)}
      hitSlop={8}
    >
      <IconSymbol name="bell" size={24} color={c.textPrimary} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
