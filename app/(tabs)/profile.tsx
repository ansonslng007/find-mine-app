import { PageLayoutWithHeader } from "@/components/layout/page-layout-with-header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import Constants from "expo-constants";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

type ProfileCardProps = Readonly<{
  title: string;
  subtitle: string;
  left: React.ReactNode;
  onPress?: () => void;
}>;

function ProfileCard({ title, subtitle, left, onPress }: ProfileCardProps) {
  const c = useAppColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: c.cardBackground,
          borderRadius: 16,
          padding: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        },
        textCol: {
          flex: 1,
          marginLeft: 14,
        },
        subtitle: {
          marginTop: 4,
        },
      }),
    [c],
  );

  const content = (
    <View style={styles.card}>
      {left}
      <View style={styles.textCol}>
        <ThemedText type="cardTitle">{title}</ThemedText>
        <ThemedText type="bodyMuted" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const colorScheme = useColorScheme();
  const isLight = colorScheme !== "dark";
  const userIconCircleBg = isLight ? "#DBEAFE" : "#1E3A5F";
  const smallIconCircleBg = isLight ? "#E5E7EB" : c.chipBackground;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          flex: 1,
          backgroundColor: c.pageBackground,
        },
        headerStrip: {
          backgroundColor: c.cardBackground,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.borderSubtle,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
        },
        headerIconWrap: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: c.brand,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        },
        headerTextCol: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 40,
          gap: 12,
        },
        largeUserIcon: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: userIconCircleBg,
          alignItems: "center",
          justifyContent: "center",
        },
        smallIconCircle: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: smallIconCircleBg,
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [c, userIconCircleBg, smallIconCircleBg],
  );

  return (
    <PageLayoutWithHeader
      screenTitle="個人"
      screenSubtitle="你的帳戶"
      icon="shippingbox.fill"
    >
      <ProfileCard
        title="訪客"
        subtitle="登入以追蹤你的通報"
        left={
          <View style={styles.largeUserIcon}>
            <IconSymbol name="person.fill" size={28} color={c.brand} />
          </View>
        }
      />

      <ProfileCard
        title="設定"
        subtitle="應用程式偏好"
        left={
          <View style={styles.smallIconCircle}>
            <IconSymbol name="gearshape.fill" size={24} color={c.textPrimary} />
          </View>
        }
      />

      <ProfileCard
        title="說明與支援"
        subtitle="常見問題與聯絡方式"
        left={
          <View style={styles.smallIconCircle}>
            <IconSymbol
              name="questionmark.circle"
              size={24}
              color={c.textPrimary}
            />
          </View>
        }
      />

      <ProfileCard
        title="關於"
        subtitle={`版本 ${APP_VERSION}`}
        left={
          <View style={styles.smallIconCircle}>
            <IconSymbol name="info.circle" size={24} color={c.textPrimary} />
          </View>
        }
      />
    </PageLayoutWithHeader>
  );
}
