"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  Users,
  ShieldCheck,
  Trophy,
  AlertTriangle,
  TrendingUp,
  Search,
  X,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────
   Types
   ───────────────────────────────── */

export interface PersonStats {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: "staff" | "supervisor";
  assigned: number;
  completed: number;
  inProgress: number;
  overdue: number;
  rejected: number;
  escalations: number;
  onTime: number;
  completionRate: number;
  onTimeRate: number;
  avgCycleHours: number | null;
  lastActivity: string | null;
}

export interface SiteStats {
  site: string;
  assigned: number;
  completed: number;
  overdue: number;
  headcount: number;
  completionRate: number;
}

interface TeamTotals {
  headcount: number;
  supervisors: number;
  assigned: number;
  completed: number;
  overdue: number;
  completionRate: number;
  onTimeRate: number;
}

interface ManagerTeamClientProps {
  profile: Profile;
  people: PersonStats[];
  sites: SiteStats[];
  teamTotals: TeamTotals;
}

type RoleFilter = "staff" | "supervisor" | "all";
type SortKey =
  | "name"
  | "completionRate"
  | "assigned"
  | "completed"
  | "overdue"
  | "escalations";
type SortDir = "asc" | "desc";

/* ══════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════ */

export function ManagerTeamClient({
  profile,
  people,
  sites,
  teamTotals,
}: ManagerTeamClientProps) {
  void profile;
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("staff");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("completionRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ── Visible rows ── */
  const visible = useMemo(() => {
    let rows = people;
    if (roleFilter !== "all") rows = rows.filter((p) => p.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((p) => p.full_name.toLowerCase().includes(q));
    }

    return [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.full_name.localeCompare(b.full_name) * dir;
      const va = (a[sortKey] as number) ?? 0;
      const vb = (b[sortKey] as number) ?? 0;
      if (va === vb) return a.full_name.localeCompare(b.full_name);
      return (va - vb) * dir;
    });
  }, [people, roleFilter, search, sortKey, sortDir]);

  /* ── Top performers (staff with ≥3 completed, sorted by rate) ── */
  const topPerformers = useMemo(() => {
    return people
      .filter((p) => p.role === "staff" && p.completed >= 3)
      .sort((a, b) => {
        if (b.completionRate !== a.completionRate)
          return b.completionRate - a.completionRate;
        if (b.onTimeRate !== a.onTimeRate) return b.onTimeRate - a.onTimeRate;
        return b.completed - a.completed;
      })
      .slice(0, 3);
  }, [people]);

  /* ── At-risk staff (overdue > 0 OR rate < 60 with assigned > 0) ── */
  const atRisk = useMemo(() => {
    return people
      .filter(
        (p) =>
          p.role === "staff" &&
          p.assigned > 0 &&
          (p.overdue > 0 || p.completionRate < 60 || p.escalations > 0),
      )
      .sort((a, b) => {
        if (b.overdue !== a.overdue) return b.overdue - a.overdue;
        if (b.escalations !== a.escalations) return b.escalations - a.escalations;
        return a.completionRate - b.completionRate;
      })
      .slice(0, 3);
  }, [people]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ════════ HEADER ════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Team Performance
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Workload, throughput, and reliability across staff and supervisors
          </p>
        </div>
        <Link
          href="/manager/dashboard"
          className="inline-flex h-10 items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          Back to overview
        </Link>
      </header>

      {/* ════════ TEAM KPI STRIP ════════ */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiTile
          icon={<Users className="h-5 w-5" />}
          label="Headcount"
          value={teamTotals.headcount}
          sub={`${teamTotals.supervisors} supervisor${teamTotals.supervisors === 1 ? "" : "s"}`}
          tone="indigo"
        />
        <KpiTile
          icon={<TrendingUp className="h-5 w-5" />}
          label="Completion rate"
          value={`${teamTotals.completionRate}%`}
          sub={`${teamTotals.completed} of ${teamTotals.assigned} tasks`}
          tone={
            teamTotals.completionRate >= 90
              ? "green"
              : teamTotals.completionRate >= 70
                ? "amber"
                : "red"
          }
        />
        <KpiTile
          icon={<ShieldCheck className="h-5 w-5" />}
          label="On-time rate"
          value={`${teamTotals.onTimeRate}%`}
          sub="Of completed tasks"
          tone={
            teamTotals.onTimeRate >= 90
              ? "green"
              : teamTotals.onTimeRate >= 70
                ? "amber"
                : "red"
          }
        />
        <KpiTile
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Overdue"
          value={teamTotals.overdue}
          sub="Across the team"
          tone={teamTotals.overdue > 0 ? "red" : "neutral"}
          urgent={teamTotals.overdue > 0}
        />
      </section>

      {/* ════════ SPOTLIGHT ROW ════════ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SpotlightCard
          title="Top performers"
          subtitle="Highest completion rate (min. 3 completed)"
          icon={<Trophy className="h-4 w-4 text-emerald-600" />}
          tone="green"
          empty="No qualifying performers yet"
        >
          {topPerformers.map((p, idx) => (
            <SpotlightRow
              key={p.id}
              person={p}
              rank={idx + 1}
              metric={`${p.completionRate}%`}
              metricLabel={`${p.completed} done`}
              tone="green"
            />
          ))}
        </SpotlightCard>

        <SpotlightCard
          title="Needs attention"
          subtitle="Overdue, escalations, or rate < 60%"
          icon={<Flame className="h-4 w-4 text-red-600" />}
          tone="red"
          empty="Nobody is at risk right now"
        >
          {atRisk.map((p) => (
            <SpotlightRow
              key={p.id}
              person={p}
              metric={
                p.overdue > 0
                  ? `${p.overdue} overdue`
                  : p.escalations > 0
                    ? `${p.escalations} escalation${p.escalations === 1 ? "" : "s"}`
                    : `${p.completionRate}%`
              }
              metricLabel={
                p.overdue > 0
                  ? `${p.completionRate}% rate`
                  : `${p.assigned} assigned`
              }
              tone="red"
            />
          ))}
        </SpotlightCard>
      </section>

      {/* ════════ TOOLBAR ════════ */}
      <section className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-[14px] text-slate-700 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {(
            [
              {
                key: "staff",
                label: "Staff",
                count: people.filter((p) => p.role === "staff").length,
              },
              {
                key: "supervisor",
                label: "Supervisors",
                count: people.filter((p) => p.role === "supervisor").length,
              },
              { key: "all", label: "All", count: people.length },
            ] as const
          ).map((f) => {
            const active = roleFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setRoleFilter(f.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition min-h-[40px] ${
                  active
                    ? "bg-[#1E3A8A] text-white shadow-md"
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
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ════════ PEOPLE TABLE ════════ */}
      {visible.length === 0 ? (
        <EmptyState
          title="No people match"
          message={
            search
              ? "Try a different search term."
              : "There's nobody in this group yet."
          }
        />
      ) : (
        <PeopleTable
          rows={visible}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          mounted={mounted}
          showStaffMetrics={roleFilter !== "supervisor"}
        />
      )}

      {/* ════════ SITE ROLLUP ════════ */}
      {sites.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-extrabold text-slate-900">
                Site rollup
              </h2>
              <p className="text-[12px] text-slate-500">
                Coverage and completion by site
              </p>
            </div>
          </div>
          <SiteTable sites={sites} />
        </section>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   KPI TILE
   ══════════════════════════════════════════════════ */

function KpiTile({
  icon,
  label,
  value,
  sub,
  tone,
  urgent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  tone: "indigo" | "green" | "amber" | "red" | "neutral";
  urgent?: boolean;
}) {
  const tones = {
    indigo: { bg: "bg-[#1E3A8A]", ring: "ring-indigo-100" },
    green: { bg: "bg-emerald-500", ring: "ring-emerald-100" },
    amber: { bg: "bg-amber-500", ring: "ring-amber-100" },
    red: { bg: "bg-red-500", ring: "ring-red-100" },
    neutral: { bg: "bg-slate-400", ring: "ring-slate-100" },
  } as const;
  const t = tones[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${t.ring} ${
        urgent ? "border-red-200 bg-red-50/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[11px] font-bold uppercase tracking-wider ${
              urgent ? "text-red-600" : "text-slate-500"
            }`}
          >
            {label}
          </p>
          <p
            className={`mt-2 text-3xl font-extrabold tabular-nums leading-none tracking-tight sm:text-[32px] ${
              urgent ? "text-red-700" : "text-slate-900"
            }`}
          >
            {value}
          </p>
          {sub && (
            <p className="mt-1.5 text-[11.5px] font-medium text-slate-500">
              {sub}
            </p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${t.bg}`}
        >
          {icon}
        </div>
      </div>
      {urgent && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 inline-flex h-2.5 w-2.5"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SPOTLIGHT
   ══════════════════════════════════════════════════ */

function SpotlightCard({
  title,
  subtitle,
  icon,
  tone,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: "green" | "red";
  empty: string;
  children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const isEmpty =
    arr.filter((c) => c !== null && c !== undefined && c !== false).length ===
    0;
  const ring = tone === "green" ? "ring-emerald-100" : "ring-red-100";
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ${ring}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              tone === "green" ? "bg-emerald-50" : "bg-red-50"
            }`}
          >
            {icon}
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold text-slate-900">
              {title}
            </h2>
            <p className="text-[11.5px] text-slate-500">{subtitle}</p>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50/60 py-8 text-center">
          <Sparkles className="h-5 w-5 text-slate-300" />
          <p className="mt-2 text-[12px] font-medium text-slate-500">{empty}</p>
        </div>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </div>
  );
}

function SpotlightRow({
  person,
  rank,
  metric,
  metricLabel,
  tone,
}: {
  person: PersonStats;
  rank?: number;
  metric: string;
  metricLabel: string;
  tone: "green" | "red";
}) {
  const accent =
    tone === "green"
      ? "bg-emerald-500 text-white"
      : "bg-red-500 text-white";
  const valueColor = tone === "green" ? "text-emerald-700" : "text-red-700";
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 hover:bg-slate-50">
      {rank !== undefined && (
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold shadow-sm ${accent}`}
        >
          {rank}
        </div>
      )}
      <UserAvatar
        name={person.full_name}
        avatarUrl={person.avatar_url}
        size="sm"
        className="h-9 w-9 shrink-0 rounded-xl ring-1 ring-slate-200"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-slate-900">
          {person.full_name}
        </p>
        <p className="text-[11px] text-slate-500">{metricLabel}</p>
      </div>
      <div className={`text-[14px] font-extrabold tabular-nums ${valueColor}`}>
        {metric}
      </div>
    </li>
  );
}

/* ══════════════════════════════════════════════════
   PEOPLE TABLE
   ══════════════════════════════════════════════════ */

function PeopleTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  mounted,
  showStaffMetrics,
}: {
  rows: PersonStats[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  mounted: boolean;
  showStaffMetrics: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* desktop */}
      <div className="hidden md:block">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <SortHeader
                label="Person"
                active={sortKey === "name"}
                dir={sortDir}
                onClick={() => onSort("name")}
                className="px-4 py-3"
              />
              <SortHeader
                label="Assigned"
                active={sortKey === "assigned"}
                dir={sortDir}
                onClick={() => onSort("assigned")}
                className="px-4 py-3 text-right"
                align="right"
              />
              <SortHeader
                label="Completed"
                active={sortKey === "completed"}
                dir={sortDir}
                onClick={() => onSort("completed")}
                className="px-4 py-3 text-right"
                align="right"
              />
              <SortHeader
                label="Rate"
                active={sortKey === "completionRate"}
                dir={sortDir}
                onClick={() => onSort("completionRate")}
                className="px-4 py-3 text-right"
                align="right"
              />
              {showStaffMetrics && (
                <SortHeader
                  label="Overdue"
                  active={sortKey === "overdue"}
                  dir={sortDir}
                  onClick={() => onSort("overdue")}
                  className="px-4 py-3 text-right"
                  align="right"
                />
              )}
              <SortHeader
                label="Escalations"
                active={sortKey === "escalations"}
                dir={sortDir}
                onClick={() => onSort("escalations")}
                className="px-4 py-3 text-right"
                align="right"
              />
              <th className="px-4 py-3 text-right">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((p) => (
              <tr
                key={p.id}
                className="transition-colors hover:bg-slate-50/70"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      name={p.full_name}
                      avatarUrl={p.avatar_url}
                      size="sm"
                      className="h-9 w-9 rounded-xl ring-1 ring-slate-200"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-slate-900">
                        {p.full_name}
                      </p>
                      <RoleChip role={p.role} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                  {p.assigned}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                  {p.completed}
                </td>
                <td className="px-4 py-3 text-right">
                  <RateBadge rate={p.completionRate} />
                </td>
                {showStaffMetrics && (
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.overdue > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                        <AlertTriangle className="h-3 w-3" />
                        {p.overdue}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-right tabular-nums">
                  {p.escalations > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      <Flame className="h-3 w-3" />
                      {p.escalations}
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td
                  className="px-4 py-3 text-right text-[12px] text-slate-500"
                  suppressHydrationWarning
                >
                  {p.lastActivity
                    ? mounted
                      ? formatDistanceToNowStrict(new Date(p.lastActivity), {
                          addSuffix: true,
                        })
                      : format(new Date(p.lastActivity), "MMM d")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((p) => (
          <li key={p.id} className="p-4">
            <div className="flex items-start gap-3">
              <UserAvatar
                name={p.full_name}
                avatarUrl={p.avatar_url}
                size="sm"
                className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-slate-200"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-[14px] font-extrabold text-slate-900">
                    {p.full_name}
                  </p>
                  <RoleChip role={p.role} />
                </div>
                <div
                  className="mt-1 text-[11px] text-slate-500"
                  suppressHydrationWarning
                >
                  {p.lastActivity ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {mounted
                        ? formatDistanceToNowStrict(new Date(p.lastActivity), {
                            addSuffix: true,
                          })
                        : format(new Date(p.lastActivity), "MMM d")}
                    </span>
                  ) : (
                    <span className="text-slate-400">No activity yet</span>
                  )}
                </div>
              </div>
              <RateBadge rate={p.completionRate} />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <MiniStat label="Assigned" value={p.assigned} />
              <MiniStat label="Done" value={p.completed} tone="green" />
              {showStaffMetrics ? (
                <MiniStat
                  label="Overdue"
                  value={p.overdue}
                  tone={p.overdue > 0 ? "red" : "neutral"}
                />
              ) : (
                <MiniStat
                  label="Rejected"
                  value={p.rejected}
                  tone={p.rejected > 0 ? "red" : "neutral"}
                />
              )}
              <MiniStat
                label="Esc."
                value={p.escalations}
                tone={p.escalations > 0 ? "amber" : "neutral"}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
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

function RoleChip({ role }: { role: "staff" | "supervisor" }) {
  if (role === "supervisor") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
        <ShieldCheck className="h-3 w-3" />
        Supervisor
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
      Staff
    </span>
  );
}

function RateBadge({ rate }: { rate: number }) {
  const cls =
    rate >= 90
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : rate >= 70
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-red-50 text-red-700 ring-red-100";
  const Icon = rate >= 90 ? CheckCircle2 : rate >= 70 ? TrendingUp : AlertTriangle;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold tabular-nums ring-1 ${cls}`}
    >
      <Icon className="h-3 w-3" />
      {rate}%
    </span>
  );
}

function MiniStat({
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

/* ══════════════════════════════════════════════════
   SITE TABLE
   ══════════════════════════════════════════════════ */

function SiteTable({ sites }: { sites: SiteStats[] }) {
  const sorted = useMemo(
    () =>
      [...sites].sort((a, b) => {
        if (b.overdue !== a.overdue) return b.overdue - a.overdue;
        return a.completionRate - b.completionRate;
      }),
    [sites],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Site</th>
            <th className="px-4 py-2.5 text-right">Headcount</th>
            <th className="px-4 py-2.5 text-right">Tasks</th>
            <th className="px-4 py-2.5 text-right">Completed</th>
            <th className="px-4 py-2.5 text-right">Overdue</th>
            <th className="px-4 py-2.5 text-right">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((s) => (
            <tr key={s.site} className="hover:bg-slate-50/70">
              <td className="px-4 py-2.5 font-bold text-slate-900">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {s.site}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                {s.headcount}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                {s.assigned}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                {s.completed}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {s.overdue > 0 ? (
                  <span className="font-bold text-red-700">{s.overdue}</span>
                ) : (
                  <span className="text-slate-400">0</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right">
                <RateBadge rate={s.completionRate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   EMPTY STATE
   ══════════════════════════════════════════════════ */

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        <Users className="h-7 w-7 text-slate-300" />
      </div>
      <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-slate-500">{message}</p>
    </div>
  );
}
