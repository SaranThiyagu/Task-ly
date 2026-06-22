import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hasOrgIdColumn } from "@/lib/supabase/staff-queries";
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

  // Fetch profile for org scoping
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, reports_to")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const hasOrgId = await hasOrgIdColumn(supabase);

  let taskQuery = supabase.from("tasks").select("*").eq("id", id);
  if (hasOrgId && profile.org_id) {
    taskQuery = taskQuery.eq("org_id", profile.org_id);
  }

  const { data: task } = await taskQuery.single();

  if (!task) redirect("/staff/dashboard");

  // Resolve assigned-by profile. Prefer task.created_by; fallback to staff's mapped supervisor.
  let creator = null;
  const createdByValue = (task as Record<string, unknown>).created_by;
  if (typeof createdByValue === "string" && createdByValue) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", createdByValue)
      .single();
    creator = data;
  }

  if (!creator && profile.reports_to) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.reports_to)
      .single();
    creator = data;
  }

  // Resolve mapped location for rows where only site_id is populated.
  let resolvedSiteLocation =
    typeof (task as Record<string, unknown>).site_location === "string"
      ? ((task as Record<string, unknown>).site_location as string).trim()
      : "";

  const siteIdValue = (task as Record<string, unknown>).site_id;
  if (!resolvedSiteLocation && typeof siteIdValue === "string" && siteIdValue) {
    const { data: site } = await supabase
      .from("sites")
      .select("name, address")
      .eq("id", siteIdValue)
      .single();

    if (site?.name) {
      resolvedSiteLocation = site.address
        ? `${site.name} - ${site.address}`
        : site.name;
    }
  }

  const taskWithResolvedLocation = {
    ...task,
    site_location: resolvedSiteLocation || null,
  };

  // Verify assignment — handle both modern (assigned_to) and legacy (assigned_to_id) schemas
  const assignedToValue =
    task.assigned_to ?? (task as Record<string, unknown>).assigned_to_id;
  if (assignedToValue !== user.id) redirect("/staff/dashboard");

  // Fetch evidence for this task
  let evidenceQuery = supabase
    .from("task_evidence")
    .select("*")
    .eq("task_id", id);

  if (hasOrgId && profile.org_id) {
    evidenceQuery = evidenceQuery.eq("org_id", profile.org_id);
  }

  const { data: evidence } = await evidenceQuery.order("submitted_at", {
    ascending: false,
  });

  // Fetch reviews for this task
  let reviewsQuery = supabase
    .from("task_reviews")
    .select("*")
    .eq("task_id", id);

  if (hasOrgId && profile.org_id) {
    reviewsQuery = reviewsQuery.eq("org_id", profile.org_id);
  }

  const { data: reviews } = await reviewsQuery.order("reviewed_at", {
    ascending: false,
  });

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
      task={taskWithResolvedLocation}
      creator={creator}
      evidence={evidence || []}
      reviews={reviewsWithProfiles}
    />
  );
}
