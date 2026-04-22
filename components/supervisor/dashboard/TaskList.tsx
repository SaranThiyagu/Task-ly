"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Clock, CheckCircle2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Profile } from "@/lib/types";

interface PendingReviewTask {
  id: string;
  title: string;
  site_location: string | null;
  priority: string;
  completed_at: string | null;
  assigned_to_profile:
    | Pick<Profile, "full_name" | "avatar_url">
    | Pick<Profile, "full_name" | "avatar_url">[];
}

type FilterTab = "all" | "high" | "recent";

interface TaskListProps {
  tasks: PendingReviewTask[];
}

export function TaskList({ tasks }: TaskListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "high")
      return task.priority === "high" || task.priority === "critical";
    if (activeTab === "recent") {
      if (!task.completed_at) return false;
      const hoursDiff =
        (Date.now() - new Date(task.completed_at).getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    }
    return true;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "high", label: "High Priority" },
    { key: "recent", label: "Recent" },
  ];

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <CheckCircle2 className="h-9 w-9 text-green-400 mb-2" />
          <p className="text-sm font-medium text-gray-600">
            All reviews are up to date
          </p>
          <p className="text-xs text-gray-400 mt-1">
            No pending reviews at the moment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-3 flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              No tasks match this filter
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const prof = Array.isArray(task.assigned_to_profile)
              ? task.assigned_to_profile[0]
              : task.assigned_to_profile;
            return (
              <Link key={task.id} href={`/supervisor/reviews/${task.id}`}>
                <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 cursor-pointer">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <UserAvatar
                        name={prof?.full_name || "?"}
                        avatarUrl={prof?.avatar_url}
                        size="md"
                        className="shrink-0 rounded-xl ring-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                          {task.title}
                        </p>
                        <p className="text-[12px] text-gray-500 mt-0.5">
                          {prof?.full_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-400">
                          {task.site_location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {task.site_location}
                            </span>
                          )}
                          {task.completed_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(
                                new Date(task.completed_at),
                                { addSuffix: true }
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center shrink-0">
                      <span className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-[12px] font-semibold text-white transition-all duration-200 group-hover:bg-amber-700 shadow-sm shadow-amber-600/20">
                        Review
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
