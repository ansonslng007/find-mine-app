import { IconButton } from "@/components/ui/icon-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import React, { useMemo } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
};

export function SearchFilterRow({ query, onQueryChange }: Props) {
  const c = useAppColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        searchRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        },
        searchField: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: c.chipBackground,
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 10,
          gap: 8,
        },
        searchInput: {
          flex: 1,
          fontSize: 16,
          color: c.textPrimary,
          padding: 0,
        },
      }),
    [c],
  );

  return (
    <View style={styles.searchRow}>
      <View style={styles.searchField}>
        <IconSymbol name="magnifyingglass" size={20} color={c.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="搜尋物品…"
          placeholderTextColor={c.placeholder}
          value={query}
          onChangeText={onQueryChange}
          returnKeyType="search"
        />
      </View>
      <IconButton
        onPress={() => Alert.alert("篩選", "進階篩選將於之後版本開放。")}
      >
        <IconSymbol name="slider.horizontal.3" size={22} color={c.onBrand} />
      </IconButton>
    </View>
  );
}
