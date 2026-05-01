import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ManagerDashboardClient } from "./client";

/**
 * Manager → Operations Overview
 *
 * Fetches a wide snapshot of operational state and shapes it for the
 * client. Keep this the only place that hits Supabase for this page.
 */
export default async function ManagerDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "manager") redirect("/login");

  /* ── Date anchors ── */
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfPrevWeek = new Date(startOfWeek);
  startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);

  /* ── All tasks (slim) ── */
  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, status, priority, site_location, assigned_to, created_by, due_date, completed_at, created_at",
    );

  const allTasks = tasks || [];
  const total = allTasks.length;
  const completedAll = allTasks.filter((t) => t.status === "completed").length;
  const completionRate =
    total > 0 ? Math.round((completedAll / total) * 100) : 0;

  /* ── Today metrics ── */
  const totalToday = allTasks.filter(
    (t) => new Date(t.created_at) >= startOfToday,
  ).length;
  const completedToday = allTasks.filter(
    (t) =>
      t.status === "completed" &&
      t.completed_at &&
      new Date(t.completed_at) >= startOfToday,
  ).length;
  const activeTasksCount = allTasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress",
  ).length;
  const overdueCount = allTasks.filter(
    (t) =>
      (t.status === "pending" || t.status === "in_progress") &&
      t.due_date &&
      new Date(t.due_date) < now,
  ).length;

  /* ── This-week vs last-week completion rate (for trend) ── */
  const thisWeekTasks = allTasks.filter(
    (t) => new Date(t.created_at) >= startOfWeek,
  );
  const prevWeekTasks = allTasks.filter((t) => {
    const c = new Date(t.created_at);
    return c >= startOfPrevWeek && c < startOfWeek;
  });
  const thisWeekRate =
    thisWeekTasks.length > 0
      ? Math.round(
          (thisWeekTasks.filter((t) => t.status === "completed").length /
            thisWeekTasks.length) *
            100,
        )
      : 0;
  const prevWeekRate =
    prevWeekTasks.length > 0
      ? Math.round(
          (prevWeekTasks.filter((t) => t.status === "completed").length /
            prevWeekTasks.length) *
            100,
        )
      : 0;
  const completionTrend = thisWeekRate - prevWeekRate;

  /* ── SLA compliance: completed on time / completed total ── */
  const completedRows = allTasks.filter((t) => t.status === "completed");
  const onTime = completedRows.filter(
    (t) =>
      t.completed_at &&
      t.due_date &&
      new Date(t.completed_at) <= new Date(t.due_date),
  ).length;
  const slaPercent =
    completedRows.length > 0
      ? Math.round((onTime / completedRows.length) * 100)
      : 100;

  /* ── Pending reviews (completed tasks without a review) ── */
  const { data: reviewedRows } = await supabase
    .from("task_reviews")
    .select("task_id");
  const reviewedSet = new Set(
    (reviewedRows || []).map((r: { task_id: string }) => r.task_id),
  );
  const pendingReviews = allTasks.filter(
    (t) => t.status === "completed" && !reviewedSet.has(t.id),
  ).length;

  /* ── Open escalations (with task + people) ── */
  const { data: escalations } = await supabase
    .from("escalations")
    .select(
      `id, reason, escalated_at, is_resolved,
       task:tasks!escalations_task_id_fkey(id, title, priority, site_location, assigned_to),
       from_profile:profiles!escalations_escalated_from_fkey(id, full_name, avatar_url),
       to_profile:profiles!escalations_escalated_to_fkey(id, full_name, avatar_url)`,
    )
    .eq("is_resolved", false)
    .order("escalated_at", { ascending: false })
    .limit(20);

  const openEscalations = escalations || [];
  const criticalEscalations = openEscalations.filter((e) => {
    const reason = typeof e.reason === "string" ? e.reason : "";
    if (reason.startsWith("CRITICAL:")) return true;
    const task = Array.isArray(e.task) ? e.task[0] : e.task;
    return task?.priority === "critical";
  }).length;

  /* ── Supervisor list (for performance breakdown) ── */
  const { data: supervisors } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("role", "supervisor")
    .order("full_name");

  /* ── Staff list (for Create Task modal) ── */
  const { data: staffList } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("role", "staff")
    .order("full_name", { ascending: true });

  /* ── Supervisor performance breakdown ── */
  const supervisorBreakdown = (supervisors || []).map((sup) => {
    const supTasks = allTasks.filter((t) => t.created_by === sup.id);
    const supAssigned = supTasks.length;
    const supCompleted = supTasks.filter((t) => t.status === "completed").length;
    const supOverdue = supTasks.filter(
      (t) =>
        (t.status === "pending" || t.status === "in_progress") &&
        t.due_date &&
        new Date(t.due_date) < now,
    ).length;
    const supInProgress = supTasks.filter(
      (t) => t.status === "in_progress",
    ).length;
    const supRate =
      supAssigned > 0
        ? Math.round((supCompleted / supAssigned) * 100)
        : 0;
    const supEscalations = openEscalations.filter((e) => {
      const from = Array.isArray(e.from_profile)
        ? e.from_profile[0]
        : e.from_profile;
      return (from as { id: string } | undefined)?.id === sup.id;
    }).length;
    return {
      id: sup.id,
      full_name: sup.full_name,
      avatar_url: sup.avatar_url ?? null,
      assigned: supAssigned,
      completed: supCompleted,
      overdue: supOverdue,
      inProgress: supInProgress,
      completionRate: supRate,
      escalationCount: supEscalations,
    };
  });

  /* ── Site performance breakdown ── */
  const siteMap = new Map<
    string,
    {
      assigned: number;
      completed: number;
      overdue: number;
      escalations: number;
    }
  >();
  for (const t of allTasks) {
    const site = t.site_location || "Unspecified";
    if (!siteMap.has(site)) {
      siteMap.set(site, {
        assigned: 0,
        completed: 0,
        overdue: 0,
        escalations: 0,
      });
    }
    const s = siteMap.get(site)!;
    s.assigned += 1;
    if (t.status === "completed") s.completed += 1;
    if (
      (t.status === "pending" || t.status === "in_progress") &&
      t.due_date &&
      new Date(t.due_date) < now
    )
      s.overdue += 1;
  }
  for (const e of openEscalations) {
    const task = Array.isArray(e.task) ? e.task[0] : e.task;
    const site = task?.site_location || "Unspecified";
    if (siteMap.has(site)) siteMap.get(site)!.escalations += 1;
  }
  const sitePerformance = Array.from(siteMap.entries()).map(([site, v]) => ({
    site,
    ...v,
    completionRate:
      v.assigned > 0 ? Math.round((v.completed / v.assigned) * 100) : 0,
  }));

  /* ── Recent activity: completions + escalations + submissions ── */
  const { data: recentCompletions } = await supabase
    .from("tasks")
    .select(
      `id, title, completed_at, site_location,
       assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name, avatar_url)`,
    )
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(5);

  /* ── 7-day chart ── */
  const chart: {
    iso: string;
    weekday: string;
    monthDay: string;
    completed: number;
    overdue: number;
  }[] = [];
  const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const monthDayFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const dayCompleted = allTasks.filter(
      (t) =>
        t.status === "completed" &&
        t.completed_at &&
        new Date(t.completed_at) >= dayStart &&
        new Date(t.completed_at) <= dayEnd,
    ).length;
    const dayOverdue = allTasks.filter(
      (t) =>
        (t.status === "pending" || t.status === "in_progress") &&
        t.due_date &&
        new Date(t.due_date) >= dayStart &&
        new Date(t.due_date) <= dayEnd &&
        new Date(t.due_date) < now,
    ).length;

    chart.push({
      iso: dayStart.toISOString(),
      weekday: weekdayFmt.format(dayStart),
      monthDay: monthDayFmt.format(dayStart),
      completed: dayCompleted,
      overdue: dayOverdue,
    });
  }

  return (
    <ManagerDashboardClient
      profile={profile}
      kpis={{
        totalToday,
        completedToday,
        completionRate,
        completionTrend,
        slaPercent,
        overdueCount,
        activeTasksCount,
        pendingReviews,
        escalationCount: openEscalations.length,
        criticalEscalations,
      }}
      escalations={openEscalations}
      sitePerformance={sitePerformance}
      supervisorBreakdown={supervisorBreakdown}
      recentCompletions={recentCompletions || []}
      supervisors={supervisors || []}
      staffList={staffList || []}
      chartData={chart}
    />
  );
}
