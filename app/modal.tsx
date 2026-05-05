import { Link } from "expo-router";
import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ROUTE_PATH } from "@/constants/routePath";
import { useI18n } from "@/providers/i18n-provider";

export default function ModalScreen() {
  const { t } = useI18n();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{t("modal.title")}</ThemedText>
      <Link href={ROUTE_PATH.HOME} dismissTo style={styles.link}>
        <ThemedText type="link">{t("modal.goHome")}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
