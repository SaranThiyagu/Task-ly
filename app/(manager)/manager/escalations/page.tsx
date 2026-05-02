import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ManagerEscalationsClient } from "./client";

/**
 * Manager → Escalations
 *
 * Lists every escalation (open + resolved) with task, escalator, target,
 * reason, and current task status. Manager actions: resolve, view task.
 */
export default async function ManagerEscalationsPage() {
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

  const { data: escalations } = await supabase
    .from("escalations")
    .select(
      `id, reason, escalated_at, is_resolved,
       task:tasks!escalations_task_id_fkey(
         id, title, status, priority, site_location, due_date, assigned_to,
         assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)
       ),
       from_profile:profiles!escalations_escalated_from_fkey(id, full_name, avatar_url, role),
       to_profile:profiles!escalations_escalated_to_fkey(id, full_name, avatar_url, role)`,
    )
    .eq("org_id", profile.org_id)
    .order("is_resolved", { ascending: true })
    .order("escalated_at", { ascending: false });

  return (
    <ManagerEscalationsClient
      profile={profile}
      escalations={escalations || []}
    />
  );
}
