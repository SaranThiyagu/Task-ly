"use client";

import { useState } from "react";
import Link from "next/link";
import { format, isPast, formatDistanceToNow } from "date-fns";
import {
  MapPin,
  Clock,
  ChevronRight,
  Inbox,
  Zap,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import { normalizeTaskStatus } from "@/lib/tasks/normalization";
import type { Task, TaskStatus } from "@/lib/types";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/types";

interface MyTasksClientProps {
  tasks: Task[];
  assigneeName: string;
}

function getDisplayStatus(task: Task): TaskStatus {
  const normalized = normalizeTaskStatus(task.status);

  if (
    (normalized === "pending" || normalized === "in_progress") &&
    isPast(new Date(task.due_date))
  ) {
    return "overdue";
  }
  return normalized;
}

const priorityDot: Record<string, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const sectionConfig: Record<string, { dot: string; accent: string }> = {
  Overdue: { dot: "bg-red-500", accent: "text-red-600" },
  "In Progress": { dot: "bg-blue-500", accent: "text-blue-600" },
  Pending: { dot: "bg-slate-400", accent: "text-slate-600" },
};

export function MyTasksClient({ tasks, assigneeName }: MyTasksClientProps) {
  const dict = useDictionary();
  const t = dict.staff.tasks;
  const [activeFilter, setActiveFilter] = useState<"All" | "Overdue" | "In Progress" | "Pending">("All");

  const enriched = tasks.map((t) => ({
    ...t,
    displayStatus: getDisplayStatus(t),
  }));

  const overdue = enriched.filter((t) => t.displayStatus === "overdue");
  const inProgress = enriched.filter(
    (t) => t.displayStatus === "in_progress"
  );
  const pending = enriched.filter(
    (t) => t.displayStatus === "pending"
  );

  const filterLabels: Record<string, string> = {
    All: t.filter_all,
    Overdue: t.filter_overdue,
    "In Progress": t.filter_in_progress,
    Pending: t.filter_pending,
  };

  const sectionLabels: Record<string, string> = {
    Overdue: t.filter_overdue,
    "In Progress": t.filter_in_progress,
    Pending: t.filter_pending,
  };

  const allSections = [
    { label: "Overdue", tasks: overdue },
    { label: "In Progress", tasks: inProgress },
    { label: "Pending", tasks: pending },
  ].filter((s) => s.tasks.length > 0);

  const sections = activeFilter === "All"
    ? allSections
    : allSections.filter((s) => s.label === activeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t.heading}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {t.subtitle.replace("{count}", String(enriched.length))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overdue.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
              <Zap className="h-3 w-3" />
              {overdue.length} {t.filter_overdue.toLowerCase()}
            </span>
          )}
        </div>
      </div>

      {/* Quick count pills */}
      <div className="flex gap-2">
        {[
          { label: "All" as const, count: enriched.length },
          { label: "Overdue" as const, count: overdue.length },
          { label: "In Progress" as const, count: inProgress.length },
          { label: "Pending" as const, count: pending.length },
        ]
          .filter((p) => p.count > 0 || p.label === "All")
          .map((pill) => (
            <button
              key={pill.label}
              onClick={() => setActiveFilter(pill.label)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === pill.label
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filterLabels[pill.label] ?? pill.label}
              <span className="ml-1 opacity-70">{pill.count}</span>
            </button>
          ))}
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 mb-4">
            <Inbox className="h-7 w-7 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {t.empty_title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">
            {t.empty_body}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((section) => {
            const config = sectionConfig[section.label];
            return (
              <div key={section.label}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`h-2 w-2 rounded-full ${config.dot}`} />
                  <h2
                    className={`text-xs font-semibold uppercase tracking-wider ${config.accent}`}
                  >
                    {sectionLabels[section.label] ?? section.label}
                  </h2>
                  <span className="text-xs text-slate-400">
                    {section.tasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {section.tasks.map((task) => {
                    const isOverdue = task.displayStatus === "overdue";
                    const statusCfg = STATUS_CONFIG[task.displayStatus];

                    return (
                      <Link key={task.id} href={`/staff/tasks/${task.id}`}>
                        <div
                          className={`group relative flex items-center gap-3 rounded-xl border bg-white p-4 transition-all hover:shadow-md active:scale-[0.99] ${
                            isOverdue
                              ? "border-red-200 bg-red-50/30"
                              : "hover:border-slate-200"
                          }`}
                        >
                          {/* Priority dot */}
                          <div className="flex flex-col items-center gap-1.5 self-stretch py-0.5">
                            <div
                              className={`h-2.5 w-2.5 rounded-full ${priorityDot[task.priority]} ${
                                isOverdue ? "animate-pulse" : ""
                              }`}
                            />
                            <div className="flex-1 w-px bg-slate-100" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                {task.title}
                              </h3>
                              <Badge
                                variant="secondary"
                                className={`shrink-0 text-[10px] px-1.5 py-0.5 ${statusCfg.color}`}
                              >
                                {statusCfg.label}
                              </Badge>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {isOverdue
                                  ? formatDistanceToNow(
                                      new Date(task.due_date),
                                      { addSuffix: true }
                                    )
                                  : format(
                                      new Date(task.due_date),
                                      "MMM d, h:mm a"
                                    )}
                              </span>
                            </div>
                            <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-xs text-slate-500 sm:grid-cols-2">
                              <span className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-medium text-slate-600">Assigned to:</span>
                                <span className="truncate text-slate-700">{assigneeName || "You"}</span>
                              </span>
                              <span className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-medium text-slate-600">Location:</span>
                                <span className="truncate text-slate-700">{task.site_location || "Not mapped"}</span>
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
