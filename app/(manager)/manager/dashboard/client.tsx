"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  format,
  formatDistanceToNowStrict,
  formatDistanceToNow,
} from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Activity,
  Download,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Flame,
  Sparkles,
  BarChart3,
  Clock,
  X,
  MapPin,
  ChevronRight,
  ArrowUpRight,
  Building2,
  Users,
  Plus,
} from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { UserAvatar } from "@/components/ui/user-avatar";
import { exportToCSV } from "@/lib/export/exportReport";
import { CreateTaskModal } from "@/components/supervisor/CreateTaskModal";
import type { StaffOption } from "@/components/supervisor/CreateTaskModal";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────
   Types from server
   ───────────────────────────────── */

interface KPIs {
  totalToday: number;
  completedToday: number;
  completionRate: number;
  completionTrend: number;
  slaPercent: number;
  overdueCount: number;
  activeTasksCount: number;
  pendingReviews: number;
  escalationCount: number;
  criticalEscalations: number;
}

interface EscalationRow {
  id: string;
  reason: string;
  escalated_at: string;
  is_resolved: boolean;
  task:
    | {
        id: string;
        title: string;
        priority: string;
        site_location: string | null;
        assigned_to: string;
      }
    | {
        id: string;
        title: string;
        priority: string;
        site_location: string | null;
        assigned_to: string;
      }[];
  from_profile:
    | Pick<Profile, "id" | "full_name" | "avatar_url">
    | Pick<Profile, "id" | "full_name" | "avatar_url">[];
  to_profile:
    | Pick<Profile, "id" | "full_name" | "avatar_url">
    | Pick<Profile, "id" | "full_name" | "avatar_url">[];
}

interface SitePerf {
  site: string;
  assigned: number;
  completed: number;
  overdue: number;
  escalations: number;
  completionRate: number;
}

interface SupervisorStat {
  id: string;
  full_name: string;
  avatar_url: string | null;
  assigned: number;
  completed: number;
  overdue: number;
  inProgress: number;
  completionRate: number;
  escalationCount: number;
}

interface RecentCompletion {
  id: string;
  title: string;
  completed_at: string | null;
  site_location: string | null;
  assigned_to_profile:
    | Pick<Profile, "full_name" | "avatar_url">
    | Pick<Profile, "full_name" | "avatar_url">[];
}

interface ChartDay {
  iso: string;
  weekday: string;
  monthDay: string;
  completed: number;
  overdue: number;
}

interface ManagerDashboardClientProps {
  profile: Profile;
  kpis: KPIs;
  escalations: EscalationRow[];
  sitePerformance: SitePerf[];
  supervisorBreakdown: SupervisorStat[];
  recentCompletions: RecentCompletion[];
  supervisors: Pick<Profile, "id" | "full_name" | "avatar_url">[];
  staffList: StaffOption[];
  chartData: ChartDay[];
}

function unwrap<T>(val: T | T[]): T | undefined {
  if (val === null || val === undefined) return undefined;
  return Array.isArray(val) ? val[0] : val;
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */

export function ManagerDashboardClient({
  profile,
  kpis,
  escalations: initialEscalations,
  sitePerformance,
  supervisorBreakdown,
  recentCompletions,
  staffList,
  chartData,
}: ManagerDashboardClientProps) {
  const router = useRouter();
  const [escalations, setEscalations] = useState(initialEscalations);
  const [createOpen, setCreateOpen] = useState(false);

  // SSR guard for time-relative UI
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Realtime channel for escalations + tasks
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("manager-overview")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "escalations" },
        () => router.refresh(),
      )
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
    setEscalations(initialEscalations);
  }, [initialEscalations]);

  /* ── Resolve escalation ── */
  async function handleResolve(escalationId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("escalations")
      .update({ is_resolved: true })
      .eq("id", escalationId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEscalations((prev) => prev.filter((e) => e.id !== escalationId));
    toast.success("Escalation resolved");
    router.refresh();
  }

  /* ── Refresh ── */
  function handleRefresh() {
    router.refresh();
    toast.success("Operations data refreshed");
  }

  /* ── Export ── */
  function handleExport() {
    const rows = sitePerformance.map((s) => ({
      Site: s.site,
      Assigned: s.assigned,
      Completed: s.completed,
      Overdue: s.overdue,
      Escalations: s.escalations,
      "Completion Rate (%)": s.completionRate,
    }));
    if (rows.length === 0) {
      toast.info("Nothing to export yet");
      return;
    }
    exportToCSV(
      rows,
      `TaskMe_Operations_Overview_${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    toast.success("Operations report exported");
  }

  /* ── Sorted site performance (worst first) ── */
  const sortedSites = useMemo(
    () =>
      [...sitePerformance].sort((a, b) => {
        // Overdue desc, then completion rate asc, then escalations desc
        if (b.overdue !== a.overdue) return b.overdue - a.overdue;
        if (a.completionRate !== b.completionRate)
          return a.completionRate - b.completionRate;
        return b.escalations - a.escalations;
      }),
    [sitePerformance],
  );

  const inTrouble = kpis.overdueCount > 0 || kpis.criticalEscalations > 0;

  return (
    <div className="space-y-6 pb-10">
      {/* ════════ HEADER ════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Operations Overview
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Cross-team situational awareness for {profile.full_name.split(" ")[0]}
          </p>
          <p
            className="mt-1 text-[12px] text-slate-400"
            suppressHydrationWarning
          >
            {mounted ? format(new Date(), "EEEE, MMMM d, yyyy · h:mm a") : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 text-[12px] font-bold text-[#1E3A8A] shadow-sm transition hover:bg-indigo-100"
          >
            <Plus className="h-3.5 w-3.5" />
            New Task
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#1E3A8A] px-3.5 text-[12px] font-bold text-white shadow-md shadow-indigo-500/30 transition hover:bg-[#172e6e] active:scale-[0.98]"
          >
            <Download className="h-3.5 w-3.5" />
            Export Report
          </button>
        </div>
      </header>

      <CreateTaskModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        staffList={staffList}
      />

      {/* ════════ ALERT BANNER ════════ */}
      {inTrouble && (
        <OperationsAlertBanner
          overdue={kpis.overdueCount}
          escalations={kpis.escalationCount}
          critical={kpis.criticalEscalations}
        />
      )}

      {/* ════════ METRICS GRID — 2×2 EXECUTIVE VIEW ════════ */}
      <section
        aria-label="Key operational metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4"
      >
        {/* 1 — TOTAL TASKS TODAY (neutral / informational) */}
        <MetricCard
          title="Total Tasks Today"
          value={kpis.totalToday}
          label={`${kpis.activeTasksCount} active across all teams`}
          icon={<Activity />}
          variant="info"
        />

        {/* 2 — COMPLETION RATE (with trend) */}
        <MetricCard
          title="Completion Rate"
          value={`${kpis.completionRate}%`}
          label={`${kpis.completedToday} done today`}
          icon={<TrendingUp />}
          variant={
            kpis.completionRate >= 90
              ? "success"
              : kpis.completionRate >= 70
                ? "warning"
                : "danger"
          }
          trend={
            kpis.completionTrend === 0
              ? null
              : kpis.completionTrend > 0
                ? "up"
                : "down"
          }
          trendValue={
            kpis.completionTrend !== 0
              ? `${kpis.completionTrend > 0 ? "+" : ""}${kpis.completionTrend}%`
              : undefined
          }
          isUrgent={kpis.completionRate < 70}
        />

        {/* 3 — OVERDUE TASKS (strongest urgency) */}
        <MetricCard
          title="Overdue Tasks"
          value={kpis.overdueCount}
          label={
            kpis.overdueCount > 0
              ? "Past due across all teams"
              : "Everything on schedule"
          }
          icon={<AlertOctagon />}
          variant="danger"
          isUrgent={kpis.overdueCount > 0}
        />

        {/* 4 — ESCALATIONS */}
        <MetricCard
          title="Escalations"
          value={kpis.escalationCount}
          label={
            kpis.criticalEscalations > 0
              ? `${kpis.criticalEscalations} critical · need action`
              : kpis.escalationCount > 0
                ? "Open across all sites"
                : "None open"
          }
          icon={<ShieldAlert />}
          variant="danger"
          isUrgent={kpis.escalationCount > 0}
        />
      </section>

      {/* ════════ QUICK ACTIONS ════════ */}
      <QuickActions
        escalationCount={kpis.escalationCount}
        overdueCount={kpis.overdueCount}
        pendingReviews={kpis.pendingReviews}
        supervisorCount={supervisorBreakdown.length}
      />

      {/* ════════ TWO-COLUMN: ESCALATIONS + ACTIVITY ════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-4">
        {/* Escalations feed (2/3) */}
        <div className="lg:col-span-2">
          <EscalationsFeed
            escalations={escalations}
            mounted={mounted}
            onResolve={handleResolve}
          />
        </div>

        {/* Recent activity (1/3) */}
        <div className="lg:col-span-1">
          <RecentActivityFeed
            completions={recentCompletions}
            mounted={mounted}
          />
        </div>
      </div>

      {/* ════════ SITE PERFORMANCE ════════ */}
      <SitePerformanceTable rows={sortedSites} />

      {/* ════════ SUPERVISOR BREAKDOWN ════════ */}
      <SupervisorBreakdown supervisors={supervisorBreakdown} />

      {/* ════════ 7-DAY TREND ════════ */}
      <SevenDayTrend chartData={chartData} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   ALERT BANNER
   ══════════════════════════════════════════════════ */

function OperationsAlertBanner({
  overdue,
  escalations,
  critical,
}: {
  overdue: number;
  escalations: number;
  critical: number;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const isCritical = critical > 0;

  // Headline
  const parts: string[] = [];
  if (overdue > 0)
    parts.push(
      `${overdue} task${overdue === 1 ? "" : "s"} require${overdue === 1 ? "s" : ""} immediate attention`,
    );
  if (critical > 0) {
    parts.push(
      `${critical} critical escalation${critical === 1 ? "" : "s"}`,
    );
  } else if (escalations > 0) {
    parts.push(
      `${escalations} open escalation${escalations === 1 ? "" : "s"}`,
    );
  }

  const primaryHref =
    critical > 0 || escalations > 0
      ? "/manager/escalations"
      : "/manager/tasks?status=overdue";
  const primaryLabel =
    critical > 0 || escalations > 0
      ? "View escalations"
      : "View overdue tasks";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 p-5 shadow-md ${
        isCritical
          ? "border-red-300 bg-gradient-to-r from-red-50 to-red-100/40"
          : "border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/40"
      }`}
    >
      {/* Pulsing dot */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-3 inline-flex h-2.5 w-2.5"
      >
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
            isCritical ? "bg-red-500" : "bg-amber-500"
          }`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            isCritical ? "bg-red-500" : "bg-amber-500"
          }`}
        />
      </span>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md ${
              isCritical ? "bg-red-500" : "bg-amber-500"
            }`}
          >
            {isCritical ? (
              <Flame className="h-6 w-6 text-white" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p
              className={`text-[11px] font-bold uppercase tracking-wider ${
                isCritical ? "text-red-700" : "text-amber-700"
              }`}
            >
              {isCritical ? "Critical · Action required" : "Attention required"}
            </p>
            <p
              className={`mt-1 text-[15px] font-extrabold ${
                isCritical ? "text-red-800" : "text-amber-900"
              }`}
            >
              {parts.join(" · ")}
            </p>
            <p
              className={`mt-0.5 text-[12px] font-medium ${
                isCritical ? "text-red-600" : "text-amber-700"
              }`}
            >
              Drill down and triage now to keep operations on track.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Link
            href={primaryHref}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold text-white shadow-md transition active:scale-[0.98] min-h-[40px] ${
              isCritical
                ? "bg-red-600 hover:bg-red-700 shadow-red-500/30"
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/30"
            }`}
          >
            {primaryLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss alert"
            className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-white/60 transition hover:bg-white ${
              isCritical
                ? "border-red-200 text-red-600"
                : "border-amber-200 text-amber-700"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   QUICK ACTIONS
   ══════════════════════════════════════════════════ */

function QuickActions({
  escalationCount,
  overdueCount,
  pendingReviews,
  supervisorCount,
}: {
  escalationCount: number;
  overdueCount: number;
  pendingReviews: number;
  supervisorCount: number;
}) {
  const items = [
    {
      href: "/manager/escalations",
      icon: ShieldAlert,
      label: "View All Escalations",
      sub:
        escalationCount > 0
          ? `${escalationCount} open · needs action`
          : "All clear",
      tone: "red" as const,
    },
    {
      // Overdue tasks auto-escalate at 3h → manager resolves via escalations page
      href: "/manager/escalations",
      icon: AlertOctagon,
      label: "Resolve Overdue",
      sub:
        overdueCount > 0
          ? `${overdueCount} past due · auto-escalated`
          : "No overdue tasks",
      tone: "amber" as const,
    },
    {
      href: "/manager/team",
      icon: Users,
      label: "Team Performance",
      sub:
        supervisorCount > 0
          ? `${supervisorCount} supervisor${supervisorCount === 1 ? "" : "s"} · ${pendingReviews} reviews pending`
          : "View all staff",
      tone: "blue" as const,
    },
    {
      href: "/manager/reports",
      icon: BarChart3,
      label: "Generate Report",
      sub: "Filter · export · analyse",
      tone: "indigo" as const,
    },
  ];

  return (
    <section
      aria-label="Quick actions"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {items.map((it) => {
        const tones = {
          red: {
            iconBg: "bg-red-500",
            ring: "ring-red-100 hover:ring-red-200",
          },
          amber: {
            iconBg: "bg-amber-500",
            ring: "ring-amber-100 hover:ring-amber-200",
          },
          blue: {
            iconBg: "bg-[#1E3A8A]",
            ring: "ring-blue-100 hover:ring-blue-200",
          },
          indigo: {
            iconBg: "bg-indigo-500",
            ring: "ring-indigo-100 hover:ring-indigo-200",
          },
        };
        const t = tones[it.tone];
        const Icon = it.icon;
        return (
          <Link
            key={it.label}
            href={it.href}
            className={`group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${t.ring}`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${t.iconBg}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold text-slate-900">
                {it.label}
              </p>
              <p className="truncate text-[11.5px] text-slate-500">{it.sub}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
          </Link>
        );
      })}
    </section>
  );
}

/* ══════════════════════════════════════════════════
   ESCALATIONS FEED
   ══════════════════════════════════════════════════ */

function EscalationsFeed({
  escalations,
  mounted,
  onResolve,
}: {
  escalations: EscalationRow[];
  mounted: boolean;
  onResolve: (id: string) => void;
}) {
  const visible = escalations.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-sm">
            <ShieldAlert className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
              Open Escalations
            </h2>
            <p className="text-[11.5px] text-slate-500">
              {escalations.length === 0
                ? "Nothing escalated"
                : `${escalations.length} open · showing ${visible.length}`}
            </p>
          </div>
        </div>
        {escalations.length > 0 && (
          <Link
            href="/manager/escalations"
            className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#1E3A8A] hover:underline"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </header>

      {escalations.length === 0 ? (
        <EmptyBlock
          icon={<Sparkles className="h-7 w-7 text-emerald-400" />}
          title="All clear"
          message="No open escalations across the operation. Nice work."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((esc) => {
            const task = unwrap(esc.task);
            const from = unwrap(esc.from_profile);
            const reason =
              typeof esc.reason === "string" ? esc.reason : "";
            const isCritical =
              reason.startsWith("CRITICAL:") ||
              task?.priority === "critical";
            const cleanReason = reason.replace(/^CRITICAL:\s*/i, "");

            return (
              <li
                key={esc.id}
                className={`px-5 py-4 transition hover:bg-slate-50/50 ${
                  isCritical ? "bg-red-50/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                      isCritical
                        ? "bg-red-500 text-white"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isCritical ? (
                      <Flame className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13.5px] font-extrabold text-slate-900">
                        {task?.title || "Unknown task"}
                      </p>
                      {isCritical && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                          <Flame className="h-2.5 w-2.5" />
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12.5px] italic text-slate-600 line-clamp-2">
                      “{cleanReason || "No reason provided"}”
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500">
                      {from && (
                        <span className="inline-flex items-center gap-1">
                          <UserAvatar
                            name={from.full_name}
                            avatarUrl={from.avatar_url}
                            size="sm"
                            className="h-4 w-4 rounded-full"
                          />
                          <span className="font-bold text-slate-700">
                            {from.full_name}
                          </span>
                        </span>
                      )}
                      {task?.site_location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {task.site_location}
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1"
                        suppressHydrationWarning
                      >
                        <Clock className="h-3 w-3" />
                        {mounted
                          ? formatDistanceToNowStrict(
                              new Date(esc.escalated_at),
                              { addSuffix: true },
                            )
                          : "recently"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onResolve(esc.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-[0.98]"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Resolve
                    </button>
                    {task?.id && (
                      <Link
                        href={`/manager/tasks/${task.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        View
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════
   RECENT ACTIVITY FEED
   ══════════════════════════════════════════════════ */

function RecentActivityFeed({
  completions,
  mounted,
}: {
  completions: RecentCompletion[];
  mounted: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
            Recent Activity
          </h2>
          <p className="text-[11.5px] text-slate-500">
            Latest completions
          </p>
        </div>
      </header>

      {completions.length === 0 ? (
        <EmptyBlock
          icon={<Clock className="h-7 w-7 text-slate-300" />}
          title="No activity yet"
          message="Completed tasks will appear here as your teams finish work."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {completions.map((c) => {
            const staff = unwrap(c.assigned_to_profile);
            return (
              <li
                key={c.id}
                className="flex items-start gap-3 px-5 py-3 transition hover:bg-slate-50/50"
              >
                <UserAvatar
                  name={staff?.full_name || "Unknown"}
                  avatarUrl={staff?.avatar_url || null}
                  size="sm"
                  className="h-8 w-8 shrink-0 rounded-xl ring-1 ring-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-slate-900">
                    {staff?.full_name || "Someone"}
                  </p>
                  <p className="truncate text-[11.5px] text-slate-500">
                    completed{" "}
                    <span className="font-medium text-slate-700">
                      {c.title}
                    </span>
                  </p>
                  <p
                    className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-slate-400"
                    suppressHydrationWarning
                  >
                    <Clock className="h-2.5 w-2.5" />
                    {mounted && c.completed_at
                      ? formatDistanceToNow(new Date(c.completed_at), {
                          addSuffix: true,
                        })
                      : "recently"}
                    {c.site_location ? (
                      <>
                        <span className="px-0.5">·</span>
                        <MapPin className="h-2.5 w-2.5" />
                        {c.site_location}
                      </>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════
   SITE PERFORMANCE TABLE
   ══════════════════════════════════════════════════ */

function SitePerformanceTable({ rows }: { rows: SitePerf[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-indigo-500 shadow-sm">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
              Site Performance
            </h2>
            <p className="text-[11.5px] text-slate-500">
              {rows.length} site{rows.length === 1 ? "" : "s"} · sorted by risk
            </p>
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyBlock
          icon={<Building2 className="h-7 w-7 text-slate-300" />}
          title="No site data"
          message="Once tasks are tagged with a site, performance will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="bg-slate-50/70">
              <tr className="text-left">
                <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Site
                </th>
                <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Assigned
                </th>
                <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Completed
                </th>
                <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Overdue
                </th>
                <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Escalations
                </th>
                <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Completion Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => {
                const hot = s.overdue > 0 || s.escalations > 0;
                return (
                  <tr
                    key={s.site}
                    className={`transition hover:bg-slate-50/60 ${
                      hot ? "bg-red-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 ring-1 ring-blue-100">
                          <MapPin className="h-3.5 w-3.5 text-[#1E3A8A]" />
                        </div>
                        <p className="truncate text-[13px] font-bold text-slate-900">
                          {s.site}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] font-bold tabular-nums text-slate-700">
                      {s.assigned}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[13px] font-bold tabular-nums text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {s.completed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
                          <AlertTriangle className="h-3 w-3" />
                          {s.overdue}
                        </span>
                      ) : (
                        <span className="text-[12.5px] font-bold tabular-nums text-slate-400">
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.escalations > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
                          <ShieldAlert className="h-3 w-3" />
                          {s.escalations}
                        </span>
                      ) : (
                        <span className="text-[12.5px] font-bold tabular-nums text-slate-400">
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CompletionRateCell rate={s.completionRate} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CompletionRateCell({ rate }: { rate: number }) {
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
    <div className="flex items-center gap-2.5">
      <div
        className={`hidden h-1.5 w-24 overflow-hidden rounded-full sm:block ${tone.track}`}
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
   7-DAY TREND (lightweight inline bars)
   ══════════════════════════════════════════════════ */

function SevenDayTrend({ chartData }: { chartData: ChartDay[] }) {
  const max = Math.max(
    1,
    ...chartData.map((d) => Math.max(d.completed, d.overdue)),
  );
  const totals = chartData.reduce(
    (acc, d) => ({
      completed: acc.completed + d.completed,
      overdue: acc.overdue + d.overdue,
    }),
    { completed: 0, overdue: 0 },
  );

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-[#1E3A8A] shadow-sm">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
              Last 7 Days
            </h2>
            <p className="text-[11.5px] text-slate-500">
              Completed vs overdue
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11.5px]">
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Completed · {totals.completed}
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-red-700">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Overdue · {totals.overdue}
          </span>
        </div>
      </header>

      <div className="px-5 py-6">
        <div className="grid grid-cols-7 gap-2">
          {chartData.map((d) => {
            const cH = (d.completed / max) * 100;
            const oH = (d.overdue / max) * 100;
            return (
              <div
                key={d.iso}
                className="flex flex-col items-center gap-2"
              >
                <div className="flex h-32 w-full items-end justify-center gap-1">
                  <div
                    className="w-3 rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-sm transition-all"
                    style={{ height: `${Math.max(cH, 3)}%` }}
                    title={`Completed: ${d.completed}`}
                  />
                  <div
                    className="w-3 rounded-t-md bg-gradient-to-t from-red-500 to-red-400 shadow-sm transition-all"
                    style={{ height: `${Math.max(oH, 3)}%` }}
                    title={`Overdue: ${d.overdue}`}
                  />
                </div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  {d.weekday}
                </p>
                <p className="text-[10.5px] tabular-nums text-slate-400">
                  {d.monthDay}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   SUPERVISOR BREAKDOWN
   ══════════════════════════════════════════════════ */

function SupervisorBreakdown({
  supervisors,
}: {
  supervisors: SupervisorStat[];
}) {
  // Sort: worst performers first (overdue desc → escalations desc → rate asc)
  const sorted = [...supervisors].sort((a, b) => {
    if (b.overdue !== a.overdue) return b.overdue - a.overdue;
    if (b.escalationCount !== a.escalationCount)
      return b.escalationCount - a.escalationCount;
    return a.completionRate - b.completionRate;
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-[#1E3A8A] shadow-sm">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
              Supervisor Performance
            </h2>
            <p className="text-[11.5px] text-slate-500">
              {supervisors.length === 0
                ? "No supervisors found"
                : `${supervisors.length} supervisor${supervisors.length === 1 ? "" : "s"} · task ownership by team lead`}
            </p>
          </div>
        </div>
        <Link
          href="/manager/team?role=supervisor"
          className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#1E3A8A] hover:underline"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {supervisors.length === 0 ? (
        <EmptyBlock
          icon={<Users className="h-7 w-7 text-slate-300" />}
          title="No supervisors yet"
          message="Once supervisors are added to the system and create tasks, their performance will appear here."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50/70">
                <tr className="text-left">
                  <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Supervisor
                  </th>
                  <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Assigned
                  </th>
                  <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    In Progress
                  </th>
                  <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Overdue
                  </th>
                  <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Escalations
                  </th>
                  <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((sup) => {
                  const atRisk = sup.overdue > 0 || sup.escalationCount > 0;
                  const isStrong =
                    sup.completionRate >= 90 && sup.overdue === 0;
                  return (
                    <tr
                      key={sup.id}
                      className={`transition hover:bg-slate-50/60 ${
                        atRisk ? "bg-red-50/20" : isStrong ? "bg-emerald-50/20" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={sup.full_name}
                            avatarUrl={sup.avatar_url}
                            size="sm"
                            className="h-8 w-8 shrink-0 rounded-xl ring-1 ring-slate-200"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-bold text-slate-900">
                              {sup.full_name}
                            </p>
                            <span className="inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                              Supervisor
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-[13px] font-bold tabular-nums text-slate-700">
                        {sup.assigned}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[13px] font-bold tabular-nums text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {sup.completed}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[13px] font-bold tabular-nums text-blue-700">
                          <Activity className="h-3.5 w-3.5" />
                          {sup.inProgress}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sup.overdue > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
                            <AlertTriangle className="h-3 w-3" />
                            {sup.overdue}
                          </span>
                        ) : (
                          <span className="text-[12.5px] font-bold tabular-nums text-slate-400">
                            0
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sup.escalationCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
                            <ShieldAlert className="h-3 w-3" />
                            {sup.escalationCount}
                          </span>
                        ) : (
                          <span className="text-[12.5px] font-bold tabular-nums text-slate-400">
                            0
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <CompletionRateCell rate={sup.completionRate} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {sorted.map((sup) => {
              const atRisk = sup.overdue > 0 || sup.escalationCount > 0;
              return (
                <li
                  key={sup.id}
                  className={`px-4 py-4 ${atRisk ? "bg-red-50/20" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={sup.full_name}
                      avatarUrl={sup.avatar_url}
                      size="sm"
                      className="h-9 w-9 shrink-0 rounded-xl ring-1 ring-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-bold text-slate-900">
                          {sup.full_name}
                        </p>
                        <CompletionRateCell rate={sup.completionRate} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-600">
                          <Activity className="h-3 w-3" />
                          {sup.assigned} assigned
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          {sup.completed} done
                        </span>
                        {sup.overdue > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-extrabold text-red-700">
                            <AlertTriangle className="h-3 w-3" />
                            {sup.overdue} overdue
                          </span>
                        )}
                        {sup.escalationCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-extrabold text-amber-700">
                            <ShieldAlert className="h-3 w-3" />
                            {sup.escalationCount} escalations
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════
   EMPTY BLOCK
   ══════════════════════════════════════════════════ */

function EmptyBlock({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        {icon}
      </div>
      <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-xs text-[13px] text-slate-500">{message}</p>
    </div>
  );
}
