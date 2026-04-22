"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { differenceInHours } from "date-fns";
import Link from "next/link";

interface PriorityTask {
  id: string;
  title: string;
  due_date: string;
}

interface PriorityStripProps {
  tasks: PriorityTask[];
}

export function PriorityStrip({ tasks }: PriorityStripProps) {
  if (tasks.length === 0) return null;

  const topTasks = tasks.slice(0, 3);

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/50 to-red-50/30 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        </div>
        <h3 className="text-sm font-semibold text-amber-900">
          Attention Required
        </h3>
        <span className="ml-auto text-xs font-medium text-amber-600/70">
          {tasks.length} critical {tasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {topTasks.map((task) => {
          const hoursOverdue = differenceInHours(
            new Date(),
            new Date(task.due_date)
          );
          return (
            <div
              key={task.id}
              className="group flex items-center justify-between rounded-xl border border-amber-200/60 bg-white/80 px-3.5 py-2.5 transition-all duration-200 hover:bg-white hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-gray-900">
                  {task.title}
                </p>
                <p className="text-[11px] font-medium text-red-500">
                  {hoursOverdue}h overdue
                </p>
              </div>
              <Link
                href={`/supervisor/reviews/${task.id}`}
                className="ml-3 flex shrink-0 items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-all duration-200 hover:bg-amber-700"
              >
                Resolve
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
