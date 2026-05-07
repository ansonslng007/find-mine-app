import { i18n } from "@/lib/i18n";
import type { AppLanguagePreference, AppLocale } from "@/lib/i18n/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "@app_language";

const DEFAULT_LOCALE: AppLocale = "zh-Hant";

function normalizeStoredPreference(raw: string | null): AppLanguagePreference {
  if (raw === "zh-Hant" || raw === "en") {
    return raw;
  }
  if (raw === "system") {
    return DEFAULT_LOCALE;
  }
  return DEFAULT_LOCALE;
}

type I18nContextValue = Readonly<{
  preference: AppLanguagePreference;
  setPreference: (p: AppLanguagePreference) => void;
  locale: AppLocale;
  t: (scope: string, options?: Record<string, unknown>) => string;
}>;

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] =
    useState<AppLanguagePreference>(DEFAULT_LOCALE);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      setPreferenceState(normalizeStoredPreference(raw));
    });
  }, []);

  const locale: AppLocale = preference;

  const setPreference = useCallback((p: AppLanguagePreference) => {
    setPreferenceState(p);
    void AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const t = useCallback(
    (scope: string, options?: Record<string, unknown>) => {
      i18n.locale = locale;
      return i18n.t(scope, options ?? {});
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      locale,
      t,
    }),
    [preference, setPreference, locale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
