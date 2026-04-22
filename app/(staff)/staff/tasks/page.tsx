import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Task } from "@/lib/types";
import { MyTasksClient } from "./client";

export default async function MyTasksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", user.id)
    .in("status", ["pending", "in_progress", "overdue"])
    .order("due_date", { ascending: true });

  return <MyTasksClient tasks={(tasks as Task[]) || []} />;
}
