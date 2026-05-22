import { useColorScheme } from "@/hooks/use-color-scheme";
import { useI18n } from "@/providers/i18n-provider";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type BottomActionSheetItem = {
  key: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type BottomActionSheetProps = Readonly<{
  visible: boolean;
  onClose: () => void;
  actions: BottomActionSheetItem[];
  cancelLabel?: string;
}>;

const SHEET_RADIUS = 14;
const SHEET_GAP = 8;
const SHEET_ANIM_MS = 280;

export function BottomActionSheet({
  visible,
  onClose,
  actions,
  cancelLabel,
}: BottomActionSheetProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const palette = useMemo(
    () => ({
      overlay: "rgba(0, 0, 0, 0.45)",
      groupBg: isDark ? "#2C2C2E" : "#FFFFFF",
      divider: isDark ? "#3A3A3C" : "#E5E5EA",
      label: isDark ? "#FFFFFF" : "#007AFF",
      destructive: "#FF453A",
      cancel: isDark ? "#FFFFFF" : "#007AFF",
    }),
    [isDark],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          justifyContent: "flex-end",
        },
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: palette.overlay,
        },
        sheet: {
          paddingHorizontal: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          gap: SHEET_GAP,
        },
        group: {
          borderRadius: SHEET_RADIUS,
          backgroundColor: palette.groupBg,
          overflow: "hidden",
        },
        actionRow: {
          minHeight: 56,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
        },
        actionRowPressed: {
          opacity: 0.65,
        },
        actionLabel: {
          fontSize: 17,
          fontWeight: "400",
          textAlign: "center",
        },
        cancelRow: {
          minHeight: 56,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
        },
        cancelLabel: {
          fontSize: 17,
          fontWeight: "600",
          textAlign: "center",
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: palette.divider,
        },
      }),
    [insets.bottom, palette],
  );

  const resolvedCancelLabel = cancelLabel ?? t("common.cancel");

  const sheetTranslateY = useRef(
    new Animated.Value(Dimensions.get("window").height),
  ).current;

  useEffect(() => {
    const windowH = Dimensions.get("window").height;
    if (!visible) {
      sheetTranslateY.setValue(windowH);
      return;
    }
    sheetTranslateY.setValue(windowH);
    const id = requestAnimationFrame(() => {
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: SHEET_ANIM_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return () => cancelAnimationFrame(id);
  }, [visible, sheetTranslateY]);

  const handleActionPress = (action: BottomActionSheetItem) => {
    if (action.disabled) {
      return;
    }
    onClose();
    action.onPress();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
        >
          {actions.length > 0 ? (
            <View style={styles.group}>
              {actions.map((action, index) => (
                <View key={action.key}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <Pressable
                    onPress={() => handleActionPress(action)}
                    disabled={action.disabled}
                    style={({ pressed }) => [
                      styles.actionRow,
                      pressed && !action.disabled ? styles.actionRowPressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionLabel,
                        {
                          color: action.destructive
                            ? palette.destructive
                            : palette.label,
                        },
                        action.disabled ? { opacity: 0.4 } : null,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.group,
              styles.cancelRow,
              pressed ? styles.actionRowPressed : null,
            ]}
          >
            <Text style={[styles.cancelLabel, { color: palette.cancel }]}>
              {resolvedCancelLabel}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
