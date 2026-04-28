"use client";

import { differenceInHours, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import {
  AlertOctagon,
  ArrowUpRight,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────────────────
   Critical / Attention Required hero section
   Most prominent block on the dashboard.
   Shows up to 3–5 most-urgent overdue tasks.
   ───────────────────────────────────────────── */

interface PriorityTask {
  id: string;
  title: string;
  due_date: string;
  assigned_to_profile?:
    | Pick<Profile, "full_name" | "avatar_url">
    | Pick<Profile, "full_name" | "avatar_url">[]
    | null;
}

interface PriorityStripProps {
  tasks: PriorityTask[];
  onEscalate?: (taskId: string) => void;
}

export function PriorityStrip({ tasks, onEscalate }: PriorityStripProps) {
  if (tasks.length === 0) return null;

  // Most-overdue first (lowest due_date)
  const sorted = [...tasks].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
  );
  const topTasks = sorted.slice(0, 5);
  const remaining = tasks.length - topTasks.length;

  return (
    <section
      aria-label="Critical attention required"
      className="relative overflow-hidden rounded-3xl border-2 border-red-300 bg-gradient-to-br from-red-50 via-orange-50/60 to-white shadow-sm"
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-red-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-orange-200/40 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-red-200/60 px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white shadow-md shadow-red-500/30">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold tracking-tight text-red-700 sm:text-lg">
            Critical · Attention Required
          </h2>
          <p className="text-xs text-red-600/80">
            {tasks.length} overdue {tasks.length === 1 ? "task" : "tasks"} need
            immediate action
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm shadow-red-600/30">
          <AlertOctagon className="h-3 w-3" />
          {tasks.length} overdue
        </span>
      </div>

      {/* Task cards */}
      <div className="relative grid gap-3 p-4 sm:p-5 lg:grid-cols-2 xl:grid-cols-3">
        {topTasks.map((task) => {
          const hoursOverdue = differenceInHours(
            new Date(),
            new Date(task.due_date),
          );
          const prof = Array.isArray(task.assigned_to_profile)
            ? task.assigned_to_profile[0]
            : task.assigned_to_profile;
          return (
            <article
              key={task.id}
              className="group relative overflow-hidden rounded-2xl border border-red-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
            >
              {/* Red side bar */}
              <span className="absolute inset-y-0 left-0 w-1 bg-red-500" />

              <div className="flex items-start gap-3 pl-1">
                <UserAvatar
                  name={prof?.full_name || "?"}
                  avatarUrl={prof?.avatar_url}
                  size="sm"
                  className="shrink-0 rounded-xl ring-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14px] font-bold text-slate-900">
                    {task.title}
                  </h3>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">
                    {prof?.full_name || "Unassigned"}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600 ring-1 ring-red-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    {hoursOverdue >= 24
                      ? `${Math.floor(hoursOverdue / 24)}d overdue`
                      : `${hoursOverdue}h overdue`}
                    <span className="text-red-400">·</span>
                    <span className="font-medium text-red-500">
                      due{" "}
                      {formatDistanceToNowStrict(new Date(task.due_date), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2 pl-1">
                <Link
                  href={`/supervisor/reviews/${task.id}`}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-[12px] font-bold text-white shadow-sm shadow-red-600/30 transition hover:bg-red-700 active:scale-[0.98]"
                >
                  Resolve
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {onEscalate && (
                  <button
                    type="button"
                    onClick={() => onEscalate(task.id)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-[12px] font-bold text-red-700 transition hover:bg-red-50 active:scale-[0.98]"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Escalate
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Footer link if more remain */}
      {remaining > 0 && (
        <div className="relative border-t border-red-200/60 px-5 py-3 sm:px-6">
          <Link
            href="/supervisor/tasks?filter=overdue"
            className="inline-flex items-center gap-1 text-[12px] font-bold text-red-700 hover:text-red-800"
          >
            View all {tasks.length} overdue tasks
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
