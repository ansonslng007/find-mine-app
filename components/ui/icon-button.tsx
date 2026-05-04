import React, { type ReactNode } from "react";
import { Pressable, type PressableProps, StyleSheet } from "react-native";

import { useAppColors } from "@/hooks/use-app-colors";

type Props = Omit<PressableProps, "children"> & {
  children: ReactNode;
  /** Default 14 — square buttons often use 48. */
  size?: number;
  borderRadius?: number;
};

export function IconButton({
  children,
  size = 48,
  borderRadius = 14,
  style,
  ...rest
}: Props) {
  const c = useAppColors();
  return (
    <Pressable
      style={(state) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: c.brand,
          opacity: state.pressed ? 0.9 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
});
