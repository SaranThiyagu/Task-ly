import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ManagerAllTasksClient } from "./client";

export default async function ManagerTasksPage() {
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

  /* ── All tasks with assignee + creator profiles ── */
  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      `*,
       assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url, role),
       created_by_profile:profiles!tasks_created_by_fkey(id, full_name, avatar_url, role)`,
    )
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  /* ── Open escalations per task (to show badge) ── */
  const { data: escalations } = await supabase
    .from("escalations")
    .select("task_id")
    .eq("is_resolved", false)
    .eq("org_id", profile.org_id);

  const escalatedTaskIds = new Set(
    (escalations || []).map((e: { task_id: string }) => e.task_id),
  );

  /* ── Staff list for Create Task modal ── */
  const { data: staffList } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("role", "staff")
    .eq("org_id", profile.org_id)
    .order("full_name", { ascending: true });

  const tasksWithEscalation = (tasks || []).map((t) => ({
    ...t,
    has_escalation: escalatedTaskIds.has(t.id),
  }));

  return (
    <ManagerAllTasksClient
      tasks={tasksWithEscalation}
      staffList={staffList || []}
    />
  );
}
