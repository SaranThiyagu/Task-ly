import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Task } from "@/lib/types";
import { getAssignedToColumn, hasOrgIdColumn } from "@/lib/supabase/staff-queries";
import { normalizeTaskStatus } from "@/lib/tasks/normalization";
import { MyTasksClient } from "./client";

type TaskListItem = Task & {
  site_location: string | null;
};

export default async function MyTasksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Detect schema variants
  const assignedToCol = await getAssignedToColumn(supabase);
  const hasOrgId = await hasOrgIdColumn(supabase);

  // Fetch profile first for org_id (required by RLS if org_id column exists)
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Fetch assigned tasks and normalize status in memory for legacy schemas.
  let tasksQuery = supabase
    .from("tasks")
    .select("*")
    .eq(assignedToCol, user.id);

  // Add org_id filter only if column exists (migration 003)
  if (hasOrgId && profile.org_id) {
    tasksQuery = tasksQuery.eq("org_id", profile.org_id);
  }

  const { data: rawTasks, error: tasksError } = await tasksQuery.order("due_date", {
    ascending: true,
  });

  if (tasksError) {
    console.error("[StaffTasks] tasks query error:", tasksError.message);
  }

  const tasks = (rawTasks || []).filter((t) => {
    const status = normalizeTaskStatus((t as Record<string, unknown>).status);
    return status === "pending" || status === "in_progress" || status === "overdue";
  });

  const siteIds = [...new Set(
    tasks
      .map((task) => (task as Record<string, unknown>).site_id)
      .filter((siteId): siteId is string => typeof siteId === "string" && siteId.length > 0)
  )];

  const sitesById = new Map<string, { name: string; address: string | null }>();
  if (siteIds.length > 0) {
    const { data: sites } = await supabase
      .from("sites")
      .select("id, name, address")
      .in("id", siteIds);

    for (const site of sites || []) {
      sitesById.set(site.id, { name: site.name, address: site.address });
    }
  }

  const enrichedTasks: TaskListItem[] = tasks.map((task) => {
    const rawSiteLocation =
      typeof (task as Record<string, unknown>).site_location === "string"
        ? ((task as Record<string, unknown>).site_location as string).trim()
        : "";

    if (rawSiteLocation) {
      return {
        ...(task as Task),
        site_location: rawSiteLocation,
      };
    }

    const siteId = (task as Record<string, unknown>).site_id;
    if (typeof siteId === "string") {
      const site = sitesById.get(siteId);
      if (site) {
        return {
          ...(task as Task),
          site_location: site.address ? `${site.name} - ${site.address}` : site.name,
        };
      }
    }

    return {
      ...(task as Task),
      site_location: null,
    };
  });

  return <MyTasksClient tasks={enrichedTasks} assigneeName={profile.full_name} />;
}
