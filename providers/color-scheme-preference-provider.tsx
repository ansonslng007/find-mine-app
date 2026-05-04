import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

const STORAGE_KEY = "@theme_preference";

export type ThemePreference = "system" | "light" | "dark";

type ColorSchemePreferenceValue = Readonly<{
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  effectiveScheme: "light" | "dark";
}>;

export const ColorSchemePreferenceContext =
  createContext<ColorSchemePreferenceValue | null>(null);

export function ColorSchemePreferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemScheme = (useRNColorScheme() ?? "light") as "light" | "dark";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") {
        setPreferenceState(v);
      }
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    void AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const effectiveScheme: "light" | "dark" = useMemo(() => {
    if (preference === "system") {
      return systemScheme;
    }
    return preference;
  }, [preference, systemScheme]);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      effectiveScheme,
    }),
    [preference, setPreference, effectiveScheme],
  );

  return (
    <ColorSchemePreferenceContext.Provider value={value}>
      {children}
    </ColorSchemePreferenceContext.Provider>
  );
}

export function useColorSchemePreference(): ColorSchemePreferenceValue {
  const ctx = useContext(ColorSchemePreferenceContext);
  if (!ctx) {
    throw new Error(
      "useColorSchemePreference must be used within ColorSchemePreferenceProvider",
    );
  }
  return ctx;
}
