import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamClient } from "./client";

export default async function TeamPage() {
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

  // Fetch staff members
  const { data: staffMembers } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("role", "staff")
    .order("full_name");

  // Fetch task summaries for all staff
  const { data: taskSummaries } = await supabase
    .from("tasks")
    .select("assigned_to, status");

  return (
    <TeamClient
      staffMembers={staffMembers || []}
      taskSummaries={taskSummaries || []}
    />
  );
}
