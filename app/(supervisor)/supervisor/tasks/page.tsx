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

  return <AllTasksClient tasks={tasks || []} />;
}
