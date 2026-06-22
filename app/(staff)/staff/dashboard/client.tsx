"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, isToday, isPast, formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  PlayCircle,
  Zap,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import { normalizeTaskStatus } from "@/lib/tasks/normalization";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type {
  Profile,
  Task,
  TaskPriority,
  TaskReview,
  TaskEvidence,
} from "@/lib/types";

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

type Bucket = "overdue" | "today" | "completed";

/* ─── Helpers ─── */

function getGreeting(dict: Dictionary["staff"]["dashboard"]): string {
  const hour = new Date().getHours();
  if (hour < 12) return dict.greeting_morning;
  if (hour < 17) return dict.greeting_afternoon;
  return dict.greeting_evening;
}

function isOverdueTask(t: Task): boolean {
  const status = normalizeTaskStatus(t.status);
  return (
    (status === "pending" || status === "in_progress") &&
    isPast(new Date(t.due_date))
  );
}

const priorityWeight: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const priorityLabelFallback: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const priorityChipClass: Record<TaskPriority, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  critical: "bg-red-50 text-red-700 ring-red-200",
};

/* ────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────── */

export function StaffDashboardClient({
  profile,
  tasks,
}: StaffDashboardClientProps) {
  const dict = useDictionary();
  const d = dict.staff.dashboard;
  const [completedExpanded, setCompletedExpanded] = useState(false);

  /* Bucket tasks into Overdue / Due Today / Completed Today */
  const { overdueTasks, todayTasks, completedToday } = useMemo(() => {
    const overdue: TaskWithReviews[] = [];
    const today: TaskWithReviews[] = [];
    const completed: TaskWithReviews[] = [];

    for (const t of tasks) {
      const status = normalizeTaskStatus(t.status);
      const completedAtFallback =
        t.completed_at ||
        ((t as Record<string, unknown>).updated_at as string | undefined) ||
        t.due_date;

      if (isOverdueTask(t)) {
        overdue.push(t);
      } else if (
        (status === "pending" || status === "in_progress") &&
        isToday(new Date(t.due_date))
      ) {
        today.push(t);
      } else if (
        status === "completed" &&
        completedAtFallback &&
        isToday(new Date(completedAtFallback))
      ) {
        completed.push(t);
      }
    }

    // Highest priority + most overdue first
    overdue.sort((a, b) => {
      const priCmp = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priCmp !== 0) return priCmp;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    // Today: priority desc, then earliest due
    today.sort((a, b) => {
      const priCmp = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priCmp !== 0) return priCmp;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    // Completed: most recent first
    completed.sort(
      (a, b) =>
        new Date(b.completed_at ?? 0).getTime() -
        new Date(a.completed_at ?? 0).getTime(),
    );

    return {
      overdueTasks: overdue,
      todayTasks: today,
      completedToday: completed,
    };
  }, [tasks]);

  /* Stats */
  const overdueCount = overdueTasks.length;
  const todayCount = todayTasks.length;
  const completedCount = completedToday.length;
  const totalWorkload = overdueCount + todayCount + completedCount;
  const slaPct =
    totalWorkload > 0
      ? Math.round((completedCount / totalWorkload) * 100)
      : 100;

  /* Smart "next task" pick — overdue first, else due today */
  const nextTask: TaskWithReviews | undefined =
    overdueTasks[0] ?? todayTasks[0];

  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="space-y-5 sm:space-y-6 pb-24 lg:pb-6">
      {/* ════════════════════════════════════════
          HEADER — Avatar + Greeting + Notification
         ════════════════════════════════════════ */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            name={profile.full_name}
            avatarUrl={profile.avatar_url}
            size="md"
            className="shrink-0 ring-2 ring-white shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {format(new Date(), "EEEE, d MMM")}
            </p>
            <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
              {getGreeting(d)}, {firstName} 👋
            </h1>
          </div>
        </div>

        {/* Notification bell with unread badge */}
        <button
          type="button"
          aria-label={d.notifications}
          className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
        >
          <Bell className="h-5 w-5" />
          {overdueCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {overdueCount}
            </span>
          )}
        </button>
      </header>

      {/* Motivation tagline */}
      <p className="-mt-3 text-sm text-slate-500">
        {overdueCount > 0
          ? d.motivation_overdue
          : todayCount > 0
            ? d.motivation_today
            : d.motivation_clear}
      </p>

      {/* ════════════════════════════════════════
          QUICK STATS — color-coded chips
         ════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip
          label={d.stat_overdue}
          value={overdueCount}
          tone="red"
          icon={<AlertTriangle className="h-5 w-5" />}
          pulse={overdueCount > 0}
        />
        <StatChip
          label={d.stat_due_today}
          value={todayCount}
          tone="orange"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatChip
          label={d.stat_completed}
          value={completedCount}
          tone="green"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatChip
          label={d.stat_sla}
          value={`${slaPct}%`}
          tone={slaPct >= 80 ? "green" : slaPct >= 50 ? "orange" : "red"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* ════════════════════════════════════════
          PROMINENT CTA — Start Next Task
         ════════════════════════════════════════ */}
      {nextTask && (
        <Link
          href={`/staff/tasks/${nextTask.id}`}
          className={`group flex items-center gap-3 rounded-2xl px-5 py-4 text-white shadow-lg transition active:scale-[0.99] ${
            isOverdueTask(nextTask)
              ? "bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/30 hover:from-red-700 hover:to-red-600"
              : "bg-gradient-to-r from-[#1E3A8A] to-indigo-600 shadow-indigo-500/25 hover:to-indigo-700"
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <PlayCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
              {isOverdueTask(nextTask) ? d.cta_urgent : d.cta_start_next}
            </p>
            <p className="truncate text-base font-bold">{nextTask.title}</p>
            {nextTask.site_location && (
              <p className="flex items-center gap-1 truncate text-xs text-white/70">
                <MapPin className="h-3 w-3" />
                {nextTask.site_location}
              </p>
            )}
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
      )}

      {/* ════════════════════════════════════════
          OVERDUE ESCALATION ALERT
         ════════════════════════════════════════ */}
      {overdueCount > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3.5 shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-red-900">
              {d.alert_title.replace("{count}", String(overdueCount))}
            </p>
            <p className="mt-0.5 text-xs text-red-700">
              {d.alert_body}
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          🔴 OVERDUE SECTION
         ════════════════════════════════════════ */}
      {overdueCount > 0 && (
        <section>
          <SectionHeader
            tone="red"
            emoji="🔴"
            title={d.section_overdue}
            count={overdueCount}
            subtitle={d.section_overdue_sub}
          />
          <div className="space-y-3">
            {overdueTasks.map((t) => (
              <TaskCard key={t.id} task={t} bucket="overdue" dict={d} />
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════
          🟡 DUE TODAY SECTION
         ════════════════════════════════════════ */}
      {todayCount > 0 && (
        <section>
          <SectionHeader
            tone="orange"
            emoji="🟡"
            title={d.section_today}
            count={todayCount}
            subtitle={d.section_today_sub}
          />
          <div className="space-y-3">
            {todayTasks.map((t) => (
              <TaskCard key={t.id} task={t} bucket="today" dict={d} />
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════
          🟢 COMPLETED TODAY (collapsible)
         ════════════════════════════════════════ */}
      {completedCount > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setCompletedExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl bg-emerald-50/60 px-4 py-3 text-left ring-1 ring-emerald-100 transition hover:bg-emerald-50"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🟢</span>
              <span className="text-sm font-bold text-emerald-800">
                {d.section_completed}
              </span>
              <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
                {completedCount}
              </span>
            </div>
            {completedExpanded ? (
              <ChevronUp className="h-4 w-4 text-emerald-700" />
            ) : (
              <ChevronDown className="h-4 w-4 text-emerald-700" />
            )}
          </button>
          {completedExpanded && (
            <div className="mt-3 space-y-2">
              {completedToday.map((t) => (
                <CompletedRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ════════════════════════════════════════
          EMPTY STATE
         ════════════════════════════════════════ */}
      {overdueCount === 0 && todayCount === 0 && completedCount === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">
            {d.empty_title.replace("{name}", firstName)}
          </h3>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            {d.empty_body}
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════
          VIEW ALL TASKS LINK
         ════════════════════════════════════════ */}
      <div className="pt-2 text-center">
        <Link
          href="/staff/tasks"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-[#1E3A8A] transition hover:bg-slate-100"
        >
          {d.view_all}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   STAT CHIP
   ──────────────────────────────────────────────────── */

function StatChip({
  label,
  value,
  tone,
  icon,
  pulse,
}: {
  label: string;
  value: number | string;
  tone: "red" | "orange" | "green" | "blue";
  icon: React.ReactNode;
  pulse?: boolean;
}) {
  const tones = {
    red: {
      bg: "bg-red-50",
      ring: "ring-red-200",
      text: "text-red-700",
      icon: "bg-red-500 text-white",
      value: "text-red-900",
    },
    orange: {
      bg: "bg-amber-50",
      ring: "ring-amber-200",
      text: "text-amber-800",
      icon: "bg-amber-500 text-white",
      value: "text-amber-900",
    },
    green: {
      bg: "bg-emerald-50",
      ring: "ring-emerald-200",
      text: "text-emerald-700",
      icon: "bg-emerald-500 text-white",
      value: "text-emerald-900",
    },
    blue: {
      bg: "bg-blue-50",
      ring: "ring-blue-200",
      text: "text-blue-700",
      icon: "bg-blue-500 text-white",
      value: "text-blue-900",
    },
  }[tone];

  return (
    <div
      className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 ring-1 ${tones.bg} ${tones.ring}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones.icon} ${
          pulse ? "animate-pulse" : ""
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className={`text-2xl font-bold leading-none tabular-nums ${tones.value}`}
        >
          {value}
        </p>
        <p
          className={`mt-1 text-[11px] font-semibold uppercase tracking-wider ${tones.text}`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   SECTION HEADER
   ──────────────────────────────────────────────────── */

function SectionHeader({
  tone,
  emoji,
  title,
  subtitle,
  count,
}: {
  tone: "red" | "orange" | "green";
  emoji: string;
  title: string;
  subtitle?: string;
  count: number;
}) {
  const badgeBg =
    tone === "red"
      ? "bg-red-500"
      : tone === "orange"
        ? "bg-amber-500"
        : "bg-emerald-500";
  const titleColor =
    tone === "red"
      ? "text-red-900"
      : tone === "orange"
        ? "text-amber-900"
        : "text-emerald-900";

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <div className="min-w-0">
          <h2 className={`text-base font-bold ${titleColor}`}>{title}</h2>
          {subtitle && (
            <p className="text-[11px] leading-tight text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <span
        className={`inline-flex min-w-[26px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold text-white ${badgeBg}`}
      >
        {count}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   TASK CARD — large, action-first, mobile-friendly
   ──────────────────────────────────────────────────── */

function TaskCard({
  task,
  bucket,
  dict: d,
}: {
  task: TaskWithReviews;
  bucket: Bucket;
  dict: Dictionary["staff"]["dashboard"];
}) {
  const fullDict = useDictionary();
  const due = new Date(task.due_date);
  const isOverdue = bucket === "overdue";
  const isToday_ = bucket === "today";
  const inProgress = task.status === "in_progress";

  const cardClasses = isOverdue
    ? "border-l-4 border-red-500 bg-white ring-1 ring-red-100"
    : "border-l-4 border-amber-500 bg-white ring-1 ring-amber-100";

  const buttonClasses = isOverdue
    ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-md shadow-red-500/30"
    : "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-md shadow-amber-500/30";

  const dueLabel = isOverdue
    ? `Overdue by ${formatDistanceToNowStrict(due)}`
    : `Due ${format(due, "h:mm a")}`;

  return (
    <article
      className={`rounded-2xl p-4 shadow-sm transition hover:shadow-md ${cardClasses}`}
    >
      {/* Title + priority chip */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">
          {task.title}
        </h3>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${priorityChipClass[task.priority]}`}
        >
          {fullDict.common.priority[task.priority]}
        </span>
      </div>

      {/* Location + due time */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-600">
        {task.site_location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span className="font-medium">{task.site_location}</span>
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1.5 font-semibold ${
            isOverdue ? "text-red-700" : "text-amber-700"
          }`}
        >
          <Clock className="h-4 w-4" />
          {dueLabel}
        </span>
      </div>

      {/* Overdue urgency banner */}
      {isOverdue && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {d.risk_escalation}
        </div>
      )}

      {/* Big action button (≥56px height) */}
      <Link
        href={`/staff/tasks/${task.id}`}
        className={`mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold transition active:scale-[0.98] ${buttonClasses}`}
      >
        <PlayCircle className="h-5 w-5" />
        {inProgress ? d.continue_task : d.start_task}
      </Link>

      {isToday_ && inProgress && (
        <p className="mt-2 text-center text-[11px] font-medium text-amber-700">
          {d.in_progress}
        </p>
      )}
    </article>
  );
}

/* ────────────────────────────────────────────────────
   COMPLETED ROW — compact list item
   ──────────────────────────────────────────────────── */

function CompletedRow({ task }: { task: TaskWithReviews }) {
  return (
    <Link
      href={`/staff/tasks/${task.id}`}
      className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm transition hover:bg-emerald-50/40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {task.title}
        </p>
        <p className="truncate text-xs text-slate-500">
          {task.site_location && <span>{task.site_location} · </span>}
          {task.completed_at &&
            `Completed ${format(new Date(task.completed_at), "h:mm a")}`}
        </p>
      </div>
    </Link>
  );
}
