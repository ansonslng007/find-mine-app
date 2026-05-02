import { LostItemForm } from "@/components/lost-item-form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Platform, StyleSheet } from "react-native";

export default function HomeScreen() {
  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.webGate}>
        <ThemedText type="title" style={styles.webGateTitle}>
          請使用 App
        </ThemedText>
        <ThemedText style={styles.webGateBody}>
          失物表單與圖片辨識僅支援 iOS 與 Android，請在手機上安裝並開啟應用程式。
        </ThemedText>
      </ThemedView>
    );
  }

  return <LostItemForm />;
}

const styles = StyleSheet.create({
  webGate: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  webGateTitle: {
    marginBottom: 12,
  },
  webGateBody: {
    fontSize: 16,
    lineHeight: 24,
  },
});
