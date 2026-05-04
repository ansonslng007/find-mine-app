import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";

const PRIMARY = "#2563EB";

export function CenterTabButton(props: BottomTabBarButtonProps) {
  const { style, children: _tabChildren, ...rest } = props;
  return (
    <HapticTab
      {...rest}
      style={[style, styles.wrapper]}
      accessibilityLabel="發布失物"
    >
      <View style={styles.fab}>
        <IconSymbol name="plus" color="#FFFFFF" size={30} />
      </View>
    </HapticTab>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 18,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
});
