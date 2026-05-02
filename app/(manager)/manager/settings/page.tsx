import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ManagerSettingsClient } from "./client";

export default async function ManagerSettingsPage() {
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

  /* ── Org info ── */
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.org_id)
    .single();

  /* ── Sites for this org ── */
  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("org_id", profile.org_id)
    .eq("is_active", true)
    .order("name");

  /* ── Team headcount ── */
  const { count: staffCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("org_id", profile.org_id)
    .eq("role", "staff");

  const { count: supervisorCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("org_id", profile.org_id)
    .eq("role", "supervisor");

  return (
    <ManagerSettingsClient
      profile={profile}
      org={org}
      sites={sites || []}
      teamCounts={{
        staff: staffCount || 0,
        supervisors: supervisorCount || 0,
      }}
    />
  );
}
