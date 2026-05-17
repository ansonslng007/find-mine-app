import { IconSymbol } from "@/components/ui/icon-symbol";
import { LOST_ITEM_CATEGORY_IDS } from "@/constants/items";
import { useAppColors } from "@/hooks/use-app-colors";
import { useI18n } from "@/providers/i18n-provider";
import React, { useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SUBMIT_CATEGORY_IDS = new Set<string>(
  LOST_ITEM_CATEGORY_IDS.filter((id) => id !== "all"),
);

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
  suggestedCategory?: string | null;
}>;

export function CategoryPickerModal({
  visible,
  onClose,
  onSelect,
  suggestedCategory,
}: Props) {
  const c = useAppColors();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(c), [c]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View style={[styles.root, { backgroundColor: c.pageBackground }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={16}>
            <IconSymbol name="xmark" size={26} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.textPrimary }]}>選擇分類</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {Array.from(SUBMIT_CATEGORY_IDS).map((id) => {
            const isSuggested = id === suggestedCategory;
            const emoji =
              ({
                electronics: "💻",
                clothing: "👕",
                accessories: "🎒",
                documents: "📄",
                keys: "🔑",
                wallet: "👛",
                bag: "👜",
                other: "📦",
              } as Record<string, string>)[id] || "📦";

            return (
              <TouchableOpacity
                key={id}
                style={[styles.row, { borderBottomColor: c.borderSubtle }]}
                onPress={() => onSelect(id)}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{emoji}</Text>
                <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
                  {t(`categories.${id}`)}
                </Text>
                {isSuggested ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: "rgba(31, 136, 61, 0.2)" },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: "#1f883d" }]}>
                      建議
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(c: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      marginLeft: 16,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    emoji: {
      fontSize: 24,
      marginRight: 16,
    },
    rowLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: "500",
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginRight: 12,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
    },
  });
}
