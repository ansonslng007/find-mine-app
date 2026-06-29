import React, { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useAppColors } from "@/hooks/use-app-colors";

type Props = Readonly<{
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}>;

export function AppCard({ children, style }: Props) {
  const c = useAppColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.cardBackground,
          borderColor: c.borderSubtle,
          shadowColor: c.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
});
