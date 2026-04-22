"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

const navGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/supervisor/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Pending Reviews", href: "/supervisor/reviews", icon: ClipboardCheck },
      { label: "All Tasks", href: "/supervisor/tasks", icon: ClipboardList },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "My Team", href: "/supervisor/team", icon: Users },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Reports", href: "/supervisor/reports", icon: BarChart3 },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0C111D] text-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-600/25">
          T
        </div>
        <span className="text-[15px] font-semibold tracking-tight">
          TaskMe
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/30">
                {group.label}
              </span>
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/[0.10] text-white shadow-sm shadow-white/[0.03]"
                        : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-400" />
                    )}
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors duration-150",
                        isActive
                          ? "text-indigo-400"
                          : "text-white/30 group-hover:text-white/50"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section + Logout */}
      <div className="border-t border-white/[0.06] p-3 space-y-1">
        {profile && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 mb-1">
            <UserAvatar
              name={profile.full_name}
              avatarUrl={profile.avatar_url}
              size="sm"
              className="ring-1 ring-white/10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white truncate">
                {profile.full_name}
              </p>
              <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                Supervisor
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/40 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 border-r border-white/[0.06]">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[260px] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-[260px]">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
              T
            </div>
            <span className="font-semibold text-slate-900 text-sm">
              TaskMe
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
