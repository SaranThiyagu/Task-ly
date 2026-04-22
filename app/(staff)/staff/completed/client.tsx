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
  ShieldCheck,
  ClockAlert,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  FileImage,
  MessageSquare,
  X,
  Sparkles,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Task, TaskReview, TaskEvidence, Profile } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/types";

interface TaskWithReviews extends Task {
  task_reviews?: TaskReview[];
  task_evidence?: TaskEvidence[];
}

type StatusFilter = "all" | "approved" | "pending" | "rejected";
type SortKey = "date" | "priority" | "location";
type SortDir = "asc" | "desc";

const priorityWeight = { low: 0, medium: 1, high: 2, critical: 3 };

interface CompletedTasksClientProps {
  profile: Profile;
  tasks: TaskWithReviews[];
  reviewerProfiles: Profile[];
}

function getTaskReviewStatus(task: TaskWithReviews) {
  const reviews = task.task_reviews || [];
  const isApproved = reviews.some((r) => r.action === "approved");
  const isRejected = task.status === "rejected" || reviews.some((r) => r.action === "rejected");
  return { isApproved, isRejected, isPending: !isApproved && !isRejected };
}

export function CompletedTasksClient({
  profile,
  tasks,
  reviewerProfiles,
}: CompletedTasksClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedTask, setSelectedTask] = useState<TaskWithReviews | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Counts
  const counts = useMemo(() => {
    let approved = 0, pending = 0, rejected = 0;
    for (const t of tasks) {
      const s = getTaskReviewStatus(t);
      if (s.isApproved) approved++;
      else if (s.isRejected) rejected++;
      else pending++;
    }
    return { approved, pending, rejected, total: tasks.length };
  }, [tasks]);

  // Filtered + sorted
  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.site_location?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((t) => {
        const s = getTaskReviewStatus(t);
        if (statusFilter === "approved") return s.isApproved;
        if (statusFilter === "rejected") return s.isRejected;
        return s.isPending;
      });
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp =
          new Date(a.completed_at || a.created_at).getTime() -
          new Date(b.completed_at || b.created_at).getTime();
      } else if (sortKey === "priority") {
        cmp = priorityWeight[a.priority] - priorityWeight[b.priority];
      } else {
        cmp = (a.site_location || "").localeCompare(b.site_location || "");
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [tasks, searchQuery, statusFilter, sortKey, sortDir]);

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
    { key: "all", label: "All", count: counts.total },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "pending", label: "In Review", count: counts.pending },
    { key: "rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Completed Tasks
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track your submission history and review outcomes
        </p>
      </div>

      {/* ── KPI Widgets ── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {/* Approved */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl transition-all group-hover:bg-emerald-500/10" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 mb-3 transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              {counts.approved}
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
              Approved
            </p>
          </div>
        </div>

        {/* In Review */}
        <div className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md hover:border-amber-200">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl transition-all group-hover:bg-amber-500/10" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 mb-3 transition-transform group-hover:scale-105">
              <ClockAlert className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              {counts.pending}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                In Review
              </p>
              {counts.pending > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rejected */}
        <div className="group relative overflow-hidden rounded-2xl border border-red-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-md hover:border-red-200">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl transition-all group-hover:bg-red-500/10" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-50 to-red-100 mb-3 transition-transform group-hover:scale-105">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              {counts.rejected}
            </p>
            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
              Rejected
            </p>
          </div>
        </div>
      </div>

      {/* ── Smart Control Bar ── */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by task name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9 pr-4 rounded-xl border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-blue-500/20 focus-visible:border-blue-300"
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

        {/* Filters + Sort */}
        <div className="flex items-center justify-between gap-3">
          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                  <span
                    className={`tabular-nums ${
                      statusFilter === f.key ? "text-white/60" : "text-slate-400"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
          </div>

          {/* Sort controls */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {([
              { key: "date" as const, label: "Date" },
              { key: "priority" as const, label: "Priority" },
              { key: "location" as const, label: "Location" },
            ]).map((s) => (
              <button
                key={s.key}
                onClick={() => toggleSort(s.key)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  sortKey === s.key
                    ? "bg-blue-50 text-blue-700"
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

      {/* ── Task List ── */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 py-16 sm:py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 mb-4">
            {tasks.length === 0 ? (
              <Trophy className="h-8 w-8 text-slate-300" />
            ) : (
              <Search className="h-8 w-8 text-slate-300" />
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {tasks.length === 0 ? "No completed tasks yet" : "No tasks match your filters"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">
            {tasks.length === 0
              ? "Tasks you complete will appear here with their review status"
              : "Try adjusting your search or filter criteria"}
          </p>
          {tasks.length > 0 && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Results count */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-slate-400">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
              {statusFilter !== "all" && (
                <span> · filtered by {statusFilter}</span>
              )}
            </p>
          </div>

          {/* Task rows */}
          <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
            {filteredTasks.map((task) => {
              const { isApproved, isRejected, isPending } = getTaskReviewStatus(task);
              const priorityCfg = PRIORITY_CONFIG[task.priority];
              const evidenceCount = task.task_evidence?.length || 0;

              return (
                <button
                  key={task.id}
                  onClick={() => openDrawer(task)}
                  className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:px-5 text-left transition-all hover:bg-slate-50/80 active:bg-slate-100/60 group"
                >
                  {/* Status indicator */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
                      isRejected
                        ? "bg-red-50"
                        : isApproved
                          ? "bg-emerald-50"
                          : "bg-amber-50"
                    }`}
                  >
                    {isRejected ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : isApproved ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ClockAlert className="h-5 w-5 text-amber-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Priority badge */}
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
                          {priorityCfg.label}
                        </span>
                        {/* Status pill */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            isRejected
                              ? "bg-red-100 text-red-700"
                              : isApproved
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isPending && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                            </span>
                          )}
                          {isRejected ? "Rejected" : isApproved ? "Approved" : "In Review"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {task.site_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">
                            {task.site_location}
                          </span>
                        </span>
                      )}
                      {task.completed_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {format(new Date(task.completed_at), "MMM d, h:mm a")}
                        </span>
                      )}
                      {evidenceCount > 0 && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <FileImage className="h-3 w-3" />
                          {evidenceCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="shrink-0 flex items-center">
                    <span className="hidden sm:inline text-xs font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                      Details
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Task Detail Drawer ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
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

/* ────────────────────────────────────────────────────
   Task Detail Drawer Content
   ──────────────────────────────────────────────────── */

function DrawerContent({
  task,
  reviewerProfiles,
}: {
  task: TaskWithReviews;
  reviewerProfiles: Profile[];
}) {
  const { isApproved, isRejected, isPending } = getTaskReviewStatus(task);
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const reviews = task.task_reviews || [];
  const evidence = task.task_evidence || [];

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div
        className={`p-5 sm:p-6 ${
          isRejected
            ? "bg-gradient-to-br from-red-600 to-red-700"
            : isApproved
              ? "bg-gradient-to-br from-emerald-600 to-emerald-700"
              : "bg-gradient-to-br from-slate-800 to-slate-900"
        } text-white`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/15 backdrop-blur-sm`}
          >
            {isRejected ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : isApproved ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <ClockAlert className="h-3.5 w-3.5" />
            )}
            {isRejected ? "Rejected" : isApproved ? "Approved" : "In Review"}
          </span>
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/15 backdrop-blur-sm">
            {priorityCfg.label}
          </span>
        </div>
        <h2 className="text-lg font-bold leading-snug">{task.title}</h2>
        {task.completed_at && (
          <p className="mt-2 text-sm text-white/60">
            Completed {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto">
        {/* Description */}
        {task.description && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Description
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              {task.description}
            </p>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {task.site_location && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Location
                </span>
              </div>
              <p className="text-sm font-medium text-slate-900 truncate">
                {task.site_location}
              </p>
            </div>
          )}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Due Date
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900">
              {format(new Date(task.due_date), "MMM d, yyyy")}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Completed
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900">
              {task.completed_at
                ? format(new Date(task.completed_at), "MMM d, h:mm a")
                : "—"}
            </p>
          </div>
        </div>

        {/* Evidence */}
        {evidence.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileImage className="h-3.5 w-3.5" />
              Evidence ({evidence.length})
            </p>
            <div className="space-y-3">
              {evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-slate-100 overflow-hidden"
                >
                  <img
                    src={ev.photo_url}
                    alt="Task evidence"
                    className="w-full h-44 object-cover"
                  />
                  {ev.notes && (
                    <div className="flex items-start gap-2 p-3 bg-slate-50/50">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-600 leading-relaxed">
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

        {/* Reviews / Activity Timeline */}
        {reviews.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Review Timeline
            </p>
            <div className="relative pl-5 space-y-4">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200" />

              {reviews.map((review) => {
                const reviewer = reviewerProfiles.find(
                  (p) => p.id === review.reviewed_by
                );
                const approved = review.action === "approved";

                return (
                  <div key={review.id} className="relative">
                    {/* Timeline dot */}
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
                            approved
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {approved ? "Approved" : "Rejected"}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          by{" "}
                          <span className="font-medium text-slate-600">
                            {reviewer?.full_name ?? "Unknown"}
                          </span>
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-slate-600 leading-relaxed mt-1.5 italic">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-2">
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

        {/* No reviews yet */}
        {reviews.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 py-8 text-center">
            <ClockAlert className="h-8 w-8 text-amber-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">
              Awaiting supervisor review
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              You&apos;ll be notified when reviewed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
