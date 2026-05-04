import { PageLayoutWithHeader } from "@/components/layout/page-layout-with-header";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { useColorSchemePreference } from "@/providers/color-scheme-preference-provider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";

const LANGUAGE_STORAGE_KEY = "@app_language";

type AppLanguage = "zh-Hant" | "en";

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  "zh-Hant": "繁體中文",
  en: "English",
};

export default function SettingsScreen() {
  const router = useRouter();
  const c = useAppColors();
  const { effectiveScheme, setPreference } = useColorSchemePreference();
  const [language, setLanguage] = useState<AppLanguage>("zh-Hant");

  useEffect(() => {
    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((v) => {
      if (v === "zh-Hant" || v === "en") {
        setLanguage(v);
      }
    });
  }, []);

  const persistLanguage = useCallback((next: AppLanguage) => {
    setLanguage(next);
    void AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }, []);

  const openLanguagePicker = useCallback(() => {
    Alert.alert("選擇語言", undefined, [
      {
        text: LANGUAGE_LABELS["zh-Hant"],
        onPress: () => persistLanguage("zh-Hant"),
      },
      {
        text: LANGUAGE_LABELS.en,
        onPress: () => persistLanguage("en"),
      },
      { text: "取消", style: "cancel" },
    ]);
  }, [persistLanguage]);

  const isDarkMode = effectiveScheme === "dark";

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backRow: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        },
        backLabel: {
          fontSize: 16,
          fontWeight: "600",
          color: c.brand,
        },
        sectionLabel: {
          marginTop: 12,
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
    <PageLayoutWithHeader
      screenTitle="設定"
      screenSubtitle="應用程式偏好"
      icon="shippingbox.fill"
    >
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.75 }]}
      >
        <IconSymbol name="chevron.left" size={22} color={c.brand} />
        <ThemedText style={[styles.backLabel, { marginLeft: 4 }]}>返回</ThemedText>
      </Pressable>

      <ThemedText type="caption" style={styles.sectionLabel}>
        外觀
      </ThemedText>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconSquare, styles.iconMoon]}>
            <IconSymbol name="moon.fill" size={22} color={c.onBrand} />
          </View>
          <View style={styles.textCol}>
            <ThemedText type="cardTitle">深色模式</ThemedText>
            <ThemedText type="bodyMuted" style={styles.rowSubtitle}>
              使用深色主題
            </ThemedText>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={(on) => setPreference(on ? "dark" : "light")}
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
            <ThemedText type="cardTitle">語言</ThemedText>
            <ThemedText type="bodyMuted" style={styles.rowSubtitle}>
              {LANGUAGE_LABELS[language]}
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={22} color={c.textMuted} />
        </Pressable>
      </View>
    </PageLayoutWithHeader>
  );
}
