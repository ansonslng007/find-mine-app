import { useContext } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import { ColorSchemePreferenceContext } from "@/providers/color-scheme-preference-provider";
export function useColorScheme(): "light" | "dark" {
  const ctx = useContext(ColorSchemePreferenceContext);
  const system = useRNColorScheme() ?? "light";
  if (!ctx) {
    return system;
  }
  return ctx.effectiveScheme;
}
