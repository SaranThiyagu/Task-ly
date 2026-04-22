import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  // Get task stats
  const { count: totalTasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", user.id);

  const { count: completedTasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", user.id)
    .eq("status", "completed");

  return (
    <ProfileClient
      profile={profile}
      stats={{ total: totalTasks || 0, completed: completedTasks || 0 }}
    />
  );
}
