import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TaskDetailClient } from "./client";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (!task) redirect("/staff/dashboard");

  // Fetch creator profile separately (avoids FK naming issues)
  const { data: creator } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", task.created_by)
    .single();

  // Verify assignment
  if (task.assigned_to !== user.id) redirect("/staff/dashboard");

  // Fetch evidence for this task
  const { data: evidence } = await supabase
    .from("task_evidence")
    .select("*")
    .eq("task_id", id)
    .order("submitted_at", { ascending: false });

  // Fetch reviews for this task
  const { data: reviews } = await supabase
    .from("task_reviews")
    .select("*")
    .eq("task_id", id)
    .order("reviewed_at", { ascending: false });

  // Fetch reviewer profiles
  const reviewerIds = [...new Set((reviews || []).map((r) => r.reviewed_by))];
  const { data: reviewerProfiles } = reviewerIds.length > 0
    ? await supabase.from("profiles").select("*").in("id", reviewerIds)
    : { data: [] };

  const reviewsWithProfiles = (reviews || []).map((r) => ({
    ...r,
    reviewed_by: (reviewerProfiles || []).find((p) => p.id === r.reviewed_by) || null,
  }));

  return (
    <TaskDetailClient
      task={task}
      creator={creator}
      evidence={evidence || []}
      reviews={reviewsWithProfiles}
    />
  );
}
