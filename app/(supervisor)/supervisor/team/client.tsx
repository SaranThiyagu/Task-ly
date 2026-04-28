"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isPast } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Users,
  ClipboardList,
  ClipboardCheck,
  AlertTriangle,
  Inbox,
  Search,
  ArrowRight,
  MessageSquare,
  Shuffle,
  Mail,
  X,
  TrendingUp,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────
   Design tokens
   Primary  : #1E3A8A
   Success  : #22C55E
   Warning  : #F59E0B
   Danger   : #EF4444
   ───────────────────────────────── */

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: Profile["role"];
  created_at: string;
}

interface TaskRow {
  assigned_to: string;
  status: string;
  due_date: string;
  completed_at: string | null;
}

interface TeamClientProps {
  supervisorName: string;
  staffMembers: StaffMember[];
  taskRows: TaskRow[];
  pendingReviewByStaff: Record<string, number>;
}

type StaffStatus = "on_track" | "needs_attention" | "overloaded";
type FilterKey = "all" | "on_track" | "needs_attention" | "overdue";

interface StaffStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  pendingReviews: number;
  completionRate: number;
  status: StaffStatus;
}

const STATUS_THEME: Record<
  StaffStatus,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    side: string;
    cardBorder: string;
    cardBg: string;
    dot: string;
  }
> = {
  on_track: {
    label: "On Track",
    badgeBg: "bg-emerald-500",
    badgeText: "text-white",
    side: "bg-emerald-500",
    cardBorder: "border-slate-200",
    cardBg: "bg-white",
    dot: "bg-emerald-500",
  },
  needs_attention: {
    label: "Needs Attention",
    badgeBg: "bg-amber-500",
    badgeText: "text-white",
    side: "bg-amber-500",
    cardBorder: "border-amber-200",
    cardBg: "bg-amber-50/30",
    dot: "bg-amber-500",
  },
  overloaded: {
    label: "Overloaded",
    badgeBg: "bg-red-500",
    badgeText: "text-white",
    side: "bg-red-500",
    cardBorder: "border-red-300",
    cardBg: "bg-red-50/30",
    dot: "bg-red-500",
  },
};

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */

export function TeamClient({
  supervisorName,
  staffMembers,
  taskRows: initialTaskRows,
  pendingReviewByStaff,
}: TeamClientProps) {
  const router = useRouter();
  const [taskRows, setTaskRows] = useState(initialTaskRows);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  // Defer time-based logic to avoid SSR/CSR hydration mismatches
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ── Realtime ── */
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("supervisor-team")
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
    setTaskRows(initialTaskRows);
  }, [initialTaskRows]);

  /* ── Per-staff stats ── */
  const statsById = useMemo(() => {
    const map = new Map<string, StaffStats>();
    for (const member of staffMembers) {
      const own = taskRows.filter((t) => t.assigned_to === member.id);
      const completed = own.filter((t) => t.status === "completed").length;
      const active = own.filter(
        (t) => t.status === "pending" || t.status === "in_progress",
      ).length;
      const overdue = mounted
        ? own.filter(
            (t) =>
              (t.status === "pending" || t.status === "in_progress") &&
              isPast(new Date(t.due_date)),
          ).length
        : 0;
      const pendingReviews = pendingReviewByStaff[member.id] || 0;
      const total = own.length;
      const completionRate =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      // Status heuristic
      let status: StaffStatus = "on_track";
      if (overdue >= 2 || active >= 8) status = "overloaded";
      else if (overdue > 0 || active >= 5) status = "needs_attention";

      map.set(member.id, {
        total,
        active,
        completed,
        overdue,
        pendingReviews,
        completionRate,
        status,
      });
    }
    return map;
  }, [staffMembers, taskRows, pendingReviewByStaff, mounted]);

  /* ── Aggregate top stats ── */
  const aggregate = useMemo(() => {
    let activeTotal = 0;
    let pendingReviewsTotal = 0;
    let overdueTotal = 0;
    for (const s of statsById.values()) {
      activeTotal += s.active;
      pendingReviewsTotal += s.pendingReviews;
      overdueTotal += s.overdue;
    }
    return {
      members: staffMembers.length,
      active: activeTotal,
      pendingReviews: pendingReviewsTotal,
      overdue: overdueTotal,
    };
  }, [statsById, staffMembers]);

  /* ── Filter + search ── */
  const visibleStaff = useMemo(() => {
    return staffMembers.filter((m) => {
      const stats = statsById.get(m.id);
      if (filter === "on_track" && stats?.status !== "on_track") return false;
      if (filter === "needs_attention" && stats?.status === "on_track")
        return false;
      if (filter === "overdue" && (stats?.overdue ?? 0) === 0) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          m.full_name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [staffMembers, statsById, filter, search]);

  /* ── Filter chip counts ── */
  const filterCounts = useMemo(() => {
    let onTrack = 0;
    let needsAttention = 0;
    let overdue = 0;
    for (const s of statsById.values()) {
      if (s.status === "on_track") onTrack += 1;
      else needsAttention += 1;
      if (s.overdue > 0) overdue += 1;
    }
    return {
      all: staffMembers.length,
      on_track: onTrack,
      needs_attention: needsAttention,
      overdue,
    };
  }, [statsById, staffMembers]);

  const firstName = supervisorName.split(" ")[0];

  return (
    <div className="space-y-6 pb-10">
      {/* ════════ HEADER ════════ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            My Team
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Manage and monitor your direct reports
          </p>
          <p className="mt-1 text-[12px] text-slate-400" suppressHydrationWarning>
            Welcome back, {firstName} ·{" "}
            {mounted ? format(new Date(), "EEEE, MMMM d, yyyy") : ""}
          </p>
        </div>
        {aggregate.overdue > 0 && mounted && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-bold text-red-700 shadow-sm">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            {aggregate.overdue} overdue across team
          </div>
        )}
      </header>

      {/* ════════ TOP STAT CARDS ════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <TeamStatsCard
          icon={<Users className="h-5 w-5" />}
          tone="blue"
          label="Team Members"
          value={aggregate.members}
          subLabel="Direct reports"
        />
        <TeamStatsCard
          icon={<ClipboardList className="h-5 w-5" />}
          tone="indigo"
          label="Active Tasks"
          value={aggregate.active}
          subLabel="In progress"
        />
        <TeamStatsCard
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="amber"
          label="Pending Reviews"
          value={aggregate.pendingReviews}
          subLabel="Awaiting your review"
        />
        <TeamStatsCard
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
          label="Overdue Tasks"
          value={aggregate.overdue}
          subLabel="Past due date"
          critical
        />
      </div>

      {/* ════════ TOOLBAR ════════ */}
      {staffMembers.length > 0 && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team members..."
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

          {/* Filter pills */}
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {(
              [
                { key: "all", label: "All", tone: "neutral" },
                { key: "on_track", label: "On Track", tone: "green" },
                {
                  key: "needs_attention",
                  label: "Needs Attention",
                  tone: "amber",
                },
                { key: "overdue", label: "Overdue", tone: "red" },
              ] as const
            ).map((f) => {
              const active = filter === f.key;
              const tone =
                f.tone === "green"
                  ? "bg-emerald-500 text-white"
                  : f.tone === "amber"
                    ? "bg-amber-500 text-white"
                    : f.tone === "red"
                      ? "bg-red-500 text-white"
                      : "bg-[#1E3A8A] text-white";
              const dot =
                f.tone === "green"
                  ? "bg-emerald-500"
                  : f.tone === "amber"
                    ? "bg-amber-500"
                    : f.tone === "red"
                      ? "bg-red-500"
                      : "";
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition min-h-[40px] ${
                    active
                      ? `${tone} shadow-md`
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {dot && (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        active ? "bg-white/90" : dot
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
                    {filterCounts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════ TEAM MEMBERS ════════ */}
      {staffMembers.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-7 w-7 text-slate-300" />}
          title="No team members yet"
          message="Staff members will appear here once they're added to the system."
        />
      ) : visibleStaff.length === 0 ? (
        <EmptyState
          icon={<Search className="h-7 w-7 text-slate-300" />}
          title="No team members match"
          message="Try adjusting your search or filter."
          onClear={() => {
            setSearch("");
            setFilter("all");
          }}
        />
      ) : (
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visibleStaff.map((member) => {
            const stats = statsById.get(member.id);
            if (!stats) return null;
            return (
              <TeamMemberCard
                key={member.id}
                member={member}
                stats={stats}
                onMessage={() =>
                  toast.info("Direct messaging is coming soon", {
                    description: `You'd be able to message ${member.full_name}.`,
                  })
                }
                onReassign={() =>
                  toast.info("Bulk reassign is coming soon", {
                    description:
                      "From here you'll be able to redistribute overdue tasks.",
                  })
                }
              />
            );
          })}
        </div>
      )}

      {/* ════════ PERFORMANCE OVERVIEW ════════ */}
      {visibleStaff.length > 0 && (
        <PerformanceOverview
          members={visibleStaff}
          getStats={(id) => statsById.get(id)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TEAM STATS CARD
   ══════════════════════════════════════════════════ */

type StatTone = "blue" | "indigo" | "amber" | "red" | "green";

function TeamStatsCard({
  icon,
  tone,
  label,
  value,
  subLabel,
  critical,
}: {
  icon: React.ReactNode;
  tone: StatTone;
  label: string;
  value: number;
  subLabel?: string;
  critical?: boolean;
}) {
  const tones: Record<
    StatTone,
    { iconBg: string; blob: string; ring: string }
  > = {
    blue: {
      iconBg: "bg-[#1E3A8A]",
      blob: "bg-indigo-500",
      ring: "ring-indigo-100",
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
    red: {
      iconBg: "bg-red-500",
      blob: "bg-red-500",
      ring: "ring-red-100",
    },
    green: {
      iconBg: "bg-emerald-500",
      blob: "bg-emerald-500",
      ring: "ring-emerald-100",
    },
  };
  const t = tones[tone];
  const isCritical = critical && value > 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ring-1 ${t.ring} ${
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
            className={`mt-2 text-4xl font-extrabold tabular-nums leading-none tracking-tight ${
              isCritical ? "text-red-700" : "text-slate-900"
            }`}
          >
            {value}
          </p>
          {subLabel && (
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
   STATUS BADGE
   ══════════════════════════════════════════════════ */

export function StatusBadge({ status }: { status: StaffStatus }) {
  const theme = STATUS_THEME[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider shadow-sm ${theme.badgeBg} ${theme.badgeText}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {theme.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════
   TEAM MEMBER CARD
   ══════════════════════════════════════════════════ */

function TeamMemberCard({
  member,
  stats,
  onMessage,
  onReassign,
}: {
  member: StaffMember;
  stats: StaffStats;
  onMessage: () => void;
  onReassign: () => void;
}) {
  const theme = STATUS_THEME[stats.status];
  const hasOverdue = stats.overdue > 0;

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border ${theme.cardBorder} ${theme.cardBg} shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        hasOverdue ? "shadow-red-500/5" : ""
      }`}
    >
      {/* Side bar */}
      <span className={`absolute inset-y-0 left-0 w-1.5 ${theme.side}`} />

      <div className="space-y-4 p-5 pl-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <UserAvatar
            name={member.full_name}
            avatarUrl={member.avatar_url}
            size="lg"
            className="h-14 w-14 shrink-0 rounded-2xl ring-2 ring-white shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[15px] font-extrabold text-slate-900">
                {member.full_name}
              </p>
              <StatusBadge status={stats.status} />
            </div>
            <p className="mt-1 inline-flex items-center gap-1 truncate text-[12px] text-slate-500">
              <Mail className="h-3 w-3 shrink-0" />
              {member.email}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
              {member.role}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Active"
            value={stats.active}
            tone="blue"
            icon={<ClipboardList className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Reviews"
            value={stats.pendingReviews}
            tone={stats.pendingReviews > 0 ? "amber" : "neutral"}
            icon={<ClipboardCheck className="h-3.5 w-3.5" />}
          />
          <StatTile
            label="Overdue"
            value={stats.overdue}
            tone={stats.overdue > 0 ? "red" : "neutral"}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            pulse={stats.overdue > 0}
          />
        </div>

        {/* Completion bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-bold uppercase tracking-wider text-slate-500">
              Completion
            </span>
            <span className="font-extrabold tabular-nums text-slate-900">
              {stats.completionRate}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                stats.completionRate >= 80
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : stats.completionRate >= 50
                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                    : "bg-gradient-to-r from-red-500 to-red-400"
              }`}
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <p className="mt-1 text-[10.5px] text-slate-400">
            {stats.completed} of {stats.total} tasks completed
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href={`/supervisor/tasks?assignee=${member.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1E3A8A] px-3 py-2.5 text-[12px] font-bold text-white shadow-md shadow-indigo-500/30 transition hover:bg-[#172e6e] active:scale-[0.98] min-h-[40px]"
          >
            View tasks
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={onMessage}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 min-h-[40px]"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Message
          </button>
          {hasOverdue && (
            <button
              type="button"
              onClick={onReassign}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-bold text-red-700 shadow-sm transition hover:bg-red-100 min-h-[40px]"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Reassign
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════════
   STAT TILE (inside member card)
   ══════════════════════════════════════════════════ */

function StatTile({
  label,
  value,
  tone,
  icon,
  pulse,
}: {
  label: string;
  value: number;
  tone: "blue" | "amber" | "red" | "neutral";
  icon: React.ReactNode;
  pulse?: boolean;
}) {
  const tones = {
    blue: "bg-blue-50 text-[#1E3A8A] ring-blue-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    neutral: "bg-slate-50 text-slate-600 ring-slate-100",
  } as const;
  return (
    <div
      className={`flex flex-col items-start gap-1 rounded-xl px-2.5 py-2 ring-1 ${tones[tone]}`}
    >
      <div
        className={`flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider ${
          pulse ? "animate-pulse" : ""
        }`}
      >
        {icon}
        {label}
      </div>
      <span className="text-xl font-extrabold tabular-nums leading-none">
        {value}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PERFORMANCE OVERVIEW
   ══════════════════════════════════════════════════ */

function PerformanceOverview({
  members,
  getStats,
}: {
  members: StaffMember[];
  getStats: (id: string) => StaffStats | undefined;
}) {
  const ranked = [...members]
    .map((m) => ({ member: m, stats: getStats(m.id) }))
    .filter((r) => r.stats && r.stats.total > 0)
    .sort(
      (a, b) =>
        (b.stats?.completionRate ?? 0) - (a.stats?.completionRate ?? 0),
    )
    .slice(0, 8);

  if (ranked.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-indigo-500 shadow-sm">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
              Performance Overview
            </h2>
            <p className="text-[11.5px] text-slate-500">
              Completion rate by team member
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {ranked.map(({ member, stats }) => {
          if (!stats) return null;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/50"
            >
              <UserAvatar
                name={member.full_name}
                avatarUrl={member.avatar_url}
                size="sm"
                className="h-9 w-9 shrink-0 rounded-xl ring-1 ring-slate-200"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-bold text-slate-900">
                    {member.full_name}
                  </p>
                  <span className="text-[12px] font-extrabold tabular-nums text-slate-700">
                    {stats.completionRate}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      stats.completionRate >= 80
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : stats.completionRate >= 50
                          ? "bg-gradient-to-r from-amber-500 to-amber-400"
                          : "bg-gradient-to-r from-red-500 to-red-400"
                    }`}
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </div>
                <p className="mt-1 text-[10.5px] text-slate-400">
                  {stats.completed} of {stats.total} tasks ·{" "}
                  {stats.overdue > 0 ? (
                    <span className="font-bold text-red-600">
                      {stats.overdue} overdue
                    </span>
                  ) : (
                    <span className="text-emerald-600">no overdue</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   EMPTY STATE
   ══════════════════════════════════════════════════ */

function EmptyState({
  icon,
  title,
  message,
  onClear,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        {icon}
      </div>
      <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-xs text-[13px] text-slate-500">{message}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

