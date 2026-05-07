import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import type { ComponentProps } from "react";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AppHeaderProps = Readonly<{
  screenTitle: string;
  screenSubtitle: string;
  icon: ComponentProps<typeof IconSymbol>["name"];
}>;

export function AppHeader({
  screenTitle,
  screenSubtitle,
  icon,
}: AppHeaderProps) {
  const c = useAppColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          backgroundColor: c.cardBackground,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.borderSubtle,
          overflow: "hidden",
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
      }),
    [c],
  );
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerIconWrap}>
          <IconSymbol name={icon} size={24} color={c.onBrand} />
        </View>
        <View style={styles.headerTextCol}>
          <ThemedText type="screenTitle">{screenTitle}</ThemedText>
          <ThemedText type="screenSubtitle">{screenSubtitle}</ThemedText>
        </View>
      </View>
    </View>
  );
}
