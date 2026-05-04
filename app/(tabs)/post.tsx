import { LostItemForm } from "@/components/lost-item-form";
import { StyleSheet } from "react-native";

export default function PostScreen() {
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
