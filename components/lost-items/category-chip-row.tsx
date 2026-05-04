import {
  LOST_ITEM_CATEGORY_CHIPS,
  type LostItemCategoryId,
} from "@/constants/mock-lost-items";
import { useAppColors } from "@/hooks/use-app-colors";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  category: LostItemCategoryId;
  onCategoryChange: (id: LostItemCategoryId) => void;
};

export function CategoryChipRow({ category, onCategoryChange }: Props) {
  const c = useAppColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        chipsWrap: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
        },
        chip: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
        },
        chipActive: {
          backgroundColor: c.brand,
        },
        chipInactive: {
          backgroundColor: c.chipBackground,
        },
        chipLabel: {
          fontSize: 14,
          fontWeight: "500",
          color: c.textPrimary,
        },
        chipLabelActive: {
          fontSize: 14,
          fontWeight: "600",
          color: c.onBrand,
        },
      }),
    [c]
  );

  return (
    <View style={styles.chipsWrap}>
      {LOST_ITEM_CATEGORY_CHIPS.map((chip) => {
        const active = category === chip.id;
        return (
          <Pressable
            key={chip.id}
            onPress={() => onCategoryChange(chip.id)}
            style={[
              styles.chip,
              active ? styles.chipActive : styles.chipInactive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={active ? styles.chipLabelActive : styles.chipLabel}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
