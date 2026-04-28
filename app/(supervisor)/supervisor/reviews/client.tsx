"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import {
  ClipboardCheck,
  MapPin,
  Clock,
  Search,
  ArrowRight,
  ChevronDown,
  SlidersHorizontal,
  AlertOctagon,
  Flame,
  X,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────
   Design tokens
   Critical : #EF4444 red
   High     : #F59E0B orange
   Medium   : #FACC15 yellow/amber
   Low      : #22C55E green
   Primary  : #1E3A8A
   ───────────────────────────────── */

interface PendingReviewTask {
  id: string;
  title: string;
  priority: string;
  site_location: string | null;
  completed_at: string | null;
  assigned_to_profile:
    | Pick<Profile, "full_name" | "avatar_url">
    | Pick<Profile, "full_name" | "avatar_url">[];
}

interface PendingReviewsClientProps {
  pendingReviewTasks: PendingReviewTask[];
}

type SortMode = "newest" | "oldest" | "priority";
type FilterPriority = "all" | "critical" | "high" | "medium" | "low";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

type PriorityKey = "critical" | "high" | "medium" | "low";

const PRIORITY_THEME: Record<
  PriorityKey,
  {
    label: string;
    /* Filter pill / accent colors */
    dot: string;
    chipBg: string;
    chipText: string;
    chipRing: string;
    /* Badge shown on cards */
    badgeBg: string;
    badgeText: string;
    /* Card emphasis */
    cardBorder: string;
    cardSideBar: string;
    cardBg: string;
    /* CTA button */
    ctaBg: string;
    ctaHover: string;
    ctaShadow: string;
    /* Icon tile (for hero / urgency markers) */
    iconBg: string;
  }
> = {
  critical: {
    label: "Critical",
    dot: "bg-red-500",
    chipBg: "bg-red-100",
    chipText: "text-red-700",
    chipRing: "ring-red-200",
    badgeBg: "bg-red-500",
    badgeText: "text-white",
    cardBorder: "border-red-300",
    cardSideBar: "bg-red-500",
    cardBg: "bg-red-50/40",
    ctaBg: "bg-red-600",
    ctaHover: "hover:bg-red-700",
    ctaShadow: "shadow-red-600/30",
    iconBg: "bg-red-500",
  },
  high: {
    label: "High",
    dot: "bg-orange-500",
    chipBg: "bg-orange-100",
    chipText: "text-orange-700",
    chipRing: "ring-orange-200",
    badgeBg: "bg-orange-500",
    badgeText: "text-white",
    cardBorder: "border-orange-200",
    cardSideBar: "bg-orange-500",
    cardBg: "bg-orange-50/30",
    ctaBg: "bg-orange-500",
    ctaHover: "hover:bg-orange-600",
    ctaShadow: "shadow-orange-500/30",
    iconBg: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    dot: "bg-yellow-400",
    chipBg: "bg-yellow-100",
    chipText: "text-yellow-800",
    chipRing: "ring-yellow-200",
    badgeBg: "bg-yellow-400",
    badgeText: "text-yellow-900",
    cardBorder: "border-slate-200",
    cardSideBar: "bg-yellow-400",
    cardBg: "bg-white",
    ctaBg: "bg-[#1E3A8A]",
    ctaHover: "hover:bg-[#172e6e]",
    ctaShadow: "shadow-indigo-500/30",
    iconBg: "bg-yellow-400",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-500",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-700",
    chipRing: "ring-emerald-200",
    badgeBg: "bg-emerald-500",
    badgeText: "text-white",
    cardBorder: "border-slate-200",
    cardSideBar: "bg-emerald-500",
    cardBg: "bg-white",
    ctaBg: "bg-[#1E3A8A]",
    ctaHover: "hover:bg-[#172e6e]",
    ctaShadow: "shadow-indigo-500/30",
    iconBg: "bg-emerald-500",
  },
};

function getTheme(priority: string) {
  return PRIORITY_THEME[(priority as PriorityKey) ?? "medium"] ?? PRIORITY_THEME.medium;
}

export function PendingReviewsClient({
  pendingReviewTasks: initialTasks,
}: PendingReviewsClientProps) {
  const router = useRouter();
  const [pendingReviewTasks, setPendingReviewTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [showSortMenu, setShowSortMenu] = useState(false);

  /* ── Realtime ── */
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("reviews-tasks")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_reviews" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    setPendingReviewTasks(initialTasks);
  }, [initialTasks]);

  /* ── Filter + sort ── */
  const filteredTasks = useMemo(() => {
    return pendingReviewTasks
      .filter((task) => {
        if (filterPriority !== "all" && task.priority !== filterPriority)
          return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const prof = Array.isArray(task.assigned_to_profile)
            ? task.assigned_to_profile[0]
            : task.assigned_to_profile;
          return (
            task.title.toLowerCase().includes(q) ||
            prof?.full_name?.toLowerCase().includes(q) ||
            (task.site_location?.toLowerCase().includes(q) ?? false)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortMode === "priority") {
          return (
            (PRIORITY_ORDER[a.priority] ?? 9) -
            (PRIORITY_ORDER[b.priority] ?? 9)
          );
        }
        const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return sortMode === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [pendingReviewTasks, filterPriority, search, sortMode]);

  /* ── Counts per priority for filter pills ── */
  const counts = useMemo(() => {
    const c = { all: 0, critical: 0, high: 0, medium: 0, low: 0 } as Record<
      FilterPriority,
      number
    >;
    for (const t of pendingReviewTasks) {
      c.all += 1;
      const k = (t.priority as PriorityKey) ?? "medium";
      if (k in c) c[k as FilterPriority] += 1;
    }
    return c;
  }, [pendingReviewTasks]);

  const urgentCount = counts.critical + counts.high;

  const priorityFilters: { key: FilterPriority; label: string }[] = [
    { key: "all", label: "All" },
    { key: "critical", label: "Critical" },
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
    { key: "low", label: "Low" },
  ];

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: "newest", label: "Newest first" },
    { key: "oldest", label: "Oldest first" },
    { key: "priority", label: "Priority" },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* ════════ HEADER ════════ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Pending Reviews
            </h1>
            {pendingReviewTasks.length > 0 && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm ${
                  urgentCount > 0
                    ? "bg-red-500 text-white shadow-red-500/30"
                    : "bg-amber-500 text-white shadow-amber-500/30"
                }`}
              >
                {urgentCount > 0 && <Flame className="h-3 w-3" />}
                {pendingReviewTasks.length} awaiting
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            Review completed tasks awaiting your approval
          </p>
        </div>

        {/* Quick urgency summary */}
        {urgentCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700 shadow-sm">
            <AlertOctagon className="h-4 w-4 text-red-500" />
            {urgentCount} urgent ({counts.critical} critical · {counts.high} high)
          </div>
        )}
      </header>

      {/* ════════ TOOLBAR ════════ */}
      {pendingReviewTasks.length > 0 && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks, staff, locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-[14px] text-slate-700 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter pills + Sort */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Priority filter pills */}
            <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {priorityFilters.map((f) => {
                const active = filterPriority === f.key;
                const theme =
                  f.key !== "all" ? PRIORITY_THEME[f.key as PriorityKey] : null;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilterPriority(f.key)}
                    className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition-all min-h-[40px] ${
                      active
                        ? f.key === "all"
                          ? "bg-[#1E3A8A] text-white shadow-md shadow-indigo-500/30"
                          : `${theme?.badgeBg} ${theme?.badgeText} shadow-md`
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {theme && (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          active ? "bg-white/90" : theme.dot
                        }`}
                      />
                    )}
                    {f.label}
                    <span
                      className={`ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold ${
                        active
                          ? "bg-white/25 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {counts[f.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sort dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {sortOptions.find((s) => s.key === sortMode)?.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortMode(opt.key);
                          setShowSortMenu(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-[12px] font-semibold transition-colors ${
                          sortMode === opt.key
                            ? "bg-indigo-50 text-[#1E3A8A]"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════ TASK LIST ════════ */}
      {pendingReviewTasks.length === 0 ? (
        <EmptyAllCaughtUp />
      ) : filteredTasks.length === 0 ? (
        <EmptyNoMatch onClear={() => {
          setSearch("");
          setFilterPriority("all");
        }} />
      ) : (
        <div className="grid gap-3 sm:gap-3.5">
          {filteredTasks.map((task) => (
            <ReviewCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Footer summary */}
      {filteredTasks.length > 0 && pendingReviewTasks.length > 0 && (
        <p className="text-center text-[11px] text-slate-400">
          Showing {filteredTasks.length} of {pendingReviewTasks.length} reviews
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   REVIEW CARD — tone-aware, urgency-driven layout
   ══════════════════════════════════════════════════ */

function ReviewCard({ task }: { task: PendingReviewTask }) {
  const prof = Array.isArray(task.assigned_to_profile)
    ? task.assigned_to_profile[0]
    : task.assigned_to_profile;
  const theme = getTheme(task.priority);

  // Defer time-based UI to the client to avoid SSR/CSR hydration mismatches
  // (formatDistanceToNow + Date.now() depend on the current moment).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const submittedDate = task.completed_at ? new Date(task.completed_at) : null;
  const isFresh =
    mounted && submittedDate
      ? Date.now() - submittedDate.getTime() < 60 * 60 * 1000
      : false;
  const isCritical = task.priority === "critical";
  const isHigh = task.priority === "high";
  const showStrongEmphasis = isCritical || isHigh;

  return (
    <Link
      href={`/supervisor/reviews/${task.id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded-2xl"
    >
      <article
        className={`group relative overflow-hidden rounded-2xl border ${theme.cardBorder} ${
          showStrongEmphasis ? theme.cardBg : "bg-white"
        } ${
          isCritical ? "border-2 shadow-md shadow-red-500/10" : "shadow-sm"
        } transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
      >
        {/* Colored side bar */}
        <span
          className={`absolute inset-y-0 left-0 w-1.5 ${theme.cardSideBar}`}
        />

        <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:gap-5 sm:p-5 sm:pl-6">
          {/* Avatar */}
          <UserAvatar
            name={prof?.full_name || "?"}
            avatarUrl={prof?.avatar_url}
            size="md"
            className="h-12 w-12 shrink-0 rounded-2xl ring-2 ring-white shadow-sm"
          />

          {/* Info */}
          <div className="min-w-0 flex-1">
            {/* Top row: priority badge + fresh tag */}
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={task.priority} />
              {isFresh && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#1E3A8A] ring-1 ring-blue-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1E3A8A] animate-pulse" />
                  New
                </span>
              )}
              {isCritical && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-red-700">
                  <AlertOctagon className="h-3 w-3" />
                  Action needed
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="truncate text-[15px] font-bold text-slate-900 sm:text-[16px]">
              {task.title}
            </h3>

            {/* Meta */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                {prof?.full_name || "Unknown staff"}
              </span>
              {task.site_location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {task.site_location}
                </span>
              )}
              {task.completed_at && (
                <span
                  className="inline-flex items-center gap-1"
                  title={new Date(task.completed_at).toLocaleString()}
                  suppressHydrationWarning
                >
                  <Clock className="h-3 w-3 text-slate-400" />
                  {mounted
                    ? formatDistanceToNow(new Date(task.completed_at), {
                        addSuffix: true,
                      })
                    : "recently"}
                </span>
              )}
              {submittedDate && showStrongEmphasis && mounted && (
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    isCritical ? "text-red-600" : "text-orange-600"
                  }`}
                  suppressHydrationWarning
                >
                  · awaiting {formatDistanceToNowStrict(submittedDate)}
                </span>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="flex shrink-0 items-center sm:ml-2">
            <span
              className={`inline-flex w-full items-center justify-center gap-1.5 rounded-2xl px-5 py-3 text-[13px] font-bold text-white shadow-md ${theme.ctaBg} ${theme.ctaHover} ${theme.ctaShadow} transition-all min-h-[44px] sm:w-auto sm:py-2.5`}
            >
              Review
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ══════════════════════════════════════════════════
   PRIORITY BADGE
   ══════════════════════════════════════════════════ */

export function PriorityBadge({ priority }: { priority: string }) {
  const theme = getTheme(priority);
  const icon =
    priority === "critical" ? (
      <AlertOctagon className="h-3 w-3" />
    ) : priority === "high" ? (
      <Flame className="h-3 w-3" />
    ) : null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText} shadow-sm`}
    >
      {icon}
      {theme.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════
   EMPTY STATES
   ══════════════════════════════════════════════════ */

function EmptyAllCaughtUp() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
        <ClipboardCheck className="h-8 w-8 text-emerald-500" />
      </div>
      <h3 className="text-lg font-extrabold text-slate-900">All caught up!</h3>
      <p className="mt-1 max-w-xs text-[13px] text-slate-500">
        No pending reviews right now. New submissions will appear here as your
        team completes tasks.
      </p>
    </div>
  );
}

function EmptyNoMatch({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <Search className="mb-3 h-8 w-8 text-slate-300" />
      <p className="text-[13px] text-slate-500">
        No tasks match your search or filters
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
      >
        Clear filters
      </button>
    </div>
  );
}
