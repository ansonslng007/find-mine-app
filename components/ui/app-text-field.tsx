import React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";

type Props = TextInputProps & {
  leftIcon?: React.ReactNode;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AppTextField({
  leftIcon,
  onClear,
  containerStyle,
  style,
  value,
  ...rest
}: Props) {
  const c = useAppColors();
  const showClear = onClear != null && String(value ?? "").length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.cardBackground,
          borderColor: c.borderSubtle,
        },
        containerStyle,
      ]}
    >
      {leftIcon}
      <TextInput
        value={value}
        placeholderTextColor={c.placeholder}
        style={[styles.input, { color: c.textPrimary }, style]}
        {...rest}
      />
      {showClear ? (
        <Pressable onPress={onClear} hitSlop={10} style={styles.clearBtn}>
          <IconSymbol name="xmark" size={18} color={c.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearBtn: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
});
