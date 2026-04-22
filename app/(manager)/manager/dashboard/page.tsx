import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ManagerDashboardClient } from "./client";

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

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // ── All tasks with profiles ──
  const { data: allTasks } = await supabase
    .from("tasks")
    .select(
      "*, assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)"
    )
    .order("created_at", { ascending: false });

  // ── KPI counts ──
  const { count: totalToday } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfDay.toISOString());

  const { count: completedToday } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", startOfDay.toISOString());

  const { count: overdueCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "in_progress"])
    .lt("due_date", new Date().toISOString());

  const { count: pendingReviewCount } = await supabase
    .from("task_evidence")
    .select("*, task_reviews!inner(task_id)", {
      count: "exact",
      head: true,
    })
    .is("task_reviews.task_id", null);

  // Fallback: count evidence whose task_id has no review
  const { data: allEvidence } = await supabase
    .from("task_evidence")
    .select("task_id");
  const { data: allReviews } = await supabase
    .from("task_reviews")
    .select("task_id");
  const reviewedIds = new Set(
    (allReviews || []).map((r: { task_id: string }) => r.task_id)
  );
  const pendingReviews = (allEvidence || []).filter(
    (e: { task_id: string }) => !reviewedIds.has(e.task_id)
  ).length;

  // ── Open escalations ──
  const { data: escalations } = await supabase
    .from("escalations")
    .select(
      `*,
      task:tasks!escalations_task_id_fkey(id, title),
      from_profile:profiles!escalations_escalated_from_fkey(id, full_name),
      to_profile:profiles!escalations_escalated_to_fkey(id, full_name),
      staff_profile:tasks!escalations_task_id_fkey(
        assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name)
      )`
    )
    .eq("is_resolved", false)
    .order("escalated_at", { ascending: false });

  // ── Chart data: last 7 days completed vs overdue ──
  const chartData: { date: string; completed: number; overdue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const { count: dayCompleted } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", dayStart.toISOString())
      .lte("completed_at", dayEnd.toISOString());

    const { count: dayOverdue } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "in_progress"])
      .lt("due_date", dayEnd.toISOString())
      .gte("due_date", dayStart.toISOString());

    chartData.push({
      date: dayStart.toISOString(),
      completed: dayCompleted || 0,
      overdue: dayOverdue || 0,
    });
  }

  // ── Total active for completion rate ──
  const total = allTasks?.length || 0;
  const completed = allTasks?.filter((t) => t.status === "completed").length || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <ManagerDashboardClient
      profile={profile}
      allTasks={allTasks || []}
      kpis={{
        totalToday: totalToday || 0,
        completionRate,
        overdueCount: overdueCount || 0,
        escalationCount: (escalations || []).length,
        pendingReviews,
      }}
      escalations={escalations || []}
      chartData={chartData}
    />
  );
}
