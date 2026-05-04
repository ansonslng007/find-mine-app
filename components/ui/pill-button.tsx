import React from "react";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { useAppColors } from "@/hooks/use-app-colors";

type Props = Omit<PressableProps, "children"> & {
  label: string;
};

export function PillButton({ label, style, ...rest }: Props) {
  const c = useAppColors();
  return (
    <Pressable
      style={(state) => [
        styles.wrap,
        { backgroundColor: c.brand },
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    >
      <Text style={[styles.label, { color: c.onBrand }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  label: {
    fontWeight: "600",
    fontSize: 15,
  },
});
