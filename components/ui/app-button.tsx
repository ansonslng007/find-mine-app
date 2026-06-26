import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useAppColors } from "@/hooks/use-app-colors";

type AppButtonVariant = "primary" | "secondary" | "danger";

type Props = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: AppButtonVariant;
  size?: "sm" | "md";
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function AppButton({
  label,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled,
  leftIcon,
  style,
  textStyle,
  ...rest
}: Props) {
  const c = useAppColors();
  const isDisabled = disabled || loading;
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const bg = isPrimary ? c.brand : isDanger ? c.danger : c.cardBackground;
  const fg = isPrimary ? c.onBrand : isDanger ? "#FFFFFF" : c.textPrimary;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: bg,
          borderColor: isPrimary || isDanger ? bg : c.borderSubtle,
          opacity: isDisabled ? 0.6 : pressed ? 0.88 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.label, { color: fg }, textStyle]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  md: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sm: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  fullWidth: {
    width: "100%",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
});
