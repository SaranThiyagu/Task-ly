import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAssignedToColumn, hasOrgIdColumn } from "@/lib/supabase/staff-queries";
import { normalizeTaskStatus } from "@/lib/tasks/normalization";
import { ProfileClient } from "./client";

export default async function ProfilePage() {
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

  if (!profile) redirect("/login");

  // Detect schema variants
  const assignedToCol = await getAssignedToColumn(supabase);
  const hasOrgId = await hasOrgIdColumn(supabase);

  // Fetch tasks once, then compute normalized stats in memory.
  let tasksQuery = supabase
    .from("tasks")
    .select("id, status")
    .eq(assignedToCol, user.id);

  if (hasOrgId && profile.org_id) {
    tasksQuery = tasksQuery.eq("org_id", profile.org_id);
  }

  const { data: tasks } = await tasksQuery;
  const totalTasks = tasks?.length || 0;
  const completedTasks =
    tasks?.filter((t) =>
      normalizeTaskStatus((t as Record<string, unknown>).status) === "completed"
    ).length || 0;

  return (
    <ProfileClient
      profile={profile}
      stats={{ total: totalTasks || 0, completed: completedTasks || 0 }}
    />
  );
}
