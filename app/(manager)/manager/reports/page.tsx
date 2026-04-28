import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ManagerReportsClient } from "./client";

/**
 * Manager → Reports & Export
 *
 * Loads filter option lists (staff and site locations).
 * Actual report data is fetched on the client whenever filters change so
 * that the UI is responsive without a server round-trip per keystroke.
 */
export default async function ManagerReportsPage() {
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

  const [{ data: staffList }, { data: siteRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["staff", "supervisor"])
      .order("full_name"),
    supabase
      .from("tasks")
      .select("site_location")
      .not("site_location", "is", null),
  ]);

  const siteLocations = Array.from(
    new Set(
      (siteRows || [])
        .map((t: { site_location: string | null }) => t.site_location)
        .filter((s): s is string => Boolean(s)),
    ),
  ).sort();

  return (
    <ManagerReportsClient
      profile={profile}
      staffList={staffList || []}
      siteLocations={siteLocations}
    />
  );
}
