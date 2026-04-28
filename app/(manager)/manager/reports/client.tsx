"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { exportToCSV } from "@/lib/export/exportReport";
import { MetricCard } from "@/components/ui/MetricCard";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Flame,
  Download,
  Filter,
  CalendarDays,
  Users,
  MapPin,
  CheckCircle2,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Sparkles,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Profile, TaskPriority, TaskStatus } from "@/lib/types";

/* ═════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════ */

interface StaffOption {
  id: string;
  full_name: string;
  role: string;
}

interface ManagerReportsClientProps {
  profile: Profile;
  staffList: StaffOption[];
  siteLocations: string[];
}

interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  site_location: string | null;
  assigned_to: string;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  assignee?: { full_name: string } | { full_name: string }[] | null;
}

interface EscalationRow {
  id: string;
  task_id: string;
  is_resolved: boolean;
  escalated_at: string;
}

interface ReviewRow {
  task_id: string;
  action: "approved" | "rejected";
}

type GroupBy = "staff" | "site";

interface ReportRow {
  key: string;
  label: string;
  avatarUrl?: string | null;
  assigned: number;
  completed: number;
  overdue: number;
  pending: number;
  rejected: number;
  escalations: number;
  completionRate: number;
}

type SortKey =
  | "label"
  | "assigned"
  | "completed"
  | "overdue"
  | "completionRate"
  | "escalations";
type SortDir = "asc" | "desc";

const PRIORITIES: { value: TaskPriority | "all"; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// Map UI status options → underlying task statuses (and review modifier).
const STATUS_OPTIONS: {
  value: string;
  label: string;
  match: (
    t: TaskRow,
    now: Date,
    reviewedTaskIds: Set<string>,
    approvedTaskIds: Set<string>,
  ) => boolean;
}[] = [
  { value: "all", label: "All Statuses", match: () => true },
  {
    value: "completed",
    label: "Completed",
    match: (t) => t.status === "completed",
  },
  {
    value: "approved",
    label: "Approved",
    match: (t, _now, _reviewed, approved) =>
      t.status === "completed" && approved.has(t.id),
  },
  {
    value: "in_review",
    label: "In Review",
    match: (t, _now, reviewed) =>
      t.status === "completed" && !reviewed.has(t.id),
  },
  {
    value: "rejected",
    label: "Rejected",
    match: (t) => t.status === "rejected",
  },
  {
    value: "pending",
    label: "Pending",
    match: (t) => t.status === "pending" || t.status === "in_progress",
  },
  {
    value: "overdue",
    label: "Overdue",
    match: (t, now) =>
      (t.status === "pending" || t.status === "in_progress") &&
      !!t.due_date &&
      new Date(t.due_date) < now,
  },
];

const PAGE_SIZE = 10;

/* ═════════════════════════════════════════════════
   MAIN
   ═════════════════════════════════════════════════ */

export function ManagerReportsClient({
  profile,
  staffList,
  siteLocations,
}: ManagerReportsClientProps) {
  void profile;
  const supabase = useMemo(() => createClient(), []);

  /* ── Filters ── */
  const [dateFrom, setDateFrom] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [siteFilter, setSiteFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("staff");

  /* ── Data ── */
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  /* ── Sort + page ── */
  const [sortKey, setSortKey] = useState<SortKey>("completionRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const fromISO = new Date(`${dateFrom}T00:00:00`).toISOString();
    const toISO = new Date(`${dateTo}T23:59:59`).toISOString();

    let query = supabase
      .from("tasks")
      .select(
        `id, title, status, priority, site_location, assigned_to,
         due_date, completed_at, created_at,
         assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url)`,
      )
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    if (siteFilter !== "all") query = query.eq("site_location", siteFilter);
    if (staffFilter !== "all") query = query.eq("assigned_to", staffFilter);
    if (priorityFilter !== "all") query = query.eq("priority", priorityFilter);

    const [{ data: taskData }, { data: escData }, { data: reviewData }] =
      await Promise.all([
        query,
        supabase
          .from("escalations")
          .select("id, task_id, is_resolved, escalated_at")
          .gte("escalated_at", fromISO)
          .lte("escalated_at", toISO),
        supabase
          .from("task_reviews")
          .select("task_id, action"),
      ]);

    setTasks((taskData || []) as TaskRow[]);
    setEscalations((escData || []) as EscalationRow[]);
    setReviews((reviewData || []) as ReviewRow[]);
    setLoading(false);
  }, [dateFrom, dateTo, siteFilter, staffFilter, priorityFilter, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /* ── Reviewed / approved sets for status filtering ── */
  const { reviewedSet, approvedSet } = useMemo(() => {
    const r = new Set<string>();
    const a = new Set<string>();
    for (const rev of reviews) {
      r.add(rev.task_id);
      if (rev.action === "approved") a.add(rev.task_id);
    }
    return { reviewedSet: r, approvedSet: a };
  }, [reviews]);

  /* ── Apply status filter on the client ── */
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const matcher = STATUS_OPTIONS.find((s) => s.value === statusFilter);
    if (!matcher) return tasks;
    return tasks.filter((t) =>
      matcher.match(t, now, reviewedSet, approvedSet),
    );
  }, [tasks, statusFilter, reviewedSet, approvedSet]);

  /* ── Escalation count by task id ── */
  const escByTaskId = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of escalations) {
      m.set(e.task_id, (m.get(e.task_id) || 0) + 1);
    }
    return m;
  }, [escalations]);

  /* ── Summary metrics ── */
  const summary = useMemo(() => {
    const now = new Date();
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(
      (t) => t.status === "completed",
    ).length;
    const overdue = filteredTasks.filter(
      (t) =>
        (t.status === "pending" || t.status === "in_progress") &&
        t.due_date &&
        new Date(t.due_date) < now,
    ).length;
    let escTotal = 0;
    const idSet = new Set(filteredTasks.map((t) => t.id));
    for (const e of escalations) if (idSet.has(e.task_id)) escTotal += 1;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, overdue, escTotal, completionRate };
  }, [filteredTasks, escalations]);

  /* ── Build report rows ── */
  const reportRows = useMemo<ReportRow[]>(() => {
    const now = new Date();
    type Bucket = {
      label: string;
      avatarUrl?: string | null;
      assigned: number;
      completed: number;
      overdue: number;
      pending: number;
      rejected: number;
      escalations: number;
    };
    const map = new Map<string, Bucket>();

    for (const t of filteredTasks) {
      let key: string;
      let label: string;
      let avatarUrl: string | null | undefined;
      if (groupBy === "staff") {
        key = t.assigned_to;
        const a = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee;
        const fromList = staffList.find((s) => s.id === t.assigned_to);
        label = a?.full_name || fromList?.full_name || "Unknown";
        avatarUrl = (a as { avatar_url?: string | null } | undefined)?.avatar_url;
      } else {
        key = t.site_location || "__unspecified__";
        label = t.site_location || "Unspecified";
      }

      if (!map.has(key))
        map.set(key, {
          label,
          avatarUrl,
          assigned: 0,
          completed: 0,
          overdue: 0,
          pending: 0,
          rejected: 0,
          escalations: 0,
        });
      const b = map.get(key)!;
      b.assigned += 1;
      if (t.status === "completed") b.completed += 1;
      if (t.status === "rejected") b.rejected += 1;
      if (t.status === "pending" || t.status === "in_progress") b.pending += 1;
      if (
        (t.status === "pending" || t.status === "in_progress") &&
        t.due_date &&
        new Date(t.due_date) < now
      )
        b.overdue += 1;
      b.escalations += escByTaskId.get(t.id) || 0;
    }

    return Array.from(map.entries()).map(([key, b]) => ({
      key,
      label: b.label,
      avatarUrl: b.avatarUrl,
      assigned: b.assigned,
      completed: b.completed,
      overdue: b.overdue,
      pending: b.pending,
      rejected: b.rejected,
      escalations: b.escalations,
      completionRate:
        b.assigned > 0 ? Math.round((b.completed / b.assigned) * 100) : 0,
    }));
  }, [filteredTasks, groupBy, escByTaskId, staffList]);

  /* ── Sorted ── */
  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...reportRows].sort((a, b) => {
      if (sortKey === "label") return a.label.localeCompare(b.label) * dir;
      const va = a[sortKey] as number;
      const vb = b[sortKey] as number;
      if (va === vb) return a.label.localeCompare(b.label);
      return (va - vb) * dir;
    });
  }, [reportRows, sortKey, sortDir]);

  /* ── Pagination ── */
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedRows = sortedRows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [groupBy, sortKey, sortDir, dateFrom, dateTo, siteFilter, staffFilter, priorityFilter, statusFilter]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "label" ? "asc" : "desc");
    }
  }

  function resetFilters() {
    setDateFrom(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    setDateTo(format(new Date(), "yyyy-MM-dd"));
    setSiteFilter("all");
    setStaffFilter("all");
    setPriorityFilter("all");
    setStatusFilter("all");
  }

  /* ── Quick range pills ── */
  function applyQuickRange(days: number) {
    setDateTo(format(new Date(), "yyyy-MM-dd"));
    setDateFrom(format(subDays(new Date(), days), "yyyy-MM-dd"));
  }

  const filtersActive =
    siteFilter !== "all" ||
    staffFilter !== "all" ||
    priorityFilter !== "all" ||
    statusFilter !== "all";

  /* ── Export ── */
  async function handleExport() {
    if (sortedRows.length === 0) {
      toast.error("Nothing to export for the current filters");
      return;
    }
    setExporting(true);
    try {
      const groupLabel = groupBy === "staff" ? "Staff Member" : "Site";
      const rows = sortedRows.map((r) => ({
        [groupLabel]: r.label,
        "Assigned Tasks": r.assigned,
        "Completed Tasks": r.completed,
        "Overdue Tasks": r.overdue,
        "Pending Tasks": r.pending,
        "Rejected Tasks": r.rejected,
        Escalations: r.escalations,
        "Completion Rate %": r.completionRate,
      }));
      const stamp = format(new Date(), "yyyy-MM-dd_HHmm");
      const filename = `TaskMe_Report_${groupBy}_${dateFrom}_to_${dateTo}_${stamp}.csv`;
      exportToCSV(rows, filename);
      toast.success("Report exported", {
        description: `${rows.length} row${rows.length === 1 ? "" : "s"} downloaded as CSV`,
      });
    } catch (err) {
      toast.error("Export failed", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setExporting(false);
    }
  }

  /* ═════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════ */

  return (
    <div className="space-y-6 pb-10">
      {/* ════════ HEADER ════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Reports & Export
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Generate and export task performance reports
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading || sortedRows.length === 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1E3A8A] px-5 text-[13px] font-extrabold text-white shadow-lg shadow-[#1E3A8A]/30 transition hover:bg-[#1E3A8A]/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? "Generating…" : "Export CSV"}
        </button>
      </header>

      {/* ════════ FILTERS ════════ */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-[#1E3A8A]">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[14px] font-extrabold text-slate-900">
                Filters
              </h2>
              <p className="text-[11.5px] text-slate-500">
                Narrow the report to a period, team, or focus area
              </p>
            </div>
          </div>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* Quick range pills */}
        <div className="mb-4 -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {[
            { label: "Today", days: 0 },
            { label: "7 days", days: 7 },
            { label: "30 days", days: 30 },
            { label: "90 days", days: 90 },
          ].map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => applyQuickRange(q.days)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12px] font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {q.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterField label="From" icon={<CalendarDays className="h-3.5 w-3.5" />}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </FilterField>
          <FilterField label="To" icon={<CalendarDays className="h-3.5 w-3.5" />}>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom}
              max={format(new Date(), "yyyy-MM-dd")}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </FilterField>
          <FilterField label="Site" icon={<MapPin className="h-3.5 w-3.5" />}>
            <SelectInput
              value={siteFilter}
              onChange={setSiteFilter}
              options={[
                { value: "all", label: "All Sites" },
                ...siteLocations.map((s) => ({ value: s, label: s })),
              ]}
            />
          </FilterField>
          <FilterField label="Staff" icon={<Users className="h-3.5 w-3.5" />}>
            <SelectInput
              value={staffFilter}
              onChange={setStaffFilter}
              options={[
                { value: "all", label: "All Staff" },
                ...staffList.map((s) => ({
                  value: s.id,
                  label: s.full_name,
                })),
              ]}
            />
          </FilterField>
          <FilterField label="Priority">
            <SelectInput
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={PRIORITIES.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
            />
          </FilterField>
          <FilterField label="Status">
            <SelectInput
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
            />
          </FilterField>
        </div>
      </section>

      {/* ════════ SUMMARY METRICS ════════ */}
      <section
        aria-label="Summary metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4"
      >
        <MetricCard
          title="Total Tasks"
          value={loading ? "…" : summary.total}
          label="In selected period"
          icon={<ClipboardList className="h-5 w-5" />}
          variant="info"
        />
        <MetricCard
          title="Completion Rate"
          value={loading ? "…" : `${summary.completionRate}%`}
          label={`${summary.completed} completed`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant={
            summary.completionRate >= 90
              ? "success"
              : summary.completionRate >= 70
                ? "warning"
                : "danger"
          }
        />
        <MetricCard
          title="Overdue Tasks"
          value={loading ? "…" : summary.overdue}
          label={summary.overdue > 0 ? "Action needed" : "On track"}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="danger"
          isUrgent={summary.overdue > 0}
        />
        <MetricCard
          title="Escalations"
          value={loading ? "…" : summary.escTotal}
          label={summary.escTotal > 0 ? "Raised in period" : "None raised"}
          icon={<Flame className="h-5 w-5" />}
          variant="danger"
          isUrgent={summary.escTotal > 0}
        />
      </section>

      {/* ════════ RESULTS ════════ */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[14px] font-extrabold text-slate-900">
                Performance breakdown
              </h2>
              <p className="text-[11.5px] text-slate-500">
                {loading
                  ? "Loading…"
                  : `${sortedRows.length} ${groupBy === "staff" ? "people" : "site"}${
                      sortedRows.length === 1 ? "" : "s"
                    } · ${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          {/* Group toggle */}
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            {(
              [
                { value: "staff", label: "By Staff", icon: Users },
                { value: "site", label: "By Site", icon: MapPin },
              ] as const
            ).map(({ value, label, icon: Icon }) => {
              const active = groupBy === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGroupBy(value)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                    active
                      ? "bg-white text-[#1E3A8A] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <SkeletonTable />
        ) : pagedRows.length === 0 ? (
          <EmptyState onReset={filtersActive ? resetFilters : undefined} />
        ) : (
          <>
            {/* desktop */}
            <div className="hidden md:block">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <SortHeader
                      label={groupBy === "staff" ? "Staff Member" : "Site"}
                      active={sortKey === "label"}
                      dir={sortDir}
                      onClick={() => toggleSort("label")}
                      className="px-5 py-3"
                    />
                    <SortHeader
                      label="Assigned"
                      active={sortKey === "assigned"}
                      dir={sortDir}
                      onClick={() => toggleSort("assigned")}
                      className="px-4 py-3 text-right"
                      align="right"
                    />
                    <SortHeader
                      label="Completed"
                      active={sortKey === "completed"}
                      dir={sortDir}
                      onClick={() => toggleSort("completed")}
                      className="px-4 py-3 text-right"
                      align="right"
                    />
                    <SortHeader
                      label="Overdue"
                      active={sortKey === "overdue"}
                      dir={sortDir}
                      onClick={() => toggleSort("overdue")}
                      className="px-4 py-3 text-right"
                      align="right"
                    />
                    <SortHeader
                      label="Escalations"
                      active={sortKey === "escalations"}
                      dir={sortDir}
                      onClick={() => toggleSort("escalations")}
                      className="px-4 py-3 text-right"
                      align="right"
                    />
                    <SortHeader
                      label="Completion"
                      active={sortKey === "completionRate"}
                      dir={sortDir}
                      onClick={() => toggleSort("completionRate")}
                      className="px-5 py-3 text-right"
                      align="right"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedRows.map((r) => (
                    <tr key={r.key} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {groupBy === "staff" ? (
                            <UserAvatar
                              name={r.label}
                              avatarUrl={r.avatarUrl ?? null}
                              size="sm"
                              className="h-9 w-9 rounded-xl ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[#1E3A8A]">
                              <MapPin className="h-4 w-4" />
                            </div>
                          )}
                          <p className="truncate text-[13px] font-bold text-slate-900">
                            {r.label}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {r.assigned}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                        {r.completed}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.overdue > 0 ? (
                          <span className="font-bold text-red-700">
                            {r.overdue}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.escalations > 0 ? (
                          <span className="font-bold text-amber-700">
                            {r.escalations}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <CompletionCell rate={r.completionRate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {pagedRows.map((r) => (
                <li key={r.key} className="p-4">
                  <div className="flex items-center gap-3">
                    {groupBy === "staff" ? (
                      <UserAvatar
                        name={r.label}
                        avatarUrl={r.avatarUrl ?? null}
                        size="sm"
                        className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#1E3A8A]">
                        <MapPin className="h-5 w-5" />
                      </div>
                    )}
                    <p className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-slate-900">
                      {r.label}
                    </p>
                    <CompletionCell rate={r.completionRate} />
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <Mini label="Assigned" value={r.assigned} />
                    <Mini label="Done" value={r.completed} tone="green" />
                    <Mini
                      label="Overdue"
                      value={r.overdue}
                      tone={r.overdue > 0 ? "red" : "neutral"}
                    />
                    <Mini
                      label="Esc."
                      value={r.escalations}
                      tone={r.escalations > 0 ? "amber" : "neutral"}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                <p className="text-[12px] text-slate-500">
                  Page {safePage} of {pageCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={safePage === pageCount}
                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════
   SUB-COMPONENTS
   ═════════════════════════════════════════════════ */

function FilterField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <th className={className}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition ${
          align === "right" ? "ml-auto" : ""
        } ${active ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-60" />
        )}
      </button>
    </th>
  );
}

function CompletionCell({ rate }: { rate: number }) {
  const color =
    rate >= 90
      ? { bar: "bg-emerald-500", text: "text-emerald-700" }
      : rate >= 70
        ? { bar: "bg-amber-500", text: "text-amber-700" }
        : { bar: "bg-red-500", text: "text-red-700" };
  return (
    <div className="ml-auto inline-flex w-[120px] flex-col items-end gap-1">
      <span
        className={`text-[13px] font-extrabold tabular-nums ${color.text}`}
      >
        {rate}%
      </span>
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <span
          className={`block h-full rounded-full ${color.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
        />
      </span>
    </div>
  );
}

function Mini({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "green" | "red" | "amber";
}) {
  const cls =
    tone === "green"
      ? "text-emerald-700"
      : tone === "red"
        ? "text-red-700"
        : tone === "amber"
          ? "text-amber-700"
          : "text-slate-700";
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2">
      <p className={`text-[14px] font-extrabold tabular-nums ${cls}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        <Sparkles className="h-7 w-7 text-slate-300" />
      </div>
      <h3 className="text-base font-extrabold text-slate-900">
        No data for these filters
      </h3>
      <p className="mt-1 max-w-sm text-[13px] text-slate-500">
        Try widening the date range or clearing some filters.
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset filters
        </button>
      )}
    </div>
  );
}
