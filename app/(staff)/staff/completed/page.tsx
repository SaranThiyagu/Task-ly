import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Task } from "@/lib/types";
import { getAssignedToColumn, hasOrgIdColumn } from "@/lib/supabase/staff-queries";
import { normalizeTaskStatus } from "@/lib/tasks/normalization";
import { CompletedTasksClient } from "./client";

export default async function CompletedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile for header
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Detect schema variants
  const assignedToCol = await getAssignedToColumn(supabase);
  const hasOrgId = await hasOrgIdColumn(supabase);

  // Fetch all assigned tasks, then normalize/filter in memory.
  // This avoids enum filter errors on legacy text statuses.
  let tasksQuery = supabase
    .from("tasks")
    .select("*")
    .eq(assignedToCol, user.id);

  // Add org_id filter only if column exists (migration 003)
  if (hasOrgId && profile.org_id) {
    tasksQuery = tasksQuery.eq("org_id", profile.org_id);
  }

  const { data: rawTasks, error: tasksError } = await tasksQuery.order(
    "created_at",
    { ascending: false }
  );

  if (tasksError) {
    console.error("[StaffCompleted] tasks query error:", tasksError.message);
  }

  const filteredTasks = (rawTasks || []).filter((t) => {
    const status = normalizeTaskStatus((t as Record<string, unknown>).status);
    return status === "completed" || status === "rejected";
  });

  const taskIds = filteredTasks.map((t) => t.id);

  // Fetch reviews and evidence separately to avoid PostgREST relationship errors
  const [reviewsResult, evidenceResult] = await Promise.all([
    taskIds.length > 0
      ? supabase.from("task_reviews").select("*").in("task_id", taskIds)
      : Promise.resolve({ data: [] as unknown[] }),
    taskIds.length > 0
      ? supabase.from("task_evidence").select("*").in("task_id", taskIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // Merge reviews and evidence back onto each task
  const tasks = filteredTasks.map((t) => ({
    ...t,
    task_reviews: (reviewsResult.data || []).filter(
      (r: { task_id: string }) => r.task_id === t.id
    ),
    task_evidence: (evidenceResult.data || []).filter(
      (e: { task_id: string }) => e.task_id === t.id
    ),
  }));

  // Collect reviewer IDs and fetch profiles
  const reviewerIds = [
    ...new Set(
      tasks.flatMap((t) =>
        (t.task_reviews || []).map((r: { reviewed_by: string }) => r.reviewed_by)
      )
    ),
  ];
  const { data: reviewerProfiles } = reviewerIds.length > 0
    ? await supabase.from("profiles").select("*").in("id", reviewerIds)
    : { data: [] };

  return (
    <CompletedTasksClient
      profile={profile}
      tasks={(tasks as Task[]) || []}
      reviewerProfiles={reviewerProfiles || []}
    />
  );
}
