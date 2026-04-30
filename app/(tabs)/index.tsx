import { StyleSheet } from "react-native";

import { LostItemForm } from "@/components/lost-item-form";

export default function HomeScreen() {
  return <LostItemForm />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
