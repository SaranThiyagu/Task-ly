"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, isToday, isPast, formatDistanceToNow } from "date-fns";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  Zap,
  TrendingUp,
  Sparkles,
  PlayCircle,
  ArrowRight,
  BarChart3,
  Search,
  ArrowDown,
  ArrowUp,
  X,
  FileImage,
  MessageSquare,
  Calendar,
  Target,
  Activity,
  ShieldCheck,
  XCircle,
  ClockAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import type { Profile, Task, TaskStatus, TaskReview, TaskEvidence } from "@/lib/types";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/types";

/* ─── Types ─── */

interface TaskWithReviews extends Task {
  task_reviews?: TaskReview[];
  task_evidence?: TaskEvidence[];
}

interface StaffDashboardClientProps {
  profile: Profile;
  tasks: TaskWithReviews[];
  reviewerProfiles: Profile[];
}

type StatusFilter = "all" | "active" | "completed" | "overdue";
type SortKey = "date" | "priority";
type SortDir = "asc" | "desc";

const priorityWeight = { low: 0, medium: 1, high: 2, critical: 3 };

/* ─── Helpers ─── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function computeDisplayStatus(task: Task): TaskStatus {
  if (
    (task.status === "pending" || task.status === "in_progress") &&
    isPast(new Date(task.due_date))
  ) {
    return "overdue";
  }
  return task.status;
}

const priorityIndicator: Record<string, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const priorityGradient: Record<string, string> = {
  low: "from-emerald-50 to-emerald-100",
  medium: "from-amber-50 to-amber-100",
  high: "from-orange-50 to-orange-100",
  critical: "from-red-50 to-red-100",
};

/* ─── Main Component ─── */

export function StaffDashboardClient({
  profile,
  tasks,
  reviewerProfiles,
}: StaffDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithReviews | null>(null);

  /* ── Enrich tasks ── */
  const enrichedTasks = useMemo(
    () => tasks.map((t) => ({ ...t, displayStatus: computeDisplayStatus(t) })),
    [tasks]
  );

  /* ── Stats ── */
  const stats = useMemo(() => {
    const todayCount = enrichedTasks.filter((t) => isToday(new Date(t.due_date))).length;
    const completedCount = enrichedTasks.filter(
      (t) => t.status === "completed" && t.completed_at && isToday(new Date(t.completed_at))
    ).length;
    const overdueCount = enrichedTasks.filter((t) => t.displayStatus === "overdue").length;
    const pendingReviewCount = enrichedTasks.filter(
      (t) =>
        t.status === "completed" &&
        !(t as TaskWithReviews).task_reviews?.some(
          (r) => r.action === "approved" || r.action === "rejected"
        )
    ).length;
    const completionPct = todayCount > 0 ? Math.round((completedCount / todayCount) * 100) : 0;

    return { todayCount, completedCount, overdueCount, pendingReviewCount, completionPct };
  }, [enrichedTasks]);

  /* ── Active tasks for table (today + overdue + in_progress) ── */
  const allDisplayTasks = useMemo(() => {
    return enrichedTasks.filter(
      (t) =>
        isToday(new Date(t.due_date)) ||
        t.displayStatus === "overdue" ||
        t.status === "in_progress" ||
        (t.status === "completed" && t.completed_at && isToday(new Date(t.completed_at)))
    );
  }, [enrichedTasks]);

  /* ── Filtered + sorted ── */
  const filteredTasks = useMemo(() => {
    let list = [...allDisplayTasks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.site_location?.toLowerCase().includes(q)
      );
    }

    if (statusFilter === "active") {
      list = list.filter((t) => t.status === "pending" || t.status === "in_progress");
    } else if (statusFilter === "completed") {
      list = list.filter((t) => t.status === "completed");
    } else if (statusFilter === "overdue") {
      list = list.filter((t) => t.displayStatus === "overdue");
    }

    if (priorityFilter) {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else {
        cmp = priorityWeight[a.priority] - priorityWeight[b.priority];
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [allDisplayTasks, searchQuery, statusFilter, priorityFilter, sortKey, sortDir]);

  const nextTask = filteredTasks.find(
    (t) => t.status !== "completed" && t.status !== "rejected"
  );

  function openDrawer(task: TaskWithReviews) {
    setSelectedTask(task);
    setDrawerOpen(true);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const statusFilters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: allDisplayTasks.length },
    {
      key: "active",
      label: "Active",
      count: allDisplayTasks.filter((t) => t.status === "pending" || t.status === "in_progress").length,
    },
    {
      key: "overdue",
      label: "Overdue",
      count: allDisplayTasks.filter((t) => t.displayStatus === "overdue").length,
    },
    {
      key: "completed",
      label: "Completed",
      count: allDisplayTasks.filter((t) => t.status === "completed").length,
    },
  ];

  const priorities = (["critical", "high", "medium", "low"] as const).filter((p) =>
    allDisplayTasks.some((t) => t.priority === p)
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ════════════════════════════════════════
          PREMIUM HERO HEADER
         ════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F1B3D] via-[#162550] to-[#1a2d5a] p-6 sm:p-8 text-white">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-indigo-500/8 rounded-full translate-y-1/2 blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-40 h-40 bg-cyan-400/5 rounded-full blur-2xl" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <UserAvatar
              name={profile.full_name}
              avatarUrl={profile.avatar_url}
              size="lg"
              className="hidden sm:flex ring-2 ring-white/10 shadow-xl mt-1"
            />
            <div className="space-y-2.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-blue-300 backdrop-blur-sm border border-white/5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {format(new Date(), "EEEE, d MMM yyyy")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {getGreeting()}, {profile.full_name.split(" ")[0]} 👋
              </h1>
              <p className="text-sm sm:text-base text-white/50">
                Here&apos;s your operational overview
              </p>
              {nextTask && (
                <Link
                  href={`/staff/tasks/${nextTask.id}`}
                  className="mt-1 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15 hover:border-white/20 active:scale-[0.98]"
                >
                  <PlayCircle className="h-4 w-4 text-blue-400" />
                  Start Next Task
                  <ArrowRight className="h-3.5 w-3.5 text-white/50" />
                </Link>
              )}
            </div>
          </div>

          {/* Progress ring */}
          {stats.todayCount > 0 && (
            <div className="relative flex-shrink-0 h-24 w-24 sm:h-28 sm:w-28">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="2.5"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={stats.completionPct === 100 ? "#14B8A6" : "#6366F1"}
                  strokeWidth="2.5"
                  strokeDasharray={`${stats.completionPct}, 100`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-3xl font-bold">{stats.completionPct}%</span>
                <span className="text-[10px] text-white/35 uppercase tracking-widest">SLA</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          KPI STAT CARDS
         ════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Completed Tasks */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl transition-all group-hover:bg-emerald-500/10" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 mb-3 transition-transform group-hover:scale-105">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
              {stats.completedCount}
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1">Completed</p>
          </div>
        </div>

        {/* Pending */}
        <div className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-200">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/5 rounded-full blur-xl transition-all group-hover:bg-blue-500/10" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 mb-3 transition-transform group-hover:scale-105">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
              {stats.todayCount - stats.completedCount}
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1">Pending</p>
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="group relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl transition-all group-hover:bg-indigo-500/10" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 mb-3 transition-transform group-hover:scale-105">
              <Target className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
              {stats.completionPct}
              <span className="text-lg text-slate-400">%</span>
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1">SLA Compliance</p>
          </div>
        </div>

        {/* Overdue / Active Alerts */}
        <div
          className={`group relative overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${
            stats.overdueCount > 0
              ? "border-red-200 hover:border-red-300"
              : "border-amber-100 hover:border-amber-200"
          }`}
        >
          <div
            className={`absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl transition-all ${
              stats.overdueCount > 0
                ? "bg-red-500/5 group-hover:bg-red-500/10"
                : "bg-amber-500/5 group-hover:bg-amber-500/10"
            }`}
          />
          <div className="relative">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br mb-3 transition-transform group-hover:scale-105 ${
                stats.overdueCount > 0
                  ? "from-red-50 to-red-100"
                  : "from-amber-50 to-amber-100"
              }`}
            >
              {stats.overdueCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <Activity className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
              {stats.overdueCount > 0 ? stats.overdueCount : stats.pendingReviewCount}
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1">
              {stats.overdueCount > 0 ? "Overdue" : "In Review"}
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          OVERDUE ESCALATION ALERT
         ════════════════════════════════════════ */}
      {stats.overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-red-50/80 to-white px-5 py-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <Zap className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">
              {stats.overdueCount} overdue task{stats.overdueCount > 1 ? "s" : ""} need immediate attention
            </p>
            <p className="text-xs text-red-600/70 mt-0.5">
              Complete them now to avoid escalation to your supervisor
            </p>
          </div>
          <Link
            href="/staff/tasks"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
          >
            View Tasks
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* ════════════════════════════════════════
          SMART CONTROL BAR  (Search + Filters + Sort)
         ════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tasks by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 pr-4 rounded-xl border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-indigo-500/20 focus-visible:border-indigo-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Filters + Sort row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {/* Status filters */}
            {statusFilters
              .filter((f) => f.count > 0 || f.key === "all")
              .map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    statusFilter === f.key
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                  <span className={`tabular-nums ${statusFilter === f.key ? "text-white/60" : "text-slate-400"}`}>
                    {f.count}
                  </span>
                </button>
              ))}

            {/* Separator */}
            {priorities.length > 0 && <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />}

            {/* Priority chips */}
            <div className="hidden sm:flex items-center gap-1">
              {priorities.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    priorityFilter === p
                      ? `bg-gradient-to-r ${priorityGradient[p]} shadow-sm ring-1 ring-inset ${
                          p === "critical" ? "ring-red-200 text-red-700" :
                          p === "high" ? "ring-orange-200 text-orange-700" :
                          p === "medium" ? "ring-amber-200 text-amber-700" :
                          "ring-emerald-200 text-emerald-700"
                        }`
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${priorityIndicator[p]}`} />
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {([
              { key: "date" as const, label: "Date" },
              { key: "priority" as const, label: "Priority" },
            ]).map((s) => (
              <button
                key={s.key}
                onClick={() => toggleSort(s.key)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  sortKey === s.key
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {s.label}
                {sortKey === s.key &&
                  (sortDir === "desc" ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUp className="h-3 w-3" />
                  ))}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          TASK TABLE / LIST
         ════════════════════════════════════════ */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 py-16 sm:py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 mb-4">
            {allDisplayTasks.length === 0 ? (
              <TrendingUp className="h-8 w-8 text-emerald-400" />
            ) : (
              <Search className="h-8 w-8 text-slate-300" />
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {allDisplayTasks.length === 0 ? "All clear!" : "No tasks match your filters"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">
            {allDisplayTasks.length === 0
              ? "No tasks scheduled for today. Enjoy your break! 🎉"
              : "Try adjusting your search or filter criteria"}
          </p>
          {allDisplayTasks.length === 0 ? (
            <Link
              href="/staff/tasks"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Browse All Tasks
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setPriorityFilter(null);
              }}
              className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-slate-400">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
              {statusFilter !== "all" && <span> · {statusFilter}</span>}
              {priorityFilter && <span> · {priorityFilter}</span>}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
            {filteredTasks.map((task) => {
              const isOverdue = task.displayStatus === "overdue";
              const statusCfg = STATUS_CONFIG[task.displayStatus];
              const evidenceCount = (task as TaskWithReviews).task_evidence?.length || 0;

              return (
                <button
                  key={task.id}
                  onClick={() => openDrawer(task)}
                  className={`w-full flex items-center gap-3 sm:gap-4 p-4 sm:px-5 text-left transition-all group ${
                    isOverdue
                      ? "bg-red-50/30 hover:bg-red-50/60"
                      : "hover:bg-slate-50/80"
                  } active:bg-slate-100/60`}
                >
                  {/* Priority dot */}
                  <div className="flex flex-col items-center gap-1.5 self-stretch py-0.5">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ${priorityIndicator[task.priority]} ${
                        isOverdue ? "animate-pulse ring-red-200" : "ring-transparent"
                      }`}
                    />
                    <div className="flex-1 w-px bg-slate-100" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            task.priority === "critical"
                              ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                              : task.priority === "high"
                                ? "bg-orange-100 text-orange-700"
                                : task.priority === "medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {PRIORITY_CONFIG[task.priority].label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${statusCfg.color}`}
                        >
                          {isOverdue && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                            </span>
                          )}
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {task.site_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{task.site_location}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {isOverdue
                          ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true })
                          : format(new Date(task.due_date), "h:mm a")}
                      </span>
                      {evidenceCount > 0 && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <FileImage className="h-3 w-3" />
                          {evidenceCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action hint */}
                  <div className="shrink-0 flex items-center">
                    <span className="hidden sm:inline text-xs font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                      View
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* View all link */}
          <div className="text-center pt-2">
            <Link
              href="/staff/tasks"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View all tasks →
            </Link>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TASK DETAIL DRAWER
         ════════════════════════════════════════ */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
          {selectedTask && (
            <TaskDrawerContent
              task={selectedTask}
              reviewerProfiles={reviewerProfiles}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   TASK DETAIL DRAWER CONTENT
   ──────────────────────────────────────────────────── */

function TaskDrawerContent({
  task,
  reviewerProfiles,
}: {
  task: TaskWithReviews;
  reviewerProfiles: Profile[];
}) {
  const isOverdue = computeDisplayStatus(task) === "overdue";
  const displayStatus = computeDisplayStatus(task);
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const statusCfg = STATUS_CONFIG[displayStatus];
  const reviews = task.task_reviews || [];
  const evidence = task.task_evidence || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={`p-5 sm:p-6 text-white ${
          isOverdue
            ? "bg-gradient-to-br from-red-600 to-red-700"
            : task.status === "completed"
              ? "bg-gradient-to-br from-emerald-600 to-emerald-700"
              : "bg-gradient-to-br from-slate-800 to-slate-900"
        }`}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/15 backdrop-blur-sm">
            {priorityCfg.label} Priority
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/15 backdrop-blur-sm">
            {statusCfg.label}
          </span>
          {isOverdue && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/15 backdrop-blur-sm animate-pulse">
              <Zap className="h-3 w-3" />
              Overdue
            </span>
          )}
        </div>
        <h2 className="text-lg font-bold leading-snug">{task.title}</h2>
        {isOverdue && (
          <p className="mt-2 text-sm text-white/60">
            Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto">
        {/* Description */}
        {task.description && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Description
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {task.site_location && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Location</span>
              </div>
              <p className="text-sm font-medium text-slate-900 truncate">{task.site_location}</p>
            </div>
          )}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Due Date</span>
            </div>
            <p className="text-sm font-medium text-slate-900">
              {format(new Date(task.due_date), "MMM d, yyyy")}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Due Time</span>
            </div>
            <p className="text-sm font-medium text-slate-900">
              {format(new Date(task.due_date), "h:mm a")}
            </p>
          </div>
          {task.completed_at && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Completed</span>
              </div>
              <p className="text-sm font-medium text-slate-900">
                {format(new Date(task.completed_at), "MMM d, h:mm a")}
              </p>
            </div>
          )}
        </div>

        {/* Action button */}
        {(task.status === "pending" || task.status === "in_progress") && (
          <Link
            href={`/staff/tasks/${task.id}`}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            {task.status === "pending" ? (
              <>
                <PlayCircle className="h-4 w-4" />
                Start Task
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Continue Task
              </>
            )}
          </Link>
        )}

        {/* Evidence */}
        {evidence.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileImage className="h-3.5 w-3.5" />
              Evidence ({evidence.length})
            </p>
            <div className="space-y-3">
              {evidence.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-slate-100 overflow-hidden">
                  <img
                    src={ev.photo_url}
                    alt="Task evidence"
                    className="w-full h-44 object-cover"
                  />
                  {ev.notes && (
                    <div className="flex items-start gap-2 p-3 bg-slate-50/50">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-600 leading-relaxed">{ev.notes}</p>
                    </div>
                  )}
                  <div className="px-3 py-2 text-xs text-slate-400">
                    {format(new Date(ev.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews timeline */}
        {reviews.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Review Timeline
            </p>
            <div className="relative pl-5 space-y-4">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200" />
              {reviews.map((review) => {
                const reviewer = reviewerProfiles.find((p) => p.id === review.reviewed_by);
                const approved = review.action === "approved";
                return (
                  <div key={review.id} className="relative">
                    <div
                      className={`absolute -left-5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        approved ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <div className="rounded-xl border border-slate-100 bg-white p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0.5 font-semibold ${
                            approved ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {approved ? "Approved" : "Rejected"}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          by <span className="font-medium text-slate-600">{reviewer?.full_name ?? "Unknown"}</span>
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-slate-600 leading-relaxed mt-1.5 italic">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-2">
                        {format(new Date(review.reviewed_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
