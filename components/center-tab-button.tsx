import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppColors } from "@/hooks/use-app-colors";
import { useFabUploadSheet } from "@/providers/fab-upload-sheet-provider";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useSegments } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";

export function CenterTabButton(props: BottomTabBarButtonProps) {
  const { style, children: _tabChildren, onPress: _onPress, ...rest } = props;
  const c = useAppColors();
  const { openFabSheet } = useFabUploadSheet();
  const segments = useSegments();

  const isLostItemFormScreen =
    (segments[0] === "(tabs)" && segments[1] === "post") ||
    segments[0] === "post";

  return (
    <HapticTab
      {...rest}
      style={[style, styles.wrapper]}
      onPress={() => {
        if (isLostItemFormScreen) {
          return;
        }
        openFabSheet();
      }}
    >
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
