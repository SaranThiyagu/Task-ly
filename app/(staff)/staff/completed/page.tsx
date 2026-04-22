import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Task } from "@/lib/types";
import { CompletedTasksClient } from "./client";

export default async function CompletedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile for header
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Fetch completed/rejected tasks with reviews and evidence
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, task_reviews(*), task_evidence(*)")
    .eq("assigned_to", user.id)
    .in("status", ["completed", "rejected"])
    .order("completed_at", { ascending: false });

  // Collect reviewer IDs and fetch profiles
  const reviewerIds = [
    ...new Set(
      (tasks || [])
        .flatMap((t) => (t.task_reviews || []).map((r: { reviewed_by: string }) => r.reviewed_by))
    ),
  ];
  const { data: reviewerProfiles } = reviewerIds.length > 0
    ? await supabase.from("profiles").select("*").in("id", reviewerIds)
    : { data: [] };

  return (
    <CompletedTasksClient
      profile={profile}
      tasks={(tasks as Task[]) || []}
      reviewerProfiles={reviewerProfiles || []}
    />
  );
}
