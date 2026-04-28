"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldAlert,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  Search,
  X,
  Sparkles,
  RotateCcw,
  History,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Profile, TaskPriority, TaskStatus } from "@/lib/types";
import {
  resolveEscalation,
  reopenEscalation,
} from "./actions";

/* ─────────────────────────────────
   Types
   ───────────────────────────────── */

type ProfileLite = Pick<
  Profile,
  "id" | "full_name" | "avatar_url" | "role"
>;

interface EscalationTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  site_location: string | null;
  due_date: string;
  assigned_to: string;
  assigned_to_profile:
    | Pick<Profile, "id" | "full_name" | "avatar_url">
    | Pick<Profile, "id" | "full_name" | "avatar_url">[]
    | null;
}

interface EscalationRow {
  id: string;
  reason: string;
  escalated_at: string;
  is_resolved: boolean;
  task: EscalationTask | EscalationTask[] | null;
  from_profile: ProfileLite | ProfileLite[] | null;
  to_profile: ProfileLite | ProfileLite[] | null;
}

interface ManagerEscalationsClientProps {
  profile: Profile;
  escalations: EscalationRow[];
}

type FilterKey = "open" | "critical" | "resolved" | "all";

function unwrap<T>(val: T | T[] | null | undefined): T | undefined {
  if (val === null || val === undefined) return undefined;
  return Array.isArray(val) ? val[0] : val;
}

function isCriticalEscalation(esc: EscalationRow): boolean {
  const reason = typeof esc.reason === "string" ? esc.reason : "";
  if (reason.startsWith("CRITICAL:")) return true;
  const task = unwrap(esc.task);
  return task?.priority === "critical";
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */

export function ManagerEscalationsClient({
  profile,
  escalations: initialEscalations,
}: ManagerEscalationsClientProps) {
  void profile;
  const router = useRouter();
  const [escalations, setEscalations] = useState(initialEscalations);
  const [filter, setFilter] = useState<FilterKey>("open");
  const [search, setSearch] = useState("");

  // SSR-safe time rendering
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("manager-escalations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "escalations" },
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

  /* ── Counts ── */
  const counts = useMemo(() => {
    let open = 0;
    let critical = 0;
    let resolved = 0;
    for (const e of escalations) {
      if (e.is_resolved) resolved += 1;
      else open += 1;
      if (!e.is_resolved && isCriticalEscalation(e)) critical += 1;
    }
    return {
      open,
      critical,
      resolved,
      all: escalations.length,
    };
  }, [escalations]);

  /* ── Filter + search ── */
  const visible = useMemo(() => {
    let arr = escalations;
    if (filter === "open") arr = arr.filter((e) => !e.is_resolved);
    else if (filter === "critical")
      arr = arr.filter((e) => !e.is_resolved && isCriticalEscalation(e));
    else if (filter === "resolved")
      arr = arr.filter((e) => e.is_resolved);

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((e) => {
        const task = unwrap(e.task);
        const from = unwrap(e.from_profile);
        const assignee = unwrap(task?.assigned_to_profile ?? null);
        return (
          (task?.title || "").toLowerCase().includes(q) ||
          (e.reason || "").toLowerCase().includes(q) ||
          (from?.full_name || "").toLowerCase().includes(q) ||
          (assignee?.full_name || "").toLowerCase().includes(q) ||
          (task?.site_location || "").toLowerCase().includes(q)
        );
      });
    }
    return arr;
  }, [escalations, filter, search]);

  return (
    <div className="space-y-6 pb-10">
      {/* ════════ HEADER ════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Escalations
            {counts.critical > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                <Flame className="h-3 w-3" />
                {counts.critical} critical
              </span>
            )}
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Triage and resolve issues escalated to you
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

      {/* ════════ STAT STRIP ════════ */}
      <section
        aria-label="Escalation stats"
        className="grid grid-cols-3 gap-3 lg:gap-4"
      >
        <StatTile
          label="Open"
          value={counts.open}
          tone={counts.open > 0 ? "amber" : "neutral"}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatTile
          label="Critical"
          value={counts.critical}
          tone={counts.critical > 0 ? "red" : "neutral"}
          icon={<Flame className="h-5 w-5" />}
          urgent={counts.critical > 0}
        />
        <StatTile
          label="Resolved"
          value={counts.resolved}
          tone="green"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </section>

      {/* ════════ TOOLBAR ════════ */}
      <section className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task, reason, person, or site..."
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

        {/* Filter pills */}
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {(
            [
              { key: "open", label: "Open", count: counts.open, tone: "amber" },
              {
                key: "critical",
                label: "Critical",
                count: counts.critical,
                tone: "red",
              },
              {
                key: "resolved",
                label: "Resolved",
                count: counts.resolved,
                tone: "green",
              },
              { key: "all", label: "All", count: counts.all, tone: "neutral" },
            ] as const
          ).map((f) => {
            const active = filter === f.key;
            const activeBg =
              f.tone === "red"
                ? "bg-red-500"
                : f.tone === "amber"
                  ? "bg-amber-500"
                  : f.tone === "green"
                    ? "bg-emerald-500"
                    : "bg-[#1E3A8A]";
            const dot =
              f.tone === "red"
                ? "bg-red-500"
                : f.tone === "amber"
                  ? "bg-amber-500"
                  : f.tone === "green"
                    ? "bg-emerald-500"
                    : "bg-slate-400";
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition min-h-[40px] ${
                  active
                    ? `${activeBg} text-white shadow-md`
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    active ? "bg-white/90" : dot
                  }`}
                />
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

      {/* ════════ LIST ════════ */}
      {visible.length === 0 ? (
        <EmptyState
          icon={
            filter === "resolved" ? (
              <History className="h-7 w-7 text-slate-300" />
            ) : search ? (
              <Search className="h-7 w-7 text-slate-300" />
            ) : (
              <Sparkles className="h-7 w-7 text-emerald-400" />
            )
          }
          title={
            filter === "resolved"
              ? "No resolved escalations"
              : search
                ? "No escalations match your search"
                : "All clear"
          }
          message={
            filter === "resolved"
              ? "Once you resolve escalations they'll appear here for the record."
              : search
                ? "Try a different search term or clear the filter."
                : "Nothing escalated to you right now. Nice work."
          }
          onClear={
            search
              ? () => setSearch("")
              : filter !== "open"
                ? () => setFilter("open")
                : undefined
          }
          clearLabel={search ? "Clear search" : "Show open"}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((esc) => (
            <EscalationCard
              key={esc.id}
              esc={esc}
              mounted={mounted}
              onResolved={() =>
                setEscalations((prev) =>
                  prev.map((e) =>
                    e.id === esc.id ? { ...e, is_resolved: true } : e,
                  ),
                )
              }
              onReopened={() =>
                setEscalations((prev) =>
                  prev.map((e) =>
                    e.id === esc.id ? { ...e, is_resolved: false } : e,
                  ),
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   STAT TILE
   ══════════════════════════════════════════════════ */

function StatTile({
  label,
  value,
  tone,
  icon,
  urgent,
}: {
  label: string;
  value: number;
  tone: "amber" | "red" | "green" | "neutral";
  icon: React.ReactNode;
  urgent?: boolean;
}) {
  const tones = {
    amber: { iconBg: "bg-amber-500", ring: "ring-amber-100", blob: "bg-amber-500" },
    red: { iconBg: "bg-red-500", ring: "ring-red-100", blob: "bg-red-500" },
    green: {
      iconBg: "bg-emerald-500",
      ring: "ring-emerald-100",
      blob: "bg-emerald-500",
    },
    neutral: {
      iconBg: "bg-slate-400",
      ring: "ring-slate-100",
      blob: "bg-slate-400",
    },
  } as const;
  const t = tones[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${t.ring} ${
        urgent ? "border-red-200 bg-red-50/40" : ""
      }`}
    >
      <div
        className={`pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full opacity-[0.06] ${t.blob}`}
      />
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
            className={`mt-2 text-3xl font-extrabold tabular-nums leading-none tracking-tight sm:text-4xl ${
              urgent ? "text-red-700" : "text-slate-900"
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${t.iconBg}`}
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
   ESCALATION CARD
   ══════════════════════════════════════════════════ */

function EscalationCard({
  esc,
  mounted,
  onResolved,
  onReopened,
}: {
  esc: EscalationRow;
  mounted: boolean;
  onResolved: () => void;
  onReopened: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const task = unwrap(esc.task);
  const from = unwrap(esc.from_profile);
  const to = unwrap(esc.to_profile);
  const assignee = unwrap(task?.assigned_to_profile ?? null);
  const critical = isCriticalEscalation(esc);
  const cleanReason = (esc.reason || "").replace(/^CRITICAL:\s*/i, "");

  function handleResolve() {
    startTransition(async () => {
      const { error } = await resolveEscalation(esc.id);
      if (error) {
        toast.error(error);
        return;
      }
      onResolved();
      toast.success("Escalation resolved");
    });
  }

  function handleReopen() {
    startTransition(async () => {
      const { error } = await reopenEscalation(esc.id);
      if (error) {
        toast.error(error);
        return;
      }
      onReopened();
      toast.success("Escalation reopened");
    });
  }

  // Card shell tones
  const shellClass = esc.is_resolved
    ? "border-slate-200 bg-slate-50/60 opacity-90"
    : critical
      ? "border-red-200 bg-red-50/40"
      : "border-amber-200 bg-amber-50/30";

  const sideBar = esc.is_resolved
    ? "bg-emerald-500"
    : critical
      ? "bg-red-500"
      : "bg-amber-500";

  return (
    <li
      className={`group relative overflow-hidden rounded-3xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${shellClass}`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1.5 ${sideBar}`}
        aria-hidden
      />
      <div className="space-y-4 p-5 pl-6">
        {/* Top row: task title + tags + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[15px] font-extrabold text-slate-900">
                {task?.title || "Unknown task"}
              </h3>
              {esc.is_resolved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                  <CheckCircle2 className="h-3 w-3" />
                  Resolved
                </span>
              ) : critical ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                  <Flame className="h-3 w-3" />
                  Critical
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                  <AlertTriangle className="h-3 w-3" />
                  Open
                </span>
              )}
              {task?.priority && task.priority !== "critical" && (
                <PriorityChip priority={task.priority} />
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500">
              {task?.site_location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {task.site_location}
                </span>
              )}
              {task?.due_date && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due {format(new Date(task.due_date), "MMM d, yyyy")}
                </span>
              )}
              <span
                className="inline-flex items-center gap-1"
                suppressHydrationWarning
              >
                <History className="h-3 w-3" />
                Escalated{" "}
                {mounted
                  ? formatDistanceToNowStrict(new Date(esc.escalated_at), {
                      addSuffix: true,
                    })
                  : "recently"}
              </span>
            </div>
          </div>
        </div>

        {/* Reason */}
        <blockquote
          className={`rounded-xl border px-3.5 py-2.5 text-[13px] italic text-slate-700 ${
            critical && !esc.is_resolved
              ? "border-red-200 bg-white/80"
              : "border-slate-200 bg-white/70"
          }`}
        >
          “{cleanReason || "No reason provided"}”
        </blockquote>

        {/* People row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PersonChip
            label="Escalated by"
            person={from}
            fallbackInitials="?"
          />
          <PersonChip
            label="Assigned staff"
            person={assignee}
            fallbackInitials="—"
          />
          <PersonChip
            label="Sent to"
            person={to}
            fallbackInitials="—"
            highlight
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!esc.is_resolved ? (
            <button
              type="button"
              onClick={handleResolve}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-[12px] font-bold text-white shadow-md shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none min-h-[40px]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {pending ? "Resolving…" : "Mark resolved"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReopen}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none min-h-[40px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reopen
            </button>
          )}

          {task?.id && (
            <Link
              href={`/manager/tasks/${task.id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 min-h-[40px]"
            >
              View task
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

/* ══════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════ */

function PersonChip({
  label,
  person,
  fallbackInitials,
  highlight,
}: {
  label: string;
  person:
    | Pick<Profile, "id" | "full_name" | "avatar_url" | "role">
    | Pick<Profile, "id" | "full_name" | "avatar_url">
    | undefined;
  fallbackInitials: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
        highlight
          ? "border-blue-200 bg-blue-50/60"
          : "border-slate-200 bg-white/80"
      }`}
    >
      {person ? (
        <UserAvatar
          name={person.full_name}
          avatarUrl={person.avatar_url}
          size="sm"
          className="h-8 w-8 shrink-0 rounded-xl ring-1 ring-slate-200"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[11px] font-bold text-slate-400">
          {fallbackInitials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`text-[10px] font-bold uppercase tracking-wider ${
            highlight ? "text-[#1E3A8A]" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        <p className="truncate text-[12.5px] font-bold text-slate-800">
          {person?.full_name || "Unknown"}
        </p>
      </div>
    </div>
  );
}

function PriorityChip({ priority }: { priority: TaskPriority }) {
  const map: Record<TaskPriority, { bg: string; label: string }> = {
    low: { bg: "bg-emerald-100 text-emerald-700", label: "Low" },
    medium: { bg: "bg-amber-100 text-amber-700", label: "Medium" },
    high: { bg: "bg-orange-100 text-orange-700", label: "High" },
    critical: { bg: "bg-red-100 text-red-700", label: "Critical" },
  };
  const t = map[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${t.bg}`}
    >
      {t.label}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  message,
  onClear,
  clearLabel,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  onClear?: () => void;
  clearLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        {icon}
      </div>
      <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-slate-500">{message}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
        >
          {clearLabel || "Reset"}
        </button>
      )}
    </div>
  );
}

