"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  subDays,
  startOfMonth,
  startOfWeek,
  differenceInHours,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  ChevronDown,
  Calendar,
  Users,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Hourglass,
  ShieldAlert,
  Sparkles,
  Inbox,
  Search,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { exportToCSV } from "@/lib/export/exportReport";

/* ─────────────────────────────────
   Design tokens
   Primary  : #1E3A8A
   Success  : #22C55E
   Warning  : #F59E0B
   Danger   : #EF4444
   ───────────────────────────────── */

interface StaffOption {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface ReportsClientProps {
  staffList: StaffOption[];
  siteLocations: string[];
}

interface TaskRecord {
  id: string;
  title: string;
  status: string;
  priority: string;
  site_location: string | null;
  assigned_to: string;
  due_date: string;
  completed_at: string | null;
  created_at: string;
}

interface StaffPerf {
  id: string;
  name: string;
  avatarUrl?: string | null;
  assigned: number;
  completed: number;
  inProgress: number;
  pending: number;
  rejected: number;
  overdue: number;
  completionRate: number;
  avgHours: number;
}

interface SummaryMetrics {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  rejected: number;
  overdue: number;
  completionRate: number;
  prevCompletionRate: number;
  avgCompletionHours: number;
}

type StatusKey =
  | "all"
  | "completed"
  | "pending"
  | "in_progress"
  | "rejected"
  | "overdue";

type SortKey =
  | "name"
  | "assigned"
  | "completed"
  | "overdue"
  | "completionRate";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "overdue", label: "Overdue" },
];

const QUICK_RANGES = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "thisWeek", label: "This week" },
  { key: "thisMonth", label: "This month" },
  { key: "90d", label: "Last 90 days" },
] as const;

type QuickRange = (typeof QUICK_RANGES)[number]["key"] | "custom";

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */

export function SupervisorReportsClient({
  staffList,
  siteLocations,
}: ReportsClientProps) {
  void siteLocations;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // SSR guard for time-based UI
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ── Filters ── */
  const [dateFrom, setDateFrom] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [quickRange, setQuickRange] = useState<QuickRange>("30d");
  const [staffFilter, setStaffFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [search, setSearch] = useState("");

  /* ── Sort ── */
  const [sortKey, setSortKey] = useState<SortKey>("assigned");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* ── Data ── */
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics>({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    rejected: 0,
    overdue: 0,
    completionRate: 0,
    prevCompletionRate: 0,
    avgCompletionHours: 0,
  });

  /* ── Quick range application ── */
  const applyQuickRange = useCallback((key: QuickRange) => {
    const now = new Date();
    let from: Date;
    switch (key) {
      case "7d":
        from = subDays(now, 7);
        break;
      case "30d":
        from = subDays(now, 30);
        break;
      case "thisWeek":
        from = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case "thisMonth":
        from = startOfMonth(now);
        break;
      case "90d":
        from = subDays(now, 90);
        break;
      default:
        return;
    }
    setDateFrom(format(from, "yyyy-MM-dd"));
    setDateTo(format(now, "yyyy-MM-dd"));
    setQuickRange(key);
  }, []);

  /* ── Fetch ── */
  const fetchReport = useCallback(async () => {
    setLoading(true);
    const fromISO = new Date(dateFrom + "T00:00:00").toISOString();
    const toISO = new Date(dateTo + "T23:59:59").toISOString();

    let q = supabase
      .from("tasks")
      .select(
        "id, title, status, priority, site_location, assigned_to, due_date, completed_at, created_at",
      )
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    if (staffFilter !== "all") q = q.eq("assigned_to", staffFilter);

    // For "overdue" we let it through and filter client-side because overdue
    // is a derived state (status not completed AND due_date < now).
    if (
      statusFilter !== "all" &&
      statusFilter !== "overdue"
    ) {
      q = q.eq("status", statusFilter);
    }

    const { data, error } = await q;
    if (error) {
      toast.error("Failed to load report data", {
        description: error.message,
      });
      setLoading(false);
      return;
    }

    let rows = (data || []) as TaskRecord[];
    if (statusFilter === "overdue") {
      rows = rows.filter(
        (t) =>
          t.status !== "completed" &&
          t.due_date &&
          new Date(t.due_date) < new Date(),
      );
    }
    setTasks(rows);

    // Previous-period completion rate for trend arrow
    const fromDate = new Date(fromISO);
    const toDate = new Date(toISO);
    const span = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - span);
    const prevTo = new Date(fromDate.getTime() - 1);

    let prevQ = supabase
      .from("tasks")
      .select("status, completed_at")
      .gte("created_at", prevFrom.toISOString())
      .lte("created_at", prevTo.toISOString());
    if (staffFilter !== "all") prevQ = prevQ.eq("assigned_to", staffFilter);
    const { data: prevData } = await prevQ;
    const prevTotal = (prevData || []).length;
    const prevCompleted = (prevData || []).filter(
      (t: { status: string }) => t.status === "completed",
    ).length;
    const prevRate =
      prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;

    // Aggregate summary
    const completed = rows.filter((t) => t.status === "completed");
    const pending = rows.filter((t) => t.status === "pending");
    const inProgress = rows.filter((t) => t.status === "in_progress");
    const rejected = rows.filter((t) => t.status === "rejected");
    const now = new Date();
    const overdue = rows.filter(
      (t) =>
        t.status !== "completed" &&
        t.due_date &&
        new Date(t.due_date) < now,
    );

    const completionTimes = completed
      .filter((t) => t.completed_at && t.created_at)
      .map((t) =>
        differenceInHours(new Date(t.completed_at!), new Date(t.created_at)),
      );
    const avgHours =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

    setSummary({
      total: rows.length,
      completed: completed.length,
      pending: pending.length,
      inProgress: inProgress.length,
      rejected: rejected.length,
      overdue: overdue.length,
      completionRate:
        rows.length > 0
          ? Math.round((completed.length / rows.length) * 100)
          : 0,
      prevCompletionRate: prevRate,
      avgCompletionHours: Math.round(avgHours * 10) / 10,
    });
    setLoading(false);
  }, [supabase, dateFrom, dateTo, staffFilter, statusFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* ── Per-staff aggregation ── */
  const staffPerf: StaffPerf[] = useMemo(() => {
    const map = new Map<
      string,
      {
        assigned: number;
        completed: number;
        pending: number;
        inProgress: number;
        rejected: number;
        overdue: number;
        completionTimes: number[];
      }
    >();

    const now = new Date();
    for (const t of tasks) {
      const sid = t.assigned_to;
      if (!sid) continue;
      if (!map.has(sid)) {
        map.set(sid, {
          assigned: 0,
          completed: 0,
          pending: 0,
          inProgress: 0,
          rejected: 0,
          overdue: 0,
          completionTimes: [],
        });
      }
      const s = map.get(sid)!;
      s.assigned += 1;
      if (t.status === "completed") {
        s.completed += 1;
        if (t.completed_at && t.created_at) {
          s.completionTimes.push(
            differenceInHours(
              new Date(t.completed_at),
              new Date(t.created_at),
            ),
          );
        }
      } else if (t.status === "pending") s.pending += 1;
      else if (t.status === "in_progress") s.inProgress += 1;
      else if (t.status === "rejected") s.rejected += 1;
      if (
        t.status !== "completed" &&
        t.due_date &&
        new Date(t.due_date) < now
      )
        s.overdue += 1;
    }

    const arr: StaffPerf[] = [];
    map.forEach((val, key) => {
      const member = staffList.find((s) => s.id === key);
      const avg =
        val.completionTimes.length > 0
          ? val.completionTimes.reduce((a, b) => a + b, 0) /
            val.completionTimes.length
          : 0;
      arr.push({
        id: key,
        name: member?.full_name || "Unknown",
        avatarUrl: member?.avatar_url ?? null,
        assigned: val.assigned,
        completed: val.completed,
        inProgress: val.inProgress,
        pending: val.pending,
        rejected: val.rejected,
        overdue: val.overdue,
        completionRate:
          val.assigned > 0
            ? Math.round((val.completed / val.assigned) * 100)
            : 0,
        avgHours: Math.round(avg * 10) / 10,
      });
    });

    return arr;
  }, [tasks, staffList]);

  /* ── Search + sort applied to staffPerf ── */
  const visibleStaffPerf = useMemo(() => {
    let arr = staffPerf;
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((s) => s.name.toLowerCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    arr = [...arr].sort((a, b) => {
      let av: number | string = a[sortKey] as number;
      let bv: number | string = b[sortKey] as number;
      if (sortKey === "name") {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
        return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
      }
      return ((av as number) - (bv as number)) * dir;
    });
    return arr;
  }, [staffPerf, search, sortKey, sortDir]);

  /* ── Status breakdown for chart ── */
  const statusBreakdown = useMemo(() => {
    const total = summary.total;
    const totalSafe = total === 0 ? 1 : total;
    return [
      {
        key: "completed",
        label: "Completed",
        value: summary.completed,
        pct: Math.round((summary.completed / totalSafe) * 100),
        bg: "bg-emerald-500",
        soft: "bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      },
      {
        key: "in_progress",
        label: "In Progress",
        value: summary.inProgress,
        pct: Math.round((summary.inProgress / totalSafe) * 100),
        bg: "bg-[#1E3A8A]",
        soft: "bg-blue-50 text-[#1E3A8A]",
        icon: Hourglass,
      },
      {
        key: "pending",
        label: "Pending",
        value: summary.pending,
        pct: Math.round((summary.pending / totalSafe) * 100),
        bg: "bg-amber-500",
        soft: "bg-amber-50 text-amber-700",
        icon: Clock,
      },
      {
        key: "rejected",
        label: "Rejected",
        value: summary.rejected,
        pct: Math.round((summary.rejected / totalSafe) * 100),
        bg: "bg-rose-500",
        soft: "bg-rose-50 text-rose-700",
        icon: XCircle,
      },
    ];
  }, [summary]);

  /* ── Trend ── */
  const trendDelta = summary.completionRate - summary.prevCompletionRate;

  /* ── Sort handler ── */
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  /* ── Refresh ── */
  function handleRefresh() {
    fetchReport();
    router.refresh();
    toast.success("Report refreshed");
  }

  /* ── Reset filters ── */
  function resetFilters() {
    applyQuickRange("30d");
    setStaffFilter("all");
    setStatusFilter("all");
    setSearch("");
  }

  /* ── Export ── */
  function handleExport() {
    if (visibleStaffPerf.length === 0) {
      toast.info("Nothing to export", {
        description: "No staff performance rows in the current view.",
      });
      return;
    }
    const rows = visibleStaffPerf.map((s) => ({
      "Staff Member": s.name,
      Assigned: s.assigned,
      Completed: s.completed,
      "In Progress": s.inProgress,
      Pending: s.pending,
      Rejected: s.rejected,
      Overdue: s.overdue,
      "Completion Rate (%)": s.completionRate,
      "Avg Completion Hours": s.avgHours,
    }));
    exportToCSV(
      rows,
      `TaskMe_Staff_Performance_${dateFrom}_to_${dateTo}.csv`,
    );
    toast.success("CSV exported");
  }

  const activeFilterCount =
    (staffFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (quickRange !== "30d" ? 1 : 0);

  return (
    <div className="space-y-6 pb-10">
      {/* ════════ HEADER ════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Team performance overview
          </p>
          <p className="mt-1 text-[12px] text-slate-400" suppressHydrationWarning>
            {mounted
              ? `${format(new Date(dateFrom), "MMM d, yyyy")} → ${format(
                  new Date(dateTo),
                  "MMM d, yyyy",
                )}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || summary.total === 0}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#1E3A8A] px-3.5 text-[12px] font-bold text-white shadow-md shadow-indigo-500/30 transition hover:bg-[#172e6e] active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* ════════ FILTERS ════════ */}
      <FiltersPanel
        dateFrom={dateFrom}
        dateTo={dateTo}
        quickRange={quickRange}
        staffFilter={staffFilter}
        statusFilter={statusFilter}
        staffList={staffList}
        activeFilterCount={activeFilterCount}
        onQuickRange={applyQuickRange}
        onDateFrom={(v) => {
          setDateFrom(v);
          setQuickRange("custom");
        }}
        onDateTo={(v) => {
          setDateTo(v);
          setQuickRange("custom");
        }}
        onStaff={setStaffFilter}
        onStatus={(s) => setStatusFilter(s)}
        onReset={resetFilters}
      />

      {/* ════════ METRIC CARDS ════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard
          icon={<ClipboardList className="h-5 w-5" />}
          tone="blue"
          label="Total Tasks"
          value={summary.total}
          subLabel="In selected range"
          loading={loading}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
          label="Completion Rate"
          value={`${summary.completionRate}%`}
          subLabel={`${summary.completed} of ${summary.total} completed`}
          loading={loading}
          trend={
            mounted && summary.total > 0
              ? {
                  delta: trendDelta,
                  label:
                    trendDelta > 0
                      ? `+${trendDelta}% vs prev`
                      : trendDelta < 0
                        ? `${trendDelta}% vs prev`
                        : "No change",
                }
              : undefined
          }
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          tone="indigo"
          label="Avg. Completion"
          value={
            summary.avgCompletionHours > 0
              ? `${summary.avgCompletionHours}h`
              : "—"
          }
          subLabel="Per completed task"
          loading={loading}
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
          label="Overdue Tasks"
          value={summary.overdue}
          subLabel={
            summary.overdue > 0 ? "Needs attention" : "All on track"
          }
          loading={loading}
          critical={summary.overdue > 0}
        />
      </div>

      {/* ════════ STATUS BREAKDOWN ════════ */}
      <StatusBreakdownCard data={statusBreakdown} total={summary.total} />

      {/* ════════ STAFF PERFORMANCE TABLE ════════ */}
      <StaffPerformanceTable
        rows={visibleStaffPerf}
        totalRows={staffPerf.length}
        loading={loading}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        search={search}
        onSearch={setSearch}
        onResetFilters={resetFilters}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   FILTERS PANEL
   ══════════════════════════════════════════════════ */

function FiltersPanel({
  dateFrom,
  dateTo,
  quickRange,
  staffFilter,
  statusFilter,
  staffList,
  activeFilterCount,
  onQuickRange,
  onDateFrom,
  onDateTo,
  onStaff,
  onStatus,
  onReset,
}: {
  dateFrom: string;
  dateTo: string;
  quickRange: QuickRange;
  staffFilter: string;
  statusFilter: StatusKey;
  staffList: StaffOption[];
  activeFilterCount: number;
  onQuickRange: (k: QuickRange) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  onStaff: (v: string) => void;
  onStatus: (v: StatusKey) => void;
  onReset: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E3A8A]/10">
            <Filter className="h-3.5 w-3.5 text-[#1E3A8A]" />
          </div>
          <h2 className="text-[13px] font-extrabold tracking-tight text-slate-900">
            Filters
          </h2>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1E3A8A] px-1.5 text-[10.5px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11.5px] font-bold text-[#1E3A8A] hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-4 p-5">
        {/* Quick range pills */}
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {QUICK_RANGES.map((r) => {
            const active = quickRange === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => onQuickRange(r.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition min-h-[36px] ${
                  active
                    ? "bg-[#1E3A8A] text-white shadow-md"
                    : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                {r.label}
              </button>
            );
          })}
          {quickRange === "custom" && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-700 ring-1 ring-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Custom
            </span>
          )}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="From" icon={<Calendar className="h-3.5 w-3.5" />}>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => onDateFrom(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </FilterField>
          <FilterField label="To" icon={<Calendar className="h-3.5 w-3.5" />}>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => onDateTo(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </FilterField>
          <FilterField label="Staff" icon={<Users className="h-3.5 w-3.5" />}>
            <SelectControl
              value={staffFilter}
              onChange={onStaff}
              options={[
                { value: "all", label: "All Staff" },
                ...staffList.map((s) => ({
                  value: s.id,
                  label: s.full_name,
                })),
              ]}
            />
          </FilterField>
          <FilterField
            label="Status"
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
          >
            <SelectControl
              value={statusFilter}
              onChange={(v) => onStatus(v as StatusKey)}
              options={STATUS_OPTIONS.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
            />
          </FilterField>
        </div>
      </div>
    </section>
  );
}

function FilterField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-[13px] text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   METRIC CARD
   ══════════════════════════════════════════════════ */

type MetricTone = "blue" | "green" | "indigo" | "red" | "amber";

export function MetricCard({
  icon,
  tone,
  label,
  value,
  subLabel,
  loading,
  critical,
  trend,
}: {
  icon: React.ReactNode;
  tone: MetricTone;
  label: string;
  value: number | string;
  subLabel?: string;
  loading?: boolean;
  critical?: boolean;
  trend?: { delta: number; label: string };
}) {
  const tones: Record<
    MetricTone,
    { iconBg: string; blob: string; ring: string }
  > = {
    blue: {
      iconBg: "bg-[#1E3A8A]",
      blob: "bg-[#1E3A8A]",
      ring: "ring-blue-100",
    },
    green: {
      iconBg: "bg-emerald-500",
      blob: "bg-emerald-500",
      ring: "ring-emerald-100",
    },
    indigo: {
      iconBg: "bg-indigo-500",
      blob: "bg-indigo-500",
      ring: "ring-indigo-100",
    },
    amber: {
      iconBg: "bg-amber-500",
      blob: "bg-amber-500",
      ring: "ring-amber-100",
    },
    red: { iconBg: "bg-red-500", blob: "bg-red-500", ring: "ring-red-100" },
  };
  const t = tones[tone];
  const isCritical = !!critical;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${t.ring} ${
        isCritical ? "border-red-200 bg-red-50/40" : "border-slate-200"
      }`}
    >
      <div
        className={`pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full opacity-[0.06] ${
          isCritical ? "bg-red-500" : t.blob
        }`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[11px] font-bold uppercase tracking-wider ${
              isCritical ? "text-red-600" : "text-slate-500"
            }`}
          >
            {label}
          </p>
          <p
            className={`mt-2 text-3xl font-extrabold tabular-nums leading-none tracking-tight sm:text-4xl ${
              isCritical ? "text-red-700" : "text-slate-900"
            }`}
          >
            {loading ? (
              <span className="inline-block h-8 w-16 animate-pulse rounded-md bg-slate-100" />
            ) : (
              value
            )}
          </p>
          {trend && !loading && (
            <p
              className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold ${
                trend.delta > 0
                  ? "text-emerald-600"
                  : trend.delta < 0
                    ? "text-red-600"
                    : "text-slate-500"
              }`}
            >
              {trend.delta > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend.delta < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              {trend.label}
            </p>
          )}
          {subLabel && !trend && (
            <p className="mt-1.5 text-[11px] font-medium text-slate-400">
              {subLabel}
            </p>
          )}
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${
            isCritical ? "bg-red-500" : t.iconBg
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   STATUS BREAKDOWN
   ══════════════════════════════════════════════════ */

function StatusBreakdownCard({
  data,
  total,
}: {
  data: {
    key: string;
    label: string;
    value: number;
    pct: number;
    bg: string;
    soft: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
  total: number;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-indigo-500 shadow-sm">
            <ClipboardList className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
              Task Status Breakdown
            </h2>
            <p className="text-[11.5px] text-slate-500">
              {total} task{total === 1 ? "" : "s"} in selected range
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {/* Stacked bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
          {total === 0 ? (
            <div className="h-full w-full bg-slate-100" />
          ) : (
            data.map((d) =>
              d.value > 0 ? (
                <div
                  key={d.key}
                  className={`h-full transition-all ${d.bg}`}
                  style={{ width: `${d.pct}%` }}
                  title={`${d.label}: ${d.value} (${d.pct}%)`}
                />
              ) : null,
            )
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.key}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${d.soft}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {d.label}
                  </p>
                  <p className="text-lg font-extrabold tabular-nums leading-tight text-slate-900">
                    {d.value}
                    <span className="ml-1 text-[10.5px] font-bold text-slate-400">
                      {d.pct}%
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   STAFF PERFORMANCE TABLE
   ══════════════════════════════════════════════════ */

export function StaffPerformanceTable({
  rows,
  totalRows,
  loading,
  sortKey,
  sortDir,
  onSort,
  search,
  onSearch,
  onResetFilters,
}: {
  rows: StaffPerf[];
  totalRows: number;
  loading: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  search: string;
  onSearch: (v: string) => void;
  onResetFilters: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-indigo-500 shadow-sm">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
              Staff Performance
            </h2>
            <p className="text-[11.5px] text-slate-500">
              {totalRows} member{totalRows === 1 ? "" : "s"} with activity
            </p>
          </div>
        </div>
        <div className="relative max-w-xs sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search staff..."
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[12.5px] text-slate-700 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {loading ? (
        <TableLoadingState />
      ) : rows.length === 0 ? (
        <TableEmptyState
          showReset={search.trim() !== "" || totalRows === 0}
          onReset={onResetFilters}
          searchEmpty={search.trim() !== ""}
        />
      ) : (
        <div ref={containerRef} className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50/70">
              <tr className="text-left">
                <SortHeader
                  label="Staff Member"
                  sortKey="name"
                  current={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                  align="left"
                />
                <SortHeader
                  label="Assigned"
                  sortKey="assigned"
                  current={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label="Completed"
                  sortKey="completed"
                  current={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label="Overdue"
                  sortKey="overdue"
                  current={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label="Completion Rate"
                  sortKey="completionRate"
                  current={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <StaffRow key={s.id} row={s} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = "center",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "center";
}) {
  const isActive = current === sortKey;
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 ${
        align === "center" ? "text-center" : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-slate-100 hover:text-slate-700 ${
          isActive ? "text-[#1E3A8A]" : ""
        }`}
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

function StaffRow({ row }: { row: StaffPerf }) {
  const overdueHot = row.overdue > 0;
  return (
    <tr
      className={`group transition hover:bg-slate-50/60 ${
        overdueHot ? "bg-red-50/30" : ""
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <UserAvatar
            name={row.name}
            avatarUrl={row.avatarUrl}
            size="sm"
            className="h-9 w-9 shrink-0 rounded-xl ring-1 ring-slate-200"
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-slate-900">
              {row.name}
            </p>
            {row.avgHours > 0 && (
              <p className="text-[10.5px] text-slate-400">
                Avg {row.avgHours}h to complete
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center text-[13px] font-bold tabular-nums text-slate-700">
        {row.assigned}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center gap-1 text-[13px] font-bold tabular-nums text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {row.completed}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {row.overdue > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
            <AlertTriangle className="h-3 w-3" />
            {row.overdue}
          </span>
        ) : (
          <span className="text-[12.5px] font-bold tabular-nums text-slate-400">
            0
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <CompletionRateCell rate={row.completionRate} />
      </td>
    </tr>
  );
}

function CompletionRateCell({ rate }: { rate: number }) {
  // ≥90 strong green · 70-89 amber · <70 red
  const tone =
    rate >= 90
      ? {
          chip: "bg-emerald-500 text-white",
          bar: "bg-gradient-to-r from-emerald-500 to-emerald-400",
          track: "bg-emerald-50",
        }
      : rate >= 70
        ? {
            chip: "bg-amber-500 text-white",
            bar: "bg-gradient-to-r from-amber-500 to-amber-400",
            track: "bg-amber-50",
          }
        : {
            chip: "bg-red-500 text-white",
            bar: "bg-gradient-to-r from-red-500 to-red-400",
            track: "bg-red-50",
          };

  return (
    <div className="flex items-center justify-center gap-2.5">
      <div
        className={`hidden h-1.5 w-24 overflow-hidden rounded-full ${tone.track} sm:block`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${tone.bar}`}
          style={{ width: `${Math.max(rate, 4)}%` }}
        />
      </div>
      <span
        className={`inline-flex min-w-[52px] justify-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tabular-nums shadow-sm ${tone.chip}`}
      >
        {rate}%
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TABLE LOADING / EMPTY STATES
   ══════════════════════════════════════════════════ */

function TableLoadingState() {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3"
        >
          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="hidden h-2 w-24 animate-pulse rounded-full bg-slate-200 sm:block" />
        </div>
      ))}
    </div>
  );
}

function TableEmptyState({
  showReset,
  onReset,
  searchEmpty,
}: {
  showReset: boolean;
  onReset: () => void;
  searchEmpty: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        <Inbox className="h-7 w-7 text-slate-300" />
      </div>
      <h3 className="text-base font-extrabold text-slate-900">
        {searchEmpty ? "No staff match your search" : "No data for this period"}
      </h3>
      <p className="mt-1 max-w-sm text-[13px] text-slate-500">
        {searchEmpty
          ? "Try a different name or clear the search."
          : "Try a wider date range or different filters to see staff performance."}
      </p>
      {showReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
        >
          {searchEmpty ? "Clear search" : "Reset filters"}
        </button>
      )}
    </div>
  );
}

