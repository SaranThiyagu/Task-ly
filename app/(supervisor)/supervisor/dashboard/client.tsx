"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { ReassignModal } from "@/components/supervisor/ReassignModal";
import { EscalateModal } from "@/components/supervisor/EscalateModal";
import { reassignTask, escalateTask } from "@/app/(supervisor)/supervisor/reviews/[id]/actions";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";

import { StatCard } from "@/components/supervisor/dashboard/StatCard";
import { PriorityStrip } from "@/components/supervisor/dashboard/PriorityStrip";
import { TaskList } from "@/components/supervisor/dashboard/TaskList";
import { OverdueList } from "@/components/supervisor/dashboard/OverdueList";
import { ActivityFeed } from "@/components/supervisor/dashboard/ActivityFeed";
import { AIInsights } from "@/components/supervisor/dashboard/AIInsights";
import { TopBar } from "@/components/supervisor/dashboard/TopBar";

// --- Types for server-fetched data ---

interface PendingReviewTask {
  id: string;
  title: string;
  site_location: string | null;
  priority: string;
  completed_at: string | null;
  assigned_to_profile: Pick<Profile, "full_name" | "avatar_url"> | Pick<Profile, "full_name" | "avatar_url">[];
}

interface OverdueTask {
  id: string;
  title: string;
  due_date: string;
  status: string;
  assigned_to_profile: Pick<Profile, "full_name" | "avatar_url"> | Pick<Profile, "full_name" | "avatar_url">[];
}

interface StaffOption {
  id: string;
  full_name: string;
}

interface RecentCompletion {
  id: string;
  title: string;
  completed_at: string | null;
  assigned_to_profile: Pick<Profile, "full_name" | "avatar_url"> | Pick<Profile, "full_name" | "avatar_url">[];
}

interface RecentSubmission {
  id: string;
  submitted_at: string;
  task_id: string;
  task: { id: string; title: string; status: string } | { id: string; title: string; status: string }[];
  submitter: Pick<Profile, "full_name" | "avatar_url"> | Pick<Profile, "full_name" | "avatar_url">[];
}

interface RecentEscalation {
  id: string;
  reason: string;
  escalated_at: string;
  is_resolved: boolean;
  task: { id: string; title: string } | { id: string; title: string }[];
  from_profile: { full_name: string } | { full_name: string }[];
  to_profile: { full_name: string } | { full_name: string }[];
}

interface SupervisorDashboardClientProps {
  profile: Profile;
  pendingReviewTasks: PendingReviewTask[];
  overdueTasks: OverdueTask[];
  completedTodayCount: number;
  activeTasksCount: number;
  recentCompletions: RecentCompletion[];
  recentSubmissions: RecentSubmission[];
  recentEscalations: RecentEscalation[];
  staffList: StaffOption[];
  managerId: string | null;
}

export function SupervisorDashboardClient({
  profile,
  pendingReviewTasks: initialPendingReviews,
  overdueTasks: initialOverdue,
  completedTodayCount,
  activeTasksCount,
  recentCompletions,
  recentSubmissions,
  recentEscalations,
  staffList,
  managerId,
}: SupervisorDashboardClientProps) {
  const router = useRouter();
  const [pendingReviewTasks, setPendingReviewTasks] = useState(initialPendingReviews);
  const [overdueTasks, setOverdueTasks] = useState(initialOverdue);

  // Reassign modal state
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignTaskId, setReassignTaskId] = useState<string | null>(null);
  const [reassignTaskTitle, setReassignTaskTitle] = useState("");
  const [reassignCurrentAssignee, setReassignCurrentAssignee] = useState("");

  // Escalate modal state
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateTaskId, setEscalateTaskId] = useState<string | null>(null);

  function openReassign(task: OverdueTask) {
    const prof = Array.isArray(task.assigned_to_profile)
      ? task.assigned_to_profile[0]
      : task.assigned_to_profile;
    setReassignTaskId(task.id);
    setReassignTaskTitle(task.title);
    setReassignCurrentAssignee(prof?.full_name || "");
    setReassignOpen(true);
  }

  async function handleReassign(newAssigneeId: string, newDueDate: string) {
    if (!reassignTaskId) return;
    const result = await reassignTask(reassignTaskId, newAssigneeId, newDueDate);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Task reassigned successfully!");
    setReassignOpen(false);
    router.refresh();
  }

  function openEscalate(taskId: string) {
    setEscalateTaskId(taskId);
    setEscalateOpen(true);
  }

  async function handleEscalate(reason: string) {
    if (!escalateTaskId || !managerId) {
      toast.error("No manager available for escalation");
      return;
    }
    const result = await escalateTask(escalateTaskId, reason, managerId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Task escalated to manager.");
    setEscalateOpen(false);
    router.refresh();
  }

  // Real-time subscriptions
  useEffect(() => {
    const supabase = createClient();

    const evidenceChannel = supabase
      .channel("supervisor-evidence")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_evidence" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    const tasksChannel = supabase
      .channel("supervisor-tasks")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(evidenceChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [router]);

  // Sync props when server data refreshes
  useEffect(() => {
    setPendingReviewTasks(initialPendingReviews);
  }, [initialPendingReviews]);

  useEffect(() => {
    setOverdueTasks(initialOverdue);
  }, [initialOverdue]);

  // Build combined activity feed sorted by time
  const activityFeed = [
    ...recentCompletions.map((c) => {
      const prof = Array.isArray(c.assigned_to_profile)
        ? c.assigned_to_profile[0]
        : c.assigned_to_profile;
      return {
        id: `completion-${c.id}`,
        type: "completion" as const,
        title: c.title,
        name: prof?.full_name || "Unknown",
        time: c.completed_at || "",
      };
    }),
    ...recentSubmissions.map((s) => {
      const task = Array.isArray(s.task) ? s.task[0] : s.task;
      const submitter = Array.isArray(s.submitter) ? s.submitter[0] : s.submitter;
      return {
        id: `submission-${s.id}`,
        type: "submission" as const,
        title: task?.title || "Unknown task",
        name: submitter?.full_name || "Unknown",
        time: s.submitted_at,
      };
    }),
    ...recentEscalations.map((e) => {
      const task = Array.isArray(e.task) ? e.task[0] : e.task;
      const from = Array.isArray(e.from_profile) ? e.from_profile[0] : e.from_profile;
      return {
        id: `escalation-${e.id}`,
        type: "escalation" as const,
        title: task?.title || "Unknown task",
        name: from?.full_name || "Unknown",
        time: e.escalated_at,
      };
    }),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);

  const statCards = [
    {
      label: "Pending Reviews",
      value: pendingReviewTasks.length,
      icon: ClipboardCheck,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
    },
    {
      label: "Completed Today",
      value: completedTodayCount,
      icon: CheckCircle2,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
    },
    {
      label: "Overdue Tasks",
      value: overdueTasks.length,
      icon: AlertTriangle,
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
      critical: true,
    },
    {
      label: "Active Tasks",
      value: activeTasksCount,
      icon: Activity,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar - Desktop */}
      <TopBar name={profile.full_name} />

      {/* Mobile header */}
      <div className="lg:hidden">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Supervisor Dashboard
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Welcome back, {profile.full_name.split(" ")[0]} &middot;{" "}
          {format(new Date(), "MMM d, yyyy")}
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Priority Strip — Attention Required */}
      <PriorityStrip tasks={overdueTasks} />

      {/* Main Content Grid: 70/30 split */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-10">
        {/* LEFT: Task Workflows (70%) */}
        <div className="space-y-6 xl:col-span-7">
          {/* Pending Reviews Section */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-gray-900">
                  Pending Reviews
                </h2>
                {pendingReviewTasks.length > 0 && (
                  <span className="inline-flex items-center rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {pendingReviewTasks.length} awaiting
                  </span>
                )}
              </div>
            </div>
            <TaskList tasks={pendingReviewTasks} />
          </section>

          {/* Overdue Tasks Section */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-gray-900">
                Overdue Tasks
              </h2>
              {overdueTasks.length > 0 && (
                <span className="inline-flex items-center rounded-lg bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 stat-card-critical">
                  {overdueTasks.length} critical
                </span>
              )}
            </div>
            <OverdueList
              tasks={overdueTasks}
              onReassign={openReassign}
              onEscalate={openEscalate}
            />
          </section>
        </div>

        {/* RIGHT: Activity Feed + AI Insights (30%) */}
        <div className="space-y-4 xl:col-span-3">
          {/* AI Insights */}
          <AIInsights
            overdueCount={overdueTasks.length}
            completedToday={completedTodayCount}
            pendingReviews={pendingReviewTasks.length}
          />

          {/* Activity Feed */}
          <div>
            <h2 className="mb-3 text-[15px] font-semibold text-gray-900">
              Activity
            </h2>
            <ActivityFeed items={activityFeed} />
          </div>
        </div>
      </div>

      {/* Reassign Modal */}
      <ReassignModal
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onConfirm={handleReassign}
        staffList={staffList}
        currentAssignee={reassignCurrentAssignee}
        taskTitle={reassignTaskTitle}
      />

      {/* Escalate Modal */}
      <EscalateModal
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        onConfirm={handleEscalate}
      />
    </div>
  );
}
