import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PendingReviewsClient } from "./client";

export default async function PendingReviewsPage() {
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

  return <PendingReviewsClient pendingReviewTasks={pendingReviewTasks} />;
}
