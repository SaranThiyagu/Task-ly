import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SupervisorDashboardClient } from "./client";

export default async function SupervisorDashboardPage() {
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

  if (!profile || profile.role !== "supervisor") redirect("/login");

  // Pending reviews = completed tasks with NO record in task_reviews
  const { data: reviewedTaskIds } = await supabase
    .from("task_reviews")
    .select("task_id");

  const reviewedIds = new Set(
    (reviewedTaskIds || []).map((r: { task_id: string }) => r.task_id)
  );

  const { data: completedTasks } = await supabase
    .from("tasks")
    .select(`
      *,
      assigned_to_profile:profiles!tasks_assigned_to_fkey(*)
    `)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const pendingReviewTasks = (completedTasks || []).filter(
    (t: { id: string }) => !reviewedIds.has(t.id)
  );

  // Fetch overdue tasks (pending/in_progress with past due date)
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select(`
      *,
      assigned_to_profile:profiles!tasks_assigned_to_fkey(*)
    `)
    .in("status", ["pending", "in_progress"])
    .lt("due_date", new Date().toISOString())
    .order("due_date", { ascending: true });

  // Fetch completed today count
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count: completedTodayCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", startOfDay.toISOString());

  // Fetch total active tasks
  const { count: activeTasksCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "in_progress"]);

  // Fetch recent activity (last 10 completions + evidence submissions + escalations)
  const { data: recentCompletions } = await supabase
    .from("tasks")
    .select(`
      id, title, status, completed_at,
      assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name, avatar_url)
    `)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10);

  // Fetch recent evidence submissions (staff submitted for review)
  const { data: recentSubmissions } = await supabase
    .from("task_evidence")
    .select(`
      id, submitted_at, task_id,
      task:tasks!task_evidence_task_id_fkey(id, title, status),
      submitter:profiles!task_evidence_submitted_by_fkey(full_name, avatar_url)
    `)
    .order("submitted_at", { ascending: false })
    .limit(10);

  const { data: recentEscalations } = await supabase
    .from("escalations")
    .select(`
      id, reason, escalated_at, is_resolved,
      task:tasks!escalations_task_id_fkey(id, title),
      from_profile:profiles!escalations_escalated_from_fkey(full_name),
      to_profile:profiles!escalations_escalated_to_fkey(full_name)
    `)
    .order("escalated_at", { ascending: false })
    .limit(10);

  // Fetch staff list for reassign modal
  const { data: staffList } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "staff")
    .order("full_name");

  // Fetch a manager for escalation target
  const { data: managers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "manager")
    .limit(1);

  const managerId = managers?.[0]?.id || null;

  return (
    <SupervisorDashboardClient
      profile={profile}
      pendingReviewTasks={pendingReviewTasks}
      overdueTasks={overdueTasks || []}
      completedTodayCount={completedTodayCount || 0}
      activeTasksCount={activeTasksCount || 0}
      recentCompletions={recentCompletions || []}
      recentSubmissions={recentSubmissions || []}
      recentEscalations={recentEscalations || []}
      staffList={staffList || []}
      managerId={managerId}
    />
  );
}
