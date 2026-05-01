import { getLocaleFromCookies } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { DictionaryProvider } from "@/lib/i18n/dictionary-provider";
import StaffShell from "./staff-shell";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocaleFromCookies();
  const dictionary = await getDictionary(locale);

  return (
    <DictionaryProvider dictionary={dictionary}>
      <StaffShell locale={locale}>{children}</StaffShell>
    </DictionaryProvider>
  );
}
