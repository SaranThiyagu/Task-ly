import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AllTasksClient } from "./client";

export default async function AllTasksPage() {
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

  // Fetch all tasks with assigned staff info
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      *,
      assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name, avatar_url)
    `)
    .order("created_at", { ascending: false });

  // Fetch staff list for the Create Task modal
  const { data: staffList } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("role", "staff")
    .order("full_name", { ascending: true });

  return <AllTasksClient tasks={tasks || []} staffList={staffList || []} />;
}
