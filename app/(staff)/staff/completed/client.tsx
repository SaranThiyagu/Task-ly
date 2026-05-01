"use client";

import { useState, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  ChevronRight,
  Trophy,
  Search,
  X,
  FileImage,
  MessageSquare,
  Sparkles,
  Calendar,
  Hourglass,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import type { Task, TaskReview, TaskEvidence, Profile, TaskPriority } from "@/lib/types";

interface TaskWithReviews extends Task {
  task_reviews?: TaskReview[];
  task_evidence?: TaskEvidence[];
}

type StatusFilter = "all" | "approved" | "pending" | "rejected";

interface CompletedTasksClientProps {
  profile: Profile;
  tasks: TaskWithReviews[];
  reviewerProfiles: Profile[];
}

/* ───── Design tokens ─────
   Primary  : #1E3A8A (deep blue)
   Approved : #22C55E (green)
   Pending  : #F59E0B (orange)
   Rejected : #EF4444 (red)
*/

const priorityChip: Record<TaskPriority, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  critical: "bg-red-50 text-red-700 ring-red-200",
};

const priorityDot: Record<TaskPriority, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const priorityLabel: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

function getReviewStatus(task: TaskWithReviews) {
  const reviews = task.task_reviews || [];
  const isApproved = reviews.some((r) => r.action === "approved");
  const isRejected =
    task.status === "rejected" || reviews.some((r) => r.action === "rejected");
  return {
    isApproved: isApproved && !isRejected,
    isRejected,
    isPending: !isApproved && !isRejected,
  };
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */

export function CompletedTasksClient({
  tasks,
  reviewerProfiles,
}: CompletedTasksClientProps) {
  const dict = useDictionary();
  const c = dict.staff.completed;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedTask, setSelectedTask] = useState<TaskWithReviews | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Counts */
  const counts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    for (const t of tasks) {
      const s = getReviewStatus(t);
      if (s.isApproved) approved++;
      else if (s.isRejected) rejected++;
      else pending++;
    }
    return { approved, pending, rejected, total: tasks.length };
  }, [tasks]);

  /* Filtered list */
  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.site_location?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((t) => {
        const s = getReviewStatus(t);
        if (statusFilter === "approved") return s.isApproved;
        if (statusFilter === "rejected") return s.isRejected;
        return s.isPending;
      });
    }

    // Newest first; rejected float to top within filter "all"
    list.sort((a, b) => {
      if (statusFilter === "all") {
        const sa = getReviewStatus(a);
        const sb = getReviewStatus(b);
        if (sa.isRejected !== sb.isRejected) return sa.isRejected ? -1 : 1;
      }
      return (
        new Date(b.completed_at || b.created_at).getTime() -
        new Date(a.completed_at || a.created_at).getTime()
      );
    });

    return list;
  }, [tasks, searchQuery, statusFilter]);

  function openDrawer(task: TaskWithReviews) {
    setSelectedTask(task);
    setDrawerOpen(true);
  }

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: c.filter_all, count: counts.total },
    { key: "approved", label: c.filter_approved, count: counts.approved },
    { key: "pending", label: c.filter_in_review, count: counts.pending },
    { key: "rejected", label: c.filter_rejected, count: counts.rejected },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 pb-24 lg:pb-6">
      {/* ════════ HEADER ════════ */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          {c.heading}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {c.subtitle}
        </p>
      </header>

      {/* ════════ SUMMARY CARDS ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          tone="green"
          icon={<CheckCircle2 className="h-6 w-6" />}
          label={c.summary_approved}
          subLabel={c.summary_approved_sub}
          count={counts.approved}
        />
        <SummaryCard
          tone="orange"
          icon={<Hourglass className="h-6 w-6" />}
          label={c.summary_in_review}
          subLabel={c.summary_in_review_sub}
          count={counts.pending}
          pulse={counts.pending > 0}
        />
        <SummaryCard
          tone="red"
          icon={<XCircle className="h-6 w-6" />}
          label={c.summary_rejected}
          subLabel={counts.rejected > 0 ? c.summary_rejected_sub : c.summary_no_rejected}
          count={counts.rejected}
          attention={counts.rejected > 0}
        />
      </div>

      {/* ════════ REJECTED CALLOUT ════════ */}
      {counts.rejected > 0 && statusFilter !== "rejected" && (
        <button
          type="button"
          onClick={() => setStatusFilter("rejected")}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3.5 text-left shadow-sm transition hover:bg-red-100/60 active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-900">
              {c.rejected_alert.replace("{count}", String(counts.rejected))}
            </p>
            <p className="mt-0.5 text-xs text-red-700">
              {c.rejected_alert_body}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-red-700" />
        </button>
      )}

      {/* ════════ SEARCH + FILTER TABS ════════ */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={c.search_placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-2xl border-slate-200 bg-white pl-10 pr-10 text-sm shadow-sm focus-visible:border-[#1E3A8A] focus-visible:ring-2 focus-visible:ring-indigo-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {filterTabs.map((f) => (
            <FilterTab
              key={f.key}
              filterKey={f.key}
              label={f.label}
              count={f.count}
              active={statusFilter === f.key}
              onClick={() => setStatusFilter(f.key)}
            />
          ))}
        </div>
      </div>

      {/* ════════ TASK LIST ════════ */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          hasTasks={tasks.length > 0}
          onClear={() => {
            setSearchQuery("");
            setStatusFilter("all");
          }}
        />
      ) : (
        <div className="space-y-3">
          <p className="px-1 text-xs font-medium text-slate-400">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            {statusFilter !== "all" && <span> · {statusFilter}</span>}
          </p>

          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <TaskHistoryCard
                key={task.id}
                task={task}
                onClick={() => openDrawer(task)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ════════ DETAIL DRAWER ════════ */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 overflow-y-auto"
        >
          {selectedTask && (
            <DrawerContent
              task={selectedTask}
              reviewerProfiles={reviewerProfiles}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SUMMARY CARD — large, full-color
   ══════════════════════════════════════════════════ */

function SummaryCard({
  tone,
  icon,
  label,
  subLabel,
  count,
  pulse,
  attention,
}: {
  tone: "green" | "orange" | "red";
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  count: number;
  pulse?: boolean;
  attention?: boolean;
}) {
  const palette = {
    green: {
      bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      ring: "shadow-emerald-500/30",
      iconBg: "bg-white/20",
      sub: "text-emerald-50/90",
    },
    orange: {
      bg: "bg-gradient-to-br from-amber-500 to-orange-500",
      ring: "shadow-amber-500/30",
      iconBg: "bg-white/20",
      sub: "text-amber-50/90",
    },
    red: {
      bg: "bg-gradient-to-br from-red-500 to-red-600",
      ring: "shadow-red-500/30",
      iconBg: "bg-white/20",
      sub: "text-red-50/90",
    },
  }[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${palette.bg} p-5 text-white shadow-lg ${palette.ring} ${
        attention ? "ring-2 ring-red-300 ring-offset-2" : ""
      }`}
    >
      {/* Decorative blob */}
      <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-4xl font-extrabold tracking-tight tabular-nums leading-none">
            {count}
          </p>
          <p className="mt-2 text-sm font-bold uppercase tracking-wider">
            {label}
          </p>
          <p className={`mt-0.5 text-xs ${palette.sub}`}>{subLabel}</p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${palette.iconBg} backdrop-blur-sm ${
            pulse ? "animate-pulse" : ""
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   FILTER TAB
   ══════════════════════════════════════════════════ */

function FilterTab({
  filterKey,
  label,
  count,
  active,
  onClick,
}: {
  filterKey: StatusFilter;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const tones: Record<StatusFilter, { active: string; idle: string; dot: string }> = {
    all: {
      active: "bg-[#1E3A8A] text-white shadow-md shadow-indigo-500/25",
      idle: "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
      dot: "bg-slate-400",
    },
    approved: {
      active: "bg-emerald-500 text-white shadow-md shadow-emerald-500/30",
      idle: "bg-white text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50",
      dot: "bg-emerald-500",
    },
    pending: {
      active: "bg-amber-500 text-white shadow-md shadow-amber-500/30",
      idle: "bg-white text-amber-800 ring-1 ring-amber-200 hover:bg-amber-50",
      dot: "bg-amber-500",
    },
    rejected: {
      active: "bg-red-500 text-white shadow-md shadow-red-500/30",
      idle: "bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50",
      dot: "bg-red-500",
    },
  };

  const tone = tones[filterKey];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-bold transition active:scale-[0.97] min-h-[44px] ${
        active ? tone.active : tone.idle
      }`}
    >
      {!active && filterKey !== "all" && (
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
      )}
      {label}
      <span
        className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════════════
   TASK HISTORY CARD — large, scannable
   ══════════════════════════════════════════════════ */

function TaskHistoryCard({
  task,
  onClick,
}: {
  task: TaskWithReviews;
  onClick: () => void;
}) {
  const dict = useDictionary();
  const c = dict.staff.completed;
  const { isApproved, isRejected, isPending } = getReviewStatus(task);
  const evidenceCount = task.task_evidence?.length || 0;
  const reviewCount = task.task_reviews?.length || 0;

  const cardCls = isRejected
    ? "border-l-4 border-red-500 bg-red-50/40 ring-1 ring-red-100 hover:bg-red-50/70"
    : isApproved
      ? "border-l-4 border-emerald-500 bg-white ring-1 ring-emerald-100 hover:bg-emerald-50/30"
      : "border-l-4 border-amber-500 bg-white ring-1 ring-amber-100 hover:bg-amber-50/30";

  const statusBadge = isRejected
    ? {
        cls: "bg-red-500 text-white shadow-sm shadow-red-500/30",
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: c.status_rejected,
      }
    : isApproved
      ? {
          cls: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          label: c.status_approved,
        }
      : {
          cls: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
          icon: <Hourglass className="h-3.5 w-3.5" />,
          label: c.status_in_review,
        };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-start gap-4 rounded-2xl p-4 text-left shadow-sm transition active:scale-[0.99] hover:shadow-md ${cardCls}`}
    >
      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Top row: title + status */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-[#1E3A8A] transition-colors">
            {task.title}
          </h3>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadge.cls} ${
              isPending ? "animate-pulse" : ""
            }`}
          >
            {statusBadge.icon}
            {statusBadge.label}
          </span>
        </div>

        {/* Meta row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
          {task.site_location && (
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate max-w-[180px]">{task.site_location}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {task.completed_at
              ? format(new Date(task.completed_at), "MMM d · h:mm a")
              : "—"}
          </span>
        </div>

        {/* Bottom row: priority + evidence + arrow */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${priorityChip[task.priority]}`}
            >
              <span className={`h-1 w-1 rounded-full ${priorityDot[task.priority]}`} />
              {priorityLabel[task.priority]}
            </span>
            {evidenceCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <FileImage className="h-3.5 w-3.5" />
                {evidenceCount} photo{evidenceCount > 1 ? "s" : ""}
              </span>
            )}
            {reviewCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <MessageSquare className="h-3.5 w-3.5" />
                {reviewCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-[#1E3A8A] transition-colors">
            <span className="hidden sm:inline">{c.view}</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>

        {/* Rejected nudge */}
        {isRejected && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {c.tap_feedback}
          </div>
        )}
      </div>
    </button>
  );
}

/* ══════════════════════════════════════════════════
   EMPTY STATE
   ══════════════════════════════════════════════════ */

function EmptyState({
  hasTasks,
  onClear,
}: {
  hasTasks: boolean;
  onClear: () => void;
}) {
  const dict = useDictionary();
  const c = dict.staff.completed;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center sm:py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
        {hasTasks ? (
          <Search className="h-8 w-8 text-slate-300" />
        ) : (
          <Trophy className="h-8 w-8 text-amber-400" />
        )}
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">
        {hasTasks ? c.empty_filter_title : c.empty_title}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        {hasTasks ? c.empty_filter_body : c.empty_body}
      </p>
      {hasTasks && (
        <button
          onClick={onClear}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E3A8A]/90 active:scale-[0.98]"
        >
          {dict.common.actions.clearFilters}
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   DETAIL DRAWER
   ══════════════════════════════════════════════════ */

function DrawerContent({
  task,
  reviewerProfiles,
}: {
  task: TaskWithReviews;
  reviewerProfiles: Profile[];
}) {
  const dict = useDictionary();
  const c = dict.staff.completed;
  const { isApproved, isRejected } = getReviewStatus(task);
  const reviews = task.task_reviews || [];
  const evidence = task.task_evidence || [];

  const headerCls = isRejected
    ? "bg-gradient-to-br from-red-500 to-red-700"
    : isApproved
      ? "bg-gradient-to-br from-emerald-500 to-emerald-700"
      : "bg-gradient-to-br from-amber-500 to-orange-600";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={`p-5 sm:p-6 ${headerCls} text-white`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm">
            {isRejected ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : isApproved ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Hourglass className="h-3.5 w-3.5" />
            )}
            {isRejected ? c.status_rejected : isApproved ? c.status_approved : c.status_in_review}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm">
            {priorityLabel[task.priority]} Priority
          </span>
        </div>
        <h2 className="text-lg font-extrabold leading-snug">{task.title}</h2>
        {task.completed_at && (
          <p className="mt-2 text-sm text-white/80">
            Submitted{" "}
            {formatDistanceToNow(new Date(task.completed_at), {
              addSuffix: true,
            })}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
        {task.description && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {c.drawer_description}
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              {task.description}
            </p>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {task.site_location && (
            <InfoTile
              icon={<MapPin className="h-4 w-4 text-blue-500" />}
              label={c.drawer_location}
              value={task.site_location}
            />
          )}
          <InfoTile
            icon={<Calendar className="h-4 w-4 text-violet-500" />}
            label={c.drawer_due_date}
            value={format(new Date(task.due_date), "MMM d, yyyy")}
          />
          <InfoTile
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            label={c.drawer_submitted}
            value={
              task.completed_at
                ? format(new Date(task.completed_at), "MMM d, h:mm a")
                : "—"
            }
          />
        </div>

        {/* Evidence */}
        {evidence.length > 0 && (
          <div>
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <FileImage className="h-3.5 w-3.5" />
              {c.drawer_evidence.replace("{count}", String(evidence.length))}
            </p>
            <div className="space-y-3">
              {evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="overflow-hidden rounded-xl border border-slate-100"
                >
                  <img
                    src={ev.photo_url}
                    alt="Task evidence"
                    className="h-44 w-full object-cover"
                  />
                  {ev.notes && (
                    <div className="flex items-start gap-2 bg-slate-50/50 p-3">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <p className="text-sm leading-relaxed text-slate-700">
                        {ev.notes}
                      </p>
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

        {/* Review timeline */}
        {reviews.length > 0 && (
          <div>
            <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Sparkles className="h-3.5 w-3.5" />
              {c.drawer_review_timeline}
            </p>
            <div className="relative space-y-4 pl-5">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200" />
              {reviews.map((review) => {
                const reviewer = reviewerProfiles.find(
                  (p) => p.id === review.reviewed_by
                );
                const approved = review.action === "approved";
                return (
                  <div key={review.id} className="relative">
                    <div
                      className={`absolute -left-5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        approved ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <div
                      className={`rounded-xl border p-3 ${
                        approved
                          ? "border-emerald-100 bg-emerald-50/40"
                          : "border-red-100 bg-red-50/40"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0.5 font-bold ${
                            approved
                              ? "bg-emerald-500 text-white"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          {approved ? c.status_approved : c.status_rejected}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          by{" "}
                          <span className="font-semibold text-slate-700">
                            {reviewer?.full_name ?? "Unknown"}
                          </span>
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-1.5 text-sm italic leading-relaxed text-slate-700">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-slate-400">
                        {format(
                          new Date(review.reviewed_at),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Awaiting */}
        {reviews.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-amber-200 bg-amber-50/40 py-8 text-center">
            <Hourglass className="mb-2 h-8 w-8 text-amber-400" />
            <p className="text-sm font-bold text-amber-900">
              {c.awaiting_review}
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              {c.awaiting_notify}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      <p className="truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
