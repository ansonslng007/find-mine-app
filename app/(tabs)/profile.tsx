import { PageLayoutWithHeader } from "@/components/layout/page-layout-with-header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ROUTE_PATH } from "@/constants/routePath";
import { useAppColors } from "@/hooks/use-app-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useI18n } from "@/providers/i18n-provider";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

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
  const router = useRouter();
  const c = useAppColors();
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const isLight = colorScheme !== "dark";
  const userIconCircleBg = isLight ? "#DBEAFE" : "#1E3A5F";
  const smallIconCircleBg = isLight ? "#E5E7EB" : c.chipBackground;

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
    [userIconCircleBg, smallIconCircleBg],
  );

  return (
    <PageLayoutWithHeader
      screenTitle={t("profile.title")}
      screenSubtitle={t("profile.subtitle")}
      icon="shippingbox.fill"
    >
      <ProfileCard
        title={t("profile.guestTitle")}
        subtitle={t("profile.guestSubtitle")}
        left={
          <View style={styles.largeUserIcon}>
            <IconSymbol name="person.fill" size={28} color={c.brand} />
          </View>
        }
      />

      <ProfileCard
        title={t("profile.settingsTitle")}
        subtitle={t("profile.settingsSubtitle")}
        onPress={() => router.push(ROUTE_PATH.SETTINGS)}
        left={
          <View style={styles.smallIconCircle}>
            <IconSymbol name="gearshape.fill" size={24} color={c.textPrimary} />
          </View>
        }
      />

      <ProfileCard
        title={t("profile.helpTitle")}
        subtitle={t("profile.helpSubtitle")}
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
        title={t("profile.aboutTitle")}
        subtitle={t("profile.aboutVersion", { version: APP_VERSION })}
        left={
          <View style={styles.smallIconCircle}>
            <IconSymbol name="info.circle" size={24} color={c.textPrimary} />
          </View>
        }
      />
    </PageLayoutWithHeader>
  );
}
