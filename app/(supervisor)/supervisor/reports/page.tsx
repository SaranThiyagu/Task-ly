import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SupervisorReportsClient } from "./client";

export default async function SupervisorReportsPage() {
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

  // Fetch staff profiles for filter dropdown
  const { data: staffList } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "staff")
    .order("full_name");

  // Fetch distinct site locations
  const { data: tasks } = await supabase
    .from("tasks")
    .select("site_location")
    .not("site_location", "is", null);

  const siteLocations = [
    ...new Set(
      (tasks || [])
        .map((t: { site_location: string | null }) => t.site_location)
        .filter(Boolean)
    ),
  ] as string[];

  return (
    <SupervisorReportsClient
      staffList={staffList || []}
      siteLocations={siteLocations}
    />
  );
}
