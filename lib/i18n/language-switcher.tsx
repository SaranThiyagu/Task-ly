"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE } from "./locales";
import type { Locale } from "./locales";

/**
 * Minimal language switcher.
 * Sets the NEXT_LOCALE cookie and does a hard refresh so the server
 * re-reads the cookie and returns the correct dictionary.
 */
export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();

  function toggle() {
    const next: Locale = current === "en" ? "zh" : "en";
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors hover:bg-white/[0.08]"
      title={current === "en" ? "切换到中文" : "Switch to English"}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/10 text-[10px] font-extrabold">
        {current === "en" ? "中" : "EN"}
      </span>
      <span className="hidden sm:inline text-white/50">
        {current === "en" ? "中文" : "EN"}
      </span>
    </button>
  );
}
