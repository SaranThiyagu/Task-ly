"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import {
  ClipboardCheck,
  MapPin,
  Clock,
  Search,
  ArrowRight,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Profile } from "@/lib/types";
import type { TaskPriority } from "@/lib/types";

interface PendingReviewTask {
  id: string;
  title: string;
  priority: string;
  site_location: string | null;
  completed_at: string | null;
  assigned_to_profile: Pick<Profile, "full_name" | "avatar_url"> | Pick<Profile, "full_name" | "avatar_url">[];
}

interface PendingReviewsClientProps {
  pendingReviewTasks: PendingReviewTask[];
}

type SortMode = "newest" | "oldest" | "priority";
type FilterPriority = "all" | "critical" | "high" | "medium" | "low";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-400",
  high: "bg-orange-400",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

const PRIORITY_TEXT: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-emerald-400",
};

export function PendingReviewsClient({
  pendingReviewTasks: initialTasks,
}: PendingReviewsClientProps) {
  const router = useRouter();
  const [pendingReviewTasks, setPendingReviewTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("reviews-tasks")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_reviews" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    setPendingReviewTasks(initialTasks);
  }, [initialTasks]);

  // Filter and sort
  const filteredTasks = pendingReviewTasks
    .filter((task) => {
      if (filterPriority !== "all" && task.priority !== filterPriority) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const prof = Array.isArray(task.assigned_to_profile)
          ? task.assigned_to_profile[0]
          : task.assigned_to_profile;
        return (
          task.title.toLowerCase().includes(q) ||
          prof?.full_name?.toLowerCase().includes(q) ||
          task.site_location?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortMode === "priority") {
        return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      }
      const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return sortMode === "newest" ? dateB - dateA : dateA - dateB;
    });

  const priorityFilters: { key: FilterPriority; label: string }[] = [
    { key: "all", label: "All" },
    { key: "critical", label: "Critical" },
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
    { key: "low", label: "Low" },
  ];

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: "newest", label: "Newest first" },
    { key: "oldest", label: "Oldest first" },
    { key: "priority", label: "Priority" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Pending Reviews
          </h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Review completed tasks awaiting your approval
          </p>
        </div>
        {pendingReviewTasks.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-xl bg-amber-50 border border-amber-200/60 px-3 py-1.5 text-[12px] font-semibold text-amber-700">
              {pendingReviewTasks.length} awaiting
            </span>
          </div>
        )}
      </div>

      {/* ── Toolbar: Search + Filters + Sort ── */}
      {pendingReviewTasks.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks, staff, locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-3 text-[13px] text-gray-700 placeholder:text-gray-400 transition-all duration-200 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Right: Filter pills + Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority filter pills */}
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
              {priorityFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterPriority(f.key)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                    filterPriority === f.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f.key !== "all" && (
                    <span
                      className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[f.key] || ""}`}
                    />
                  )}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300"
              >
                <SlidersHorizontal className="h-3 w-3" />
                {sortOptions.find((s) => s.key === sortMode)?.label}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-40 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortMode(opt.key);
                          setShowSortMenu(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors ${
                          sortMode === opt.key
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Task List ── */}
      {pendingReviewTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 mb-4">
            <ClipboardCheck className="h-7 w-7 text-green-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            All caught up!
          </h3>
          <p className="mt-1 text-[13px] text-gray-500 max-w-xs">
            No pending reviews at the moment. Completed tasks will appear here.
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <Search className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-[13px] text-gray-500">
            No tasks match your search or filters
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task, idx) => {
            const prof = Array.isArray(task.assigned_to_profile)
              ? task.assigned_to_profile[0]
              : task.assigned_to_profile;
            const dotColor = PRIORITY_DOT[task.priority] || "bg-gray-400";
            const textColor = PRIORITY_TEXT[task.priority] || "text-gray-400";

            return (
              <Link key={task.id} href={`/supervisor/reviews/${task.id}`}>
                <div
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 cursor-pointer"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    {/* Avatar + Info */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <UserAvatar
                        name={prof?.full_name || "?"}
                        avatarUrl={prof?.avatar_url}
                        size="md"
                        className="shrink-0 ring-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="truncate text-[14px] font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                            {task.title}
                          </p>
                        </div>
                        <p className="text-[12px] text-gray-500 mb-1">
                          {prof?.full_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                          {/* Priority indicator */}
                          <span className="flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                            <span className={`font-semibold uppercase tracking-wider ${textColor}`}>
                              {task.priority}
                            </span>
                          </span>
                          {task.site_location && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <MapPin className="h-3 w-3" />
                              {task.site_location}
                            </span>
                          )}
                          {task.completed_at && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(task.completed_at), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Review CTA */}
                    <div className="flex items-center shrink-0">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-all duration-200 group-hover:bg-indigo-600 group-hover:shadow-indigo-600/20">
                        Review
                        <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Footer summary ── */}
      {filteredTasks.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-gray-400">
            Showing {filteredTasks.length} of {pendingReviewTasks.length} tasks
          </p>
        </div>
      )}
    </div>
  );
}
