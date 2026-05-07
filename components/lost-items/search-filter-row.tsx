import { IconButton } from "@/components/ui/icon-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { useI18n } from "@/providers/i18n-provider";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

type Props = Readonly<{
  query: string;
  onQueryChange: (q: string) => void;
  onPressSearchByImage: () => void;
  isCategoryExpanded: boolean;
  onToggleCategoryExpanded: () => void;
  scope: "lostHome" | "foundHome";
}>;

export function SearchFilterRow({
  query,
  onQueryChange,
  onPressSearchByImage,
  isCategoryExpanded,
  onToggleCategoryExpanded,
  scope,
}: Props) {
  const c = useAppColors();
  const { t } = useI18n();
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
        cameraFab: {
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.chipBackground,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.borderSubtle,
        },
        cameraFabActive: {
          backgroundColor: c.brand,
          borderColor: c.brand,
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
          placeholder={t(`${scope}.searchPlaceholder`)}
          placeholderTextColor={c.placeholder}
          value={query}
          onChangeText={onQueryChange}
          returnKeyType="search"
        />
      </View>
      <Pressable style={styles.cameraFab} onPress={onPressSearchByImage}>
        <IconSymbol name="camera.fill" size={22} color={c.textPrimary} />
      </Pressable>
      <IconButton
        onPress={onToggleCategoryExpanded}
        style={[
          styles.cameraFab,
          isCategoryExpanded ? styles.cameraFabActive : null,
        ]}
      >
        <IconSymbol
          name={
            isCategoryExpanded
              ? "line.3.horizontal.decrease.circle.fill"
              : "line.3.horizontal.decrease.circle"
          }
          size={22}
          color={isCategoryExpanded ? c.onBrand : c.textPrimary}
        />
      </IconButton>
    </View>
  );
}
