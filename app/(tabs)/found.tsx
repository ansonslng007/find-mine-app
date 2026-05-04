import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { StyleSheet } from "react-native";

export default function FoundScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">尋獲</ThemedText>
      <ThemedText style={styles.body}>
        尋獲物列表將於之後版本提供。
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  body: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
  },
});
