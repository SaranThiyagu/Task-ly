"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import {
  LayoutDashboard,
  User,
  LogOut,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";
import type { Locale } from "@/lib/i18n/locales";

const navIcons = [LayoutDashboard, ClipboardList, CheckCircle2, User] as const;
const navHrefs = [
  "/staff/dashboard",
  "/staff/tasks",
  "/staff/completed",
  "/staff/profile",
] as const;

export default function StaffShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const dict = useDictionary();
  const navLabels = [
    dict.staff.nav.dashboard,
    dict.staff.nav.tasks,
    dict.staff.nav.completed,
    dict.staff.nav.profile,
  ];

  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const [profile, setProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    });
  }, []);

  useRealtimeTasks(userId);
  usePushNotifications(userId);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50">
      {/* Desktop icon-rail sidebar */}
      <aside className="hidden lg:flex lg:w-[88px] lg:flex-col lg:fixed lg:inset-y-0 bg-[#0C111D] border-r border-white/[0.06]">
        <div className="flex h-full flex-col items-center">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center w-full">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-600/25">
              T
            </div>
          </div>

          <div className="w-10 border-t border-white/[0.06] mb-4" />

          {/* Nav items */}
          <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
            {navHrefs.map((href, i) => {
              const Icon = navIcons[i];
              const label = navLabels[i];
              const isActive =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group relative flex flex-col items-center justify-center gap-1.5 rounded-xl w-full py-3 text-[10px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-white/[0.08] text-white"
                      : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-400" />
                  )}
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors duration-150",
                      isActive
                        ? "text-indigo-400"
                        : "text-white/35 group-hover:text-white/60"
                    )}
                  />
                  <span className="leading-none tracking-wide">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom: language switcher + avatar + logout */}
          <div className="flex flex-col items-center gap-3 pb-4 pt-3 border-t border-white/[0.06] w-full">
            <LanguageSwitcher current={locale} />
            {profile && (
              <UserAvatar
                name={profile.full_name}
                avatarUrl={profile.avatar_url}
                size="sm"
                className="ring-2 ring-white/10"
              />
            )}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center gap-1 rounded-xl w-[72px] py-2.5 text-[10px] font-medium text-white/30 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="leading-none">{dict.common.actions.signOut}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-[88px]">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-lg px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
              T
            </div>
            <span className="font-semibold text-slate-900 text-sm">
              TaskMe
            </span>
          </div>
          <LanguageSwitcher current={locale} />
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 lg:p-8 lg:pb-8">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl lg:hidden safe-bottom">
          <div className="flex items-stretch justify-around">
            {navHrefs.map((href, i) => {
              const Icon = navIcons[i];
              const label = navLabels[i];
              const isActive =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                    isActive
                      ? "text-indigo-600"
                      : "text-slate-400 active:text-slate-600"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                      isActive ? "bg-indigo-50" : ""
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px]",
                        isActive ? "text-indigo-600" : "text-slate-400"
                      )}
                    />
                  </div>
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
