import { I18n } from "i18n-js";

import { en } from "./locales/en";
import { zhHant } from "./locales/zh-Hant";

export const i18n = new I18n({
  en,
  "zh-Hant": zhHant,
});

i18n.defaultLocale = "en";
i18n.enableFallback = true;

export type { AppLanguagePreference, AppLocale } from "./types";
