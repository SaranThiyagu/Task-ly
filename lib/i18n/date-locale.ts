import { enUS, zhCN } from "date-fns/locale";
import type { Locale } from "./locales";

const map = { en: enUS, zh: zhCN } as const;

export function getDateLocale(lang: Locale) {
  return map[lang];
}
