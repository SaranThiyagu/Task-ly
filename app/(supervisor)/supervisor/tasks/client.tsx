"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isPast } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import {
  ClipboardList,
  MapPin,
  Clock,
  Inbox,
  Search,
  UserCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/types";
import type { TaskStatus, TaskPriority } from "@/lib/types";

interface TaskWithStaff {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  site_location: string | null;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  assigned_to_profile: { full_name: string; avatar_url: string | null };
}

interface AllTasksClientProps {
  tasks: TaskWithStaff[];
}

export function AllTasksClient({ tasks: initialTasks }: AllTasksClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("supervisor-all-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assigned_to_profile?.full_name
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      t.site_location?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  function getDisplayStatus(task: TaskWithStaff): TaskStatus {
    if (
      (task.status === "pending" || task.status === "in_progress") &&
      isPast(new Date(task.due_date))
    ) {
      return "overdue";
    }
    return task.status;
  }

  const statusCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Tasks</h1>
        <p className="mt-1 text-sm text-slate-500">
          {tasks.length} total task{tasks.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search tasks, staff, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All Status ({statusCounts.all})</option>
            <option value="pending">Pending ({statusCounts.pending})</option>
            <option value="in_progress">
              In Progress ({statusCounts.in_progress})
            </option>
            <option value="completed">
              Completed ({statusCounts.completed})
            </option>
            <option value="rejected">
              Rejected ({statusCounts.rejected})
            </option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 mb-4">
            <Inbox className="h-7 w-7 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No tasks found
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">
            Try adjusting your filters or search query
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const displayStatus = getDisplayStatus(task);
            const statusCfg = STATUS_CONFIG[displayStatus];
            const priorityCfg = PRIORITY_CONFIG[task.priority];
            const isOverdue = displayStatus === "overdue";
            const prof = task.assigned_to_profile;

            return (
              <Card
                key={task.id}
                className={`p-4 hover:bg-gray-50/80 transition-colors ${
                  isOverdue ? "border-l-4 border-l-red-500" : ""
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">
                        {task.title}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${statusCfg?.color || ""}`}
                      >
                        {statusCfg?.label || task.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${priorityCfg?.color || ""}`}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <UserCircle className="h-3 w-3" />
                        {prof?.full_name || "Unassigned"}
                      </span>
                      {task.site_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {task.site_location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due {format(new Date(task.due_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/supervisor/reviews/${task.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 h-7 text-[0.8rem] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    View
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
