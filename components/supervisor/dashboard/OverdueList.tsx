"use client";

import { differenceInHours } from "date-fns";
import { UserCircle, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Profile } from "@/lib/types";

interface OverdueTaskItem {
  id: string;
  title: string;
  due_date: string;
  status: string;
  assigned_to_profile:
    | Pick<Profile, "full_name" | "avatar_url">
    | Pick<Profile, "full_name" | "avatar_url">[];
}

interface OverdueListProps {
  tasks: OverdueTaskItem[];
  onReassign: (task: OverdueTaskItem) => void;
  onEscalate: (taskId: string) => void;
}

export function OverdueList({ tasks, onReassign, onEscalate }: OverdueListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <CheckCircle2 className="h-9 w-9 text-green-400 mb-2" />
          <p className="text-sm font-medium text-gray-600">No overdue tasks</p>
          <p className="text-xs text-gray-400 mt-1">
            Everything is running on schedule
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {tasks.map((task) => {
        const hoursOverdue = differenceInHours(
          new Date(),
          new Date(task.due_date)
        );
        const prof = Array.isArray(task.assigned_to_profile)
          ? task.assigned_to_profile[0]
          : task.assigned_to_profile;

        return (
          <div
            key={task.id}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            {/* Red side indicator */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl" />

            <div className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <UserAvatar
                  name={prof?.full_name || "?"}
                  avatarUrl={prof?.avatar_url}
                  size="sm"
                  className="shrink-0 rounded-xl ring-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14px] font-semibold text-gray-900">
                    {task.title}
                  </h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]">
                    <span className="flex items-center gap-1 text-gray-500">
                      <UserCircle className="h-3 w-3" />
                      {prof?.full_name || "Unassigned"}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 font-semibold text-red-600">
                      {hoursOverdue}h overdue
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onReassign(task)}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300"
                >
                  Reassign
                </button>
                <button
                  onClick={() => onEscalate(task.id)}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-orange-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-all duration-200 hover:bg-orange-600"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  Escalate
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
