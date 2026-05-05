import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useI18n } from "@/providers/i18n-provider";
import { StyleSheet } from "react-native";

export default function FoundScreen() {
  const { t } = useI18n();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{t("found.title")}</ThemedText>
      <ThemedText style={styles.body}>{t("found.body")}</ThemedText>
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
