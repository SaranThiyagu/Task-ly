import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Task } from "@/lib/types";
import { getAssignedToColumn, hasOrgIdColumn } from "@/lib/supabase/staff-queries";
import { StaffDashboardClient } from "./client";

export default async function StaffDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Detect schema variants
  const assignedToCol = await getAssignedToColumn(supabase);
  const hasOrgId = await hasOrgIdColumn(supabase);

  console.log("[StaffDashboard] Schema detection:", {
    assignedToCol,
    hasOrgId,
    userId: user.id,
    profileOrgId: profile?.org_id,
  });

  // Fetch tasks (no embedded relations — avoids schema-cache FK errors)
  let tasksQuery = supabase
    .from("tasks")
    .select("*")
    .eq(assignedToCol, user.id);

  // Add org_id filter only if column exists (migration 003)
  if (hasOrgId && profile?.org_id) {
    console.log(
      "[StaffDashboard] Applying org_id filter:",
      profile.org_id
    );
    tasksQuery = tasksQuery.eq("org_id", profile.org_id);
  }

  const { data: rawTasks, error: tasksError } = await tasksQuery.order(
    "due_date",
    { ascending: true }
  );

  console.log("[StaffDashboard] Tasks query result:", {
    error: tasksError?.message,
    count: rawTasks?.length ?? 0,
    assignedToCol,
    hasOrgId,
  });

  if (tasksError) {
    console.error("[StaffDashboard] tasks query error:", tasksError.message, tasksError);
  }

  const taskIds = (rawTasks || []).map((t) => t.id);

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
  const tasks = (rawTasks || []).map((t) => ({
    ...t,
    task_reviews: (reviewsResult.data || []).filter(
      (r: { task_id: string }) => r.task_id === t.id
    ),
    task_evidence: (evidenceResult.data || []).filter(
      (e: { task_id: string }) => e.task_id === t.id
    ),
  }));

  // Collect reviewer IDs for profile lookup
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
    <StaffDashboardClient
      profile={profile}
      tasks={(tasks as Task[]) || []}
      reviewerProfiles={reviewerProfiles || []}
    />
  );
}
