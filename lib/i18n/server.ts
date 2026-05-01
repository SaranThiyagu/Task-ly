import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, defaultLocale, isValidLocale } from "./locales";
import type { Locale } from "./locales";

/**
 * Read the current locale from the cookie jar (server-side only).
 * Falls back to `defaultLocale` ("en") when no cookie is set or the value is invalid.
 */
export async function getLocaleFromCookies(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  if (raw && isValidLocale(raw)) return raw;
  return defaultLocale;
}
