import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { StyleSheet } from "react-native";

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">個人</ThemedText>
      <ThemedText style={styles.body}>
        個人資料與設定將於之後版本提供。
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
