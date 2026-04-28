"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isPast, formatDistanceToNowStrict } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin,
  Clock,
  Inbox,
  Search,
  ArrowRight,
  ChevronDown,
  SlidersHorizontal,
  AlertOctagon,
  Flame,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Loader2,
  X,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { TaskStatus, TaskPriority, Profile } from "@/lib/types";

/* ─────────────────────────────────
   Design tokens (consistent w/ supervisor system)
   Critical / Overdue : #EF4444 red
   High               : #F59E0B orange
   Medium             : #FACC15 yellow
   Low                : #22C55E emerald
   Completed          : soft emerald
   In Review          : indigo / #1E3A8A
   ───────────────────────────────── */

interface TaskWithStaff {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  site_location: string | null;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  assigned_to_profile: Pick<Profile, "full_name" | "avatar_url">;
}

interface AllTasksClientProps {
  tasks: TaskWithStaff[];
}

type DisplayStatus = TaskStatus | "in_review";
type StatusFilterKey = "all" | DisplayStatus;
type PriorityFilterKey = "all" | TaskPriority;
type SortKey = "newest" | "due" | "priority" | "status";

/* ── Status theme ── */
const STATUS_THEME: Record<
  DisplayStatus,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    pillBg: string;
    pillText: string;
    cardBorder: string;
    cardBg: string;
    side: string;
    icon: typeof CheckCircle2;
  }
> = {
  pending: {
    label: "Pending",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-700",
    pillBg: "bg-slate-700",
    pillText: "text-white",
    cardBorder: "border-slate-200",
    cardBg: "bg-white",
    side: "bg-slate-300",
    icon: CircleDashed,
  },
  in_progress: {
    label: "In Progress",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    pillBg: "bg-blue-500",
    pillText: "text-white",
    cardBorder: "border-slate-200",
    cardBg: "bg-white",
    side: "bg-blue-500",
    icon: Loader2,
  },
  in_review: {
    label: "In Review",
    badgeBg: "bg-indigo-100",
    badgeText: "text-[#1E3A8A]",
    pillBg: "bg-[#1E3A8A]",
    pillText: "text-white",
    cardBorder: "border-indigo-200",
    cardBg: "bg-indigo-50/30",
    side: "bg-[#1E3A8A]",
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    pillBg: "bg-emerald-500",
    pillText: "text-white",
    cardBorder: "border-emerald-200",
    cardBg: "bg-emerald-50/30",
    side: "bg-emerald-500",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    pillBg: "bg-red-500",
    pillText: "text-white",
    cardBorder: "border-red-200",
    cardBg: "bg-red-50/30",
    side: "bg-red-500",
    icon: XCircle,
  },
  overdue: {
    label: "Overdue",
    badgeBg: "bg-red-500",
    badgeText: "text-white",
    pillBg: "bg-red-600",
    pillText: "text-white",
    cardBorder: "border-red-300",
    cardBg: "bg-red-50/40",
    side: "bg-red-500",
    icon: AlertOctagon,
  },
};

/* ── Priority theme ── */
const PRIORITY_THEME: Record<
  TaskPriority,
  { label: string; badgeBg: string; badgeText: string; dot: string }
> = {
  critical: {
    label: "Critical",
    badgeBg: "bg-red-500",
    badgeText: "text-white",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    badgeBg: "bg-orange-500",
    badgeText: "text-white",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    badgeBg: "bg-yellow-300",
    badgeText: "text-yellow-900",
    dot: "bg-yellow-400",
  },
  low: {
    label: "Low",
    badgeBg: "bg-emerald-500",
    badgeText: "text-white",
    dot: "bg-emerald-500",
  },
};

const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
const STATUS_RANK: Record<DisplayStatus, number> = {
  overdue: 0,
  rejected: 1,
  in_review: 2,
  in_progress: 3,
  pending: 4,
  completed: 5,
};

const PAGE_SIZE = 12;

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */

export function AllTasksClient({ tasks: initialTasks }: AllTasksClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilterKey>("all");
  const [sortMode, setSortMode] = useState<SortKey>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* Defer time-based logic to avoid SSR/CSR hydration mismatches */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* Realtime */
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("supervisor-all-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  /* ── Compute display status (overdue derives from due_date) ── */
  function getDisplayStatus(task: TaskWithStaff): DisplayStatus {
    if (!mounted) return task.status; // server-stable
    if (
      (task.status === "pending" || task.status === "in_progress") &&
      isPast(new Date(task.due_date))
    ) {
      return "overdue";
    }
    return task.status;
  }

  /* ── Counts for filter pills ── */
  const counts = useMemo(() => {
    const c = {
      all: tasks.length,
      pending: 0,
      in_progress: 0,
      in_review: 0,
      completed: 0,
      rejected: 0,
      overdue: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const t of tasks) {
      const ds = getDisplayStatus(t);
      if (ds in c) (c as Record<string, number>)[ds] += 1;
      if (t.priority in c) (c as Record<string, number>)[t.priority] += 1;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, mounted]);

  /* ── Filter + sort ── */
  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        const ds = getDisplayStatus(t);
        if (statusFilter !== "all" && ds !== statusFilter) return false;
        if (priorityFilter !== "all" && t.priority !== priorityFilter)
          return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            t.title.toLowerCase().includes(q) ||
            (t.assigned_to_profile?.full_name?.toLowerCase().includes(q) ??
              false) ||
            (t.site_location?.toLowerCase().includes(q) ?? false)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortMode === "due") {
          return (
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
        }
        if (sortMode === "priority") {
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        }
        if (sortMode === "status") {
          return (
            STATUS_RANK[getDisplayStatus(a)] - STATUS_RANK[getDisplayStatus(b)]
          );
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, search, statusFilter, priorityFilter, sortMode, mounted]);

  /* Reset visibleCount when filters change */
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, statusFilter, priorityFilter, sortMode]);

  const visibleTasks = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  /* ── Filter chip definitions ── */
  const statusFilters: {
    key: StatusFilterKey;
    label: string;
    tone: "neutral" | DisplayStatus;
  }[] = [
    { key: "all", label: "All", tone: "neutral" },
    { key: "overdue", label: "Overdue", tone: "overdue" },
    { key: "pending", label: "Pending", tone: "pending" },
    { key: "in_progress", label: "In Progress", tone: "in_progress" },
    { key: "completed", label: "Completed", tone: "completed" },
    { key: "rejected", label: "Rejected", tone: "rejected" },
  ];

  const priorityFilters: { key: PriorityFilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "critical", label: "Critical" },
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
    { key: "low", label: "Low" },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "newest", label: "Newest first" },
    { key: "due", label: "Due Date" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
  ];

  const urgentCount = counts.overdue + counts.critical;

  return (
    <div className="space-y-6 pb-10">
      {/* ════════ HEADER ════════ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              All Tasks
            </h1>
            <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
              {tasks.length} total
            </span>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            View, filter, and manage every task across your team
          </p>
        </div>

        {urgentCount > 0 && mounted && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700 shadow-sm">
            <AlertOctagon className="h-4 w-4 text-red-500" />
            {urgentCount} need attention ({counts.overdue} overdue ·{" "}
            {counts.critical} critical)
          </div>
        )}
      </header>

      {/* ════════ TOOLBAR ════════ */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, staff, or location..."
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

        {/* Status filter row */}
        <div className="space-y-2">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Status
          </p>
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {statusFilters.map((f) => {
              const active = statusFilter === f.key;
              const isAll = f.key === "all";
              const tone = !isAll
                ? STATUS_THEME[f.tone as DisplayStatus]
                : null;
              const count =
                f.key === "all"
                  ? counts.all
                  : (counts as Record<string, number>)[f.key] || 0;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition min-h-[40px] ${
                    active
                      ? isAll
                        ? "bg-slate-900 text-white shadow-md"
                        : `${tone?.pillBg} ${tone?.pillText} shadow-md`
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                  <span
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold ${
                      active
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority filter row + Sort */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              Priority
            </p>
            <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {priorityFilters.map((f) => {
                const active = priorityFilter === f.key;
                const theme =
                  f.key !== "all" ? PRIORITY_THEME[f.key as TaskPriority] : null;
                const count =
                  f.key === "all"
                    ? counts.all
                    : (counts as Record<string, number>)[f.key] || 0;
                return (
                  <button
                    key={f.key}
                    onClick={() => setPriorityFilter(f.key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition min-h-[40px] ${
                      active
                        ? f.key === "all"
                          ? "bg-[#1E3A8A] text-white shadow-md"
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
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold ${
                        active
                          ? "bg-white/25 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort */}
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
                <div className="absolute right-0 top-full z-20 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
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

      {/* ════════ TASK LIST ════════ */}
      {filtered.length === 0 ? (
        <EmptyState
          onClear={() => {
            setSearch("");
            setStatusFilter("all");
            setPriorityFilter("all");
          }}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:gap-3.5">
            {visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                displayStatus={getDisplayStatus(task)}
                mounted={mounted}
              />
            ))}
          </div>

          {/* Pagination */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[13px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md min-h-[44px]"
              >
                Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400">
            Showing {visibleTasks.length} of {filtered.length}
            {filtered.length !== tasks.length && ` (filtered from ${tasks.length})`}
          </p>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TASK CARD
   ══════════════════════════════════════════════════ */

function TaskCard({
  task,
  displayStatus,
  mounted,
}: {
  task: TaskWithStaff;
  displayStatus: DisplayStatus;
  mounted: boolean;
}) {
  const theme = STATUS_THEME[displayStatus];
  const priorityTheme = PRIORITY_THEME[task.priority];
  const isUrgent =
    displayStatus === "overdue" || task.priority === "critical";
  const dueDate = new Date(task.due_date);
  const isOverdue = displayStatus === "overdue";

  return (
    <Link
      href={`/supervisor/reviews/${task.id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded-2xl"
    >
      <article
        className={`group relative overflow-hidden rounded-2xl border ${
          isUrgent ? "border-2" : ""
        } ${theme.cardBorder} ${theme.cardBg} ${
          isUrgent ? "shadow-md shadow-red-500/5" : "shadow-sm"
        } transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
      >
        {/* Colored side bar */}
        <span
          className={`absolute inset-y-0 left-0 w-1.5 ${theme.side}`}
          aria-hidden
        />

        <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:gap-5 sm:p-5 sm:pl-6">
          {/* Avatar */}
          <UserAvatar
            name={task.assigned_to_profile?.full_name || "?"}
            avatarUrl={task.assigned_to_profile?.avatar_url}
            size="md"
            className="h-11 w-11 shrink-0 rounded-2xl ring-2 ring-white shadow-sm"
          />

          {/* Info */}
          <div className="min-w-0 flex-1">
            {/* Badges row */}
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={displayStatus} />
              <PriorityBadge priority={task.priority} />
              {isOverdue && mounted && (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-red-700"
                  suppressHydrationWarning
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  {formatDistanceToNowStrict(dueDate)} late
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
                {task.assigned_to_profile?.full_name || "Unassigned"}
              </span>
              {task.site_location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {task.site_location}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 ${
                  isOverdue ? "font-bold text-red-600" : ""
                }`}
                suppressHydrationWarning
              >
                <Clock className="h-3 w-3 text-slate-400" />
                Due {format(dueDate, "MMM d, yyyy")}
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex shrink-0 items-center sm:ml-2">
            <span
              className={`inline-flex w-full items-center justify-center gap-1.5 rounded-2xl px-5 py-3 text-[13px] font-bold shadow-md transition-all min-h-[44px] sm:w-auto sm:py-2.5 ${
                isUrgent
                  ? "bg-red-600 text-white hover:bg-red-700 shadow-red-600/30"
                  : displayStatus === "completed"
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/30"
                    : displayStatus === "rejected"
                      ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/30"
                      : "bg-[#1E3A8A] text-white hover:bg-[#172e6e] shadow-indigo-500/30"
              }`}
            >
              View
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ══════════════════════════════════════════════════
   STATUS / PRIORITY BADGES
   ══════════════════════════════════════════════════ */

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const theme = STATUS_THEME[status];
  const Icon = theme.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider shadow-sm ${theme.badgeBg} ${theme.badgeText}`}
    >
      <Icon
        className={`h-3 w-3 ${
          status === "in_progress" || status === "in_review"
            ? "animate-spin"
            : ""
        }`}
      />
      {theme.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const theme = PRIORITY_THEME[priority];
  const icon =
    priority === "critical" ? (
      <AlertOctagon className="h-3 w-3" />
    ) : priority === "high" ? (
      <Flame className="h-3 w-3" />
    ) : null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider shadow-sm ${theme.badgeBg} ${theme.badgeText}`}
    >
      {icon}
      {theme.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════
   EMPTY STATE
   ══════════════════════════════════════════════════ */

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        <Inbox className="h-7 w-7 text-slate-300" />
      </div>
      <h3 className="text-base font-extrabold text-slate-900">
        No tasks found
      </h3>
      <p className="mt-1 max-w-xs text-[13px] text-slate-500">
        Try adjusting your filters or search query
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
      >
        Clear filters
      </button>
    </div>
  );
}
