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
import {
  reassignTask,
  escalateTask,
} from "@/app/(supervisor)/supervisor/reviews/[id]/actions";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";

import { StatCard } from "@/components/supervisor/dashboard/StatCard";
import { PriorityStrip } from "@/components/supervisor/dashboard/PriorityStrip";
import { TaskList } from "@/components/supervisor/dashboard/TaskList";
import { OverdueList } from "@/components/supervisor/dashboard/OverdueList";
import { ActivityFeed } from "@/components/supervisor/dashboard/ActivityFeed";
import { AIInsights } from "@/components/supervisor/dashboard/AIInsights";
import { TopBar } from "@/components/supervisor/dashboard/TopBar";

/* ───────────────────────────────────────────────
   Server-fetched data types
   ─────────────────────────────────────────────── */

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

interface OverdueTask {
  id: string;
  title: string;
  due_date: string;
  status: string;
  assigned_to_profile:
    | Pick<Profile, "full_name" | "avatar_url">
    | Pick<Profile, "full_name" | "avatar_url">[];
}

interface StaffOption {
  id: string;
  full_name: string;
}

interface RecentCompletion {
  id: string;
  title: string;
  completed_at: string | null;
  assigned_to_profile:
    | Pick<Profile, "full_name" | "avatar_url">
    | Pick<Profile, "full_name" | "avatar_url">[];
}

interface RecentSubmission {
  id: string;
  submitted_at: string;
  task_id: string;
  task:
    | { id: string; title: string; status: string }
    | { id: string; title: string; status: string }[];
  submitter:
    | Pick<Profile, "full_name" | "avatar_url">
    | Pick<Profile, "full_name" | "avatar_url">[];
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
  const [pendingReviewTasks, setPendingReviewTasks] = useState(
    initialPendingReviews,
  );
  const [overdueTasks, setOverdueTasks] = useState(initialOverdue);

  /* ── Reassign modal state ── */
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignTaskId, setReassignTaskId] = useState<string | null>(null);
  const [reassignTaskTitle, setReassignTaskTitle] = useState("");
  const [reassignCurrentAssignee, setReassignCurrentAssignee] = useState("");

  /* ── Escalate modal state ── */
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

  /* ── Real-time subscriptions ── */
  useEffect(() => {
    const supabase = createClient();
    const evidenceChannel = supabase
      .channel("supervisor-evidence")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_evidence" },
        () => router.refresh(),
      )
      .subscribe();
    const tasksChannel = supabase
      .channel("supervisor-tasks")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(evidenceChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [router]);

  /* ── Sync from server refresh ── */
  useEffect(() => {
    setPendingReviewTasks(initialPendingReviews);
  }, [initialPendingReviews]);

  useEffect(() => {
    setOverdueTasks(initialOverdue);
  }, [initialOverdue]);

  /* ── Activity feed (combined, sorted, capped) ── */
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
      const submitter = Array.isArray(s.submitter)
        ? s.submitter[0]
        : s.submitter;
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
      const from = Array.isArray(e.from_profile)
        ? e.from_profile[0]
        : e.from_profile;
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

  /* ── KPI stat cards ── */
  const statCards = [
    {
      label: "Pending Reviews",
      value: pendingReviewTasks.length,
      icon: ClipboardCheck,
      tone: "amber" as const,
      subLabel: "Awaiting your approval",
      cta:
        pendingReviewTasks.length > 0
          ? { label: "Review Now", href: "/supervisor/reviews" }
          : undefined,
    },
    {
      label: "Overdue Tasks",
      value: overdueTasks.length,
      icon: AlertTriangle,
      tone: "red" as const,
      critical: true,
      subLabel: "Past due date",
      cta:
        overdueTasks.length > 0
          ? { label: "Resolve Now", href: "/supervisor/tasks?filter=overdue" }
          : undefined,
    },
    {
      label: "Completed Today",
      value: completedTodayCount,
      icon: CheckCircle2,
      tone: "green" as const,
      subLabel: "Great progress",
    },
    {
      label: "Active Tasks",
      value: activeTasksCount,
      icon: Activity,
      tone: "blue" as const,
      subLabel: "In progress",
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* ─── Header ─── */}
      <TopBar name={profile.full_name} />

      {/* Mobile header */}
      <div className="lg:hidden">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Supervisor Dashboard
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Welcome back, {profile.full_name.split(" ")[0]} ·{" "}
          {format(new Date(), "MMM d, yyyy")}
        </p>
      </div>

      {/* ═══════════════════════════════════════════
         1. KPI STATS — Top summary metrics
         Pending Reviews + Overdue carry inline CTAs.
         ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* ═══════════════════════════════════════════
         2. CRITICAL · ATTENTION REQUIRED
         The most prominent section when overdue exists.
         Strong red treatment, top of fold below stats.
         ═══════════════════════════════════════════ */}
      <PriorityStrip tasks={overdueTasks} onEscalate={openEscalate} />

      {/* ═══════════════════════════════════════════
         3. AI INSIGHTS — Elevated, full-width row.
         Actionable cards (3 max).
         ═══════════════════════════════════════════ */}
      <AIInsights
        overdueCount={overdueTasks.length}
        completedToday={completedTodayCount}
        pendingReviews={pendingReviewTasks.length}
        activeTasks={activeTasksCount}
      />

      {/* ═══════════════════════════════════════════
         4. WORKFLOWS + ACTIVITY
         Left (70%): Pending Reviews + Overdue Tasks
         Right (30%): Activity Feed
         ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-10">
        {/* LEFT */}
        <div className="space-y-6 xl:col-span-7">
          {/* Pending Reviews */}
          <section>
            <SectionHeader
              title="Pending Reviews"
              count={pendingReviewTasks.length}
              countLabel="awaiting"
              tone="amber"
            />
            <TaskList tasks={pendingReviewTasks} />
          </section>

          {/* Overdue Tasks */}
          <section>
            <SectionHeader
              title="Overdue Tasks"
              count={overdueTasks.length}
              countLabel="critical"
              tone="red"
            />
            <OverdueList
              tasks={overdueTasks}
              onReassign={openReassign}
              onEscalate={openEscalate}
            />
          </section>
        </div>

        {/* RIGHT */}
        <aside className="xl:col-span-3">
          <SectionHeader title="Activity" />
          <ActivityFeed items={activityFeed} />
        </aside>
      </div>

      {/* ─── Modals ─── */}
      <ReassignModal
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onConfirm={handleReassign}
        staffList={staffList}
        currentAssignee={reassignCurrentAssignee}
        taskTitle={reassignTaskTitle}
      />
      <EscalateModal
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        onConfirm={handleEscalate}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Inline section header w/ count chip
   ═══════════════════════════════════════════ */

function SectionHeader({
  title,
  count,
  countLabel,
  tone,
}: {
  title: string;
  count?: number;
  countLabel?: string;
  tone?: "amber" | "red";
}) {
  const toneCls =
    tone === "red"
      ? "bg-red-100 text-red-700 ring-red-200"
      : tone === "amber"
        ? "bg-amber-100 text-amber-800 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
      {typeof count === "number" && count > 0 && (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${toneCls}`}
        >
          {count} {countLabel}
        </span>
      )}
    </div>
  );
}
