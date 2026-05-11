import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Platform, StyleSheet, View } from "react-native";

export function CenterTabButton(props: BottomTabBarButtonProps) {
  const { style, children: _tabChildren, ...rest } = props;
  const c = useAppColors();

  return (
    <HapticTab {...rest} style={[style, styles.wrapper]}>
      <View style={styles.column}>
        <View style={[styles.fab, { backgroundColor: c.brand }]}>
          <IconSymbol name="plus" color={c.onBrand} size={30} />
        </View>
      </View>
    </HapticTab>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
  },
  column: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 72,
  },
});
