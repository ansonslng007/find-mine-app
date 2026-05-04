import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { useAppColors } from "@/hooks/use-app-colors";
import type { ComponentProps } from "react";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

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
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 20,
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
    [c]
  );

  return (
    <View style={styles.header}>
      <View style={styles.headerIconWrap}>
        <IconSymbol name={icon} size={22} color={c.onBrand} />
      </View>
      <View style={styles.headerTextCol}>
        <ThemedText type="screenTitle">{screenTitle}</ThemedText>
        <ThemedText type="screenSubtitle">{screenSubtitle}</ThemedText>
      </View>
    </View>
  );
}
