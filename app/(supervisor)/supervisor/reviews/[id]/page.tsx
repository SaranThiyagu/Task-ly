import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReviewDetailClient } from "./client";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: taskId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify supervisor/manager role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["supervisor", "manager"].includes(profile.role)) {
    redirect("/login");
  }

  // Fetch task with assigned staff profile
  const { data: task } = await supabase
    .from("tasks")
    .select(
      "*, assigned_to_profile:profiles!tasks_assigned_to_fkey(*)"
    )
    .eq("id", taskId)
    .eq("org_id", profile.org_id)
    .single();

  if (!task) redirect("/supervisor/dashboard");

  // Fetch evidence for this task
  const { data: evidenceRows } = await supabase
    .from("task_evidence")
    .select("*, submitter:profiles!task_evidence_submitted_by_fkey(*)")
    .eq("task_id", taskId)
    .eq("org_id", profile.org_id)
    .order("submitted_at", { ascending: false })
    .limit(1);

  const evidence = evidenceRows?.[0] ?? null;

  // Fetch a manager for escalation target
  const { data: managers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "manager")
    .eq("org_id", profile.org_id)
    .limit(1);

  const managerId = managers?.[0]?.id || null;

  return (
    <ReviewDetailClient
      task={task}
      evidence={evidence}
      managerId={managerId}
    />
  );
}
