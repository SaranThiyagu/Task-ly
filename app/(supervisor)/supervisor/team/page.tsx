import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamClient } from "./client";

/**
 * Supervisor → My Team
 *
 * Server component: fetches staff, tasks, and pending review records,
 * passes pre-shaped data to the client. The client computes per-staff
 * stats and handles realtime updates.
 *
 * FUTURE:
 *  - real-time updates via Supabase Realtime (already wired in client)
 *  - bulk reassign tasks (modal trigger from team card)
 *  - performance charts (sparkline component per row)
 *  - leave / absence status (extra `profiles.availability` column)
 */
export default async function TeamPage() {
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

  // Staff members under this supervisor's purview.
  // (For now, all staff. Later: filter by team / supervisor mapping.)
  const { data: staffMembers } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, created_at")
    .eq("role", "staff")
    .order("full_name");

  // All tasks (for stats). Limited columns for efficiency.
  const { data: taskRows } = await supabase
    .from("tasks")
    .select("assigned_to, status, due_date, completed_at");

  // Reviewed task ids — used to find "pending review" tasks per staff.
  const { data: reviewedRows } = await supabase
    .from("task_reviews")
    .select("task_id");
  const reviewedSet = new Set(
    (reviewedRows || []).map((r: { task_id: string }) => r.task_id),
  );

  // Tasks that are completed but have no review record yet,
  // joined back to assignee for per-staff counting.
  const { data: completedTaskRows } = await supabase
    .from("tasks")
    .select("id, assigned_to")
    .eq("status", "completed");

  const pendingReviewByStaff = (completedTaskRows || []).reduce<
    Record<string, number>
  >((acc, t: { id: string; assigned_to: string }) => {
    if (!reviewedSet.has(t.id)) {
      acc[t.assigned_to] = (acc[t.assigned_to] || 0) + 1;
    }
    return acc;
  }, {});

  return (
    <TeamClient
      supervisorName={profile.full_name}
      staffMembers={staffMembers || []}
      taskRows={taskRows || []}
      pendingReviewByStaff={pendingReviewByStaff}
    />
  );
}
