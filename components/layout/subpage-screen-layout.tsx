import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type SubpageScreenLayoutProps = Readonly<{
  title: string;
  children: React.ReactNode;
  /** Slot below title row (e.g. segmented tabs). */
  headerFooter?: React.ReactNode;
  onBack?: () => void;
  useScrollView?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function SubpageScreenLayout({
  title,
  children,
  headerFooter,
  onBack,
  useScrollView = false,
  contentContainerStyle,
}: SubpageScreenLayoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useAppColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: c.pageBackground,
        },
        header: {
          paddingHorizontal: 16,
          paddingBottom: 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.borderSubtle,
          backgroundColor: c.pageBackground,
        },
        topRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: headerFooter ? 0 : 4,
        },
        backBtn: {
          padding: 4,
          marginLeft: -4,
        },
        title: {
          flex: 1,
          fontSize: 18,
          fontWeight: "700",
        },
        content: {
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 12,
        },
        scrollContent: {
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 12,
          gap: 12,
        },
      }),
    [c, headerFooter],
  );

  const handleBack = onBack ?? (() => router.back());

  const body = useScrollView ? (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + 24 },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        { paddingBottom: insets.bottom },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.topRow}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={12}>
            <IconSymbol name="chevron.left" size={24} color={c.textPrimary} />
          </Pressable>
          <ThemedText type="screenTitle" style={styles.title}>
            {title}
          </ThemedText>
        </View>
        {headerFooter}
      </View>
      {body}
    </View>
  );
}
