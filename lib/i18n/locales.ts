export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isValidLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Cookie name used to persist the user's language preference. */
export const LOCALE_COOKIE = "NEXT_LOCALE";
