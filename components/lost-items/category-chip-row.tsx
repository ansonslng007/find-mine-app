import {
  LOST_ITEM_CATEGORY_IDS,
  type LostItemCategoryId,
} from "@/constants/mock-lost-items";
import { useAppColors } from "@/hooks/use-app-colors";
import { useI18n } from "@/providers/i18n-provider";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  category: LostItemCategoryId;
  onCategoryChange: (id: LostItemCategoryId) => void;
};

export function CategoryChipRow({ category, onCategoryChange }: Props) {
  const c = useAppColors();
  const { t } = useI18n();
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
    [c],
  );

  return (
    <View style={styles.chipsWrap}>
      {LOST_ITEM_CATEGORY_IDS.map((id) => {
        const active = category === id;
        const label = t(`categories.${id}`);
        return (
          <Pressable
            key={id}
            onPress={() => onCategoryChange(id)}
            style={[
              styles.chip,
              active ? styles.chipActive : styles.chipInactive,
            ]}
          >
            <Text style={active ? styles.chipLabelActive : styles.chipLabel}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
