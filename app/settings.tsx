import { SubpageScreenLayout } from "@/components/layout/subpage-screen-layout";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import type { AppLocale } from "@/lib/i18n/types";
import { useColorSchemePreference } from "@/providers/color-scheme-preference-provider";
import { useI18n } from "@/providers/i18n-provider";
import React, { useCallback, useMemo } from "react";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";

function languagePreferenceLabel(
  pref: AppLocale,
  t: (k: string) => string,
): string {
  if (pref === "zh-Hant") {
    return t("settings.langZhHant");
  }
  return t("settings.langEn");
}

export default function SettingsScreen() {
  const c = useAppColors();
  const { t, preference, setPreference: setLanguagePreference } = useI18n();
  const { effectiveScheme, setPreference: setThemePreference } =
    useColorSchemePreference();

  const openLanguagePicker = useCallback(() => {
    Alert.alert(t("settings.languagePickTitle"), undefined, [
      {
        text: t("settings.langZhHant"),
        onPress: () => setLanguagePreference("zh-Hant"),
      },
      {
        text: t("settings.langEn"),
        onPress: () => setLanguagePreference("en"),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }, [setLanguagePreference, t]);

  const isDarkMode = effectiveScheme === "dark";

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sectionLabel: {
          marginTop: 4,
          marginBottom: 8,
          marginLeft: 4,
          letterSpacing: 0.8,
        },
        card: {
          backgroundColor: c.cardBackground,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
          overflow: "hidden",
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
        rowDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: c.borderSubtle,
          marginLeft: 16 + 40 + 14,
        },
        iconSquare: {
          width: 40,
          height: 40,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        },
        iconMoon: {
          backgroundColor: c.brand,
        },
        iconGlobe: {
          backgroundColor: "#EA580C",
        },
        textCol: {
          flex: 1,
          minWidth: 0,
        },
        rowSubtitle: {
          marginTop: 4,
        },
      }),
    [c],
  );

  return (
    <SubpageScreenLayout title={t("settings.title")} useScrollView>
      <ThemedText type="caption" style={styles.sectionLabel}>
        {t("settings.appearance")}
      </ThemedText>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconSquare, styles.iconMoon]}>
            <IconSymbol name="moon.fill" size={22} color={c.onBrand} />
          </View>
          <View style={styles.textCol}>
            <ThemedText type="cardTitle">{t("settings.darkMode")}</ThemedText>
            <ThemedText type="bodyMuted" style={styles.rowSubtitle}>
              {t("settings.darkModeHint")}
            </ThemedText>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={(on) => setThemePreference(on ? "dark" : "light")}
            trackColor={{ false: c.chipBackground, true: c.brand }}
            thumbColor={c.cardBackground}
          />
        </View>

        <View style={styles.rowDivider} />

        <Pressable
          onPress={openLanguagePicker}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        >
          <View style={[styles.iconSquare, styles.iconGlobe]}>
            <IconSymbol name="globe" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.textCol}>
            <ThemedText type="cardTitle">{t("settings.language")}</ThemedText>
            <ThemedText type="bodyMuted" style={styles.rowSubtitle}>
              {languagePreferenceLabel(preference, t)}
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={22} color={c.textMuted} />
        </Pressable>
      </View>
    </SubpageScreenLayout>
  );
}
