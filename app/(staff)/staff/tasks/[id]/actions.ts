"use server";

import { createClient } from "@/lib/supabase/server";

export async function startTask(taskId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the task is assigned to this user and is pending
  const { data: task } = await supabase
    .from("tasks")
    .select("id, assigned_to, status")
    .eq("id", taskId)
    .single();

  if (!task) return { error: "Task not found" };
  if (task.assigned_to !== user.id) return { error: "Not authorized" };
  if (task.status !== "pending") return { error: "Task cannot be started" };

  const { error } = await supabase
    .from("tasks")
    .update({ status: "in_progress" })
    .eq("id", taskId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function completeTask(
  taskId: string,
  photoUrl: string,
  notes: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the task is assigned to this user
  const { data: task } = await supabase
    .from("tasks")
    .select("id, assigned_to, status")
    .eq("id", taskId)
    .single();

  if (!task) return { error: "Task not found" };
  if (task.assigned_to !== user.id) return { error: "Not authorized" };
  if (task.status !== "in_progress" && task.status !== "pending" && task.status !== "rejected") {
    return { error: "Task cannot be completed in its current state" };
  }

  // Validate photo URL points to our Supabase storage
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    !photoUrl ||
    !supabaseUrl ||
    !photoUrl.startsWith(`${supabaseUrl}/storage/v1/object/public/`)
  ) {
    return { error: "Invalid evidence photo URL" };
  }

  // Mark task as completed (awaiting supervisor review)
  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (taskError) return { error: taskError.message };

  // Create evidence record
  const { error: evidenceError } = await supabase
    .from("task_evidence")
    .insert({
      task_id: taskId,
      submitted_by: user.id,
      photo_url: photoUrl,
      notes: notes || null,
    });

  if (evidenceError) return { error: evidenceError.message };

  return { success: true };
}

export async function resubmitTask(taskId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: task } = await supabase
    .from("tasks")
    .select("id, assigned_to, status")
    .eq("id", taskId)
    .single();

  if (!task) return { error: "Task not found" };
  if (task.assigned_to !== user.id) return { error: "Not authorized" };
  if (task.status !== "rejected") return { error: "Only rejected tasks can be resubmitted" };

  const { error } = await supabase
    .from("tasks")
    .update({ status: "in_progress", completed_at: null })
    .eq("id", taskId);

  if (error) return { error: error.message };
  return { success: true };
}
