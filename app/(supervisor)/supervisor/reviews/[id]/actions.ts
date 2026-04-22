"use server";

import { createClient } from "@/lib/supabase/server";

export async function approveTask(taskId: string, comment?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify supervisor role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["supervisor", "manager"].includes(profile.role)) {
    return { error: "Not authorized" };
  }

  // Create review record
  const { error: reviewError } = await supabase.from("task_reviews").insert({
    task_id: taskId,
    reviewed_by: user.id,
    action: "approved",
    comment: comment || null,
  });

  if (reviewError) return { error: reviewError.message };

  // Task is already completed — approval just confirms it via the review record

  console.log(`[NOTIFICATION] Task ${taskId} approved by ${user.id}`);

  return { success: true };
}

export async function rejectTask(taskId: string, reason: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["supervisor", "manager"].includes(profile.role)) {
    return { error: "Not authorized" };
  }

  if (!reason.trim()) {
    return { error: "Rejection reason is required" };
  }

  // Create review record
  const { error: reviewError } = await supabase.from("task_reviews").insert({
    task_id: taskId,
    reviewed_by: user.id,
    action: "rejected",
    comment: reason,
  });

  if (reviewError) return { error: reviewError.message };

  // Set task back to in_progress so staff can redo
  const { error: taskError } = await supabase
    .from("tasks")
    .update({ status: "rejected", completed_at: null })
    .eq("id", taskId);

  if (taskError) return { error: taskError.message };

  console.log(`[NOTIFICATION] Task ${taskId} rejected by ${user.id}: ${reason}`);

  return { success: true };
}

export async function escalateTask(
  taskId: string,
  reason: string,
  managerId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["supervisor", "manager"].includes(profile.role)) {
    return { error: "Not authorized" };
  }

  if (!reason.trim()) {
    return { error: "Escalation reason is required" };
  }

  // Create escalation record
  const { error: escalationError } = await supabase
    .from("escalations")
    .insert({
      task_id: taskId,
      escalated_from: user.id,
      escalated_to: managerId,
      reason,
    });

  if (escalationError) return { error: escalationError.message };

  // Move task out of completed so it no longer appears in pending reviews
  const { error: taskError } = await supabase
    .from("tasks")
    .update({ status: "in_progress", completed_at: null })
    .eq("id", taskId);

  if (taskError) return { error: taskError.message };

  console.log(
    `[NOTIFICATION] Task ${taskId} escalated to manager ${managerId} by ${user.id}: ${reason}`
  );

  return { success: true };
}

export async function reassignTask(taskId: string, newAssigneeId: string, newDueDate?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["supervisor", "manager"].includes(profile.role)) {
    return { error: "Not authorized" };
  }

  if (!newAssigneeId) {
    return { error: "Please select a staff member" };
  }

  // Verify the new assignee exists
  const { data: assignee } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", newAssigneeId)
    .single();

  if (!assignee) return { error: "Staff member not found" };

  // Reassign task: update assignee, reset to pending, set new deadline
  const updateData: Record<string, unknown> = {
    assigned_to: newAssigneeId,
    status: "pending" as const,
    completed_at: null,
  };
  if (newDueDate) {
    updateData.due_date = newDueDate;
  }

  const { error: taskError } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId);

  if (taskError) return { error: taskError.message };

  console.log(
    `[NOTIFICATION] Task ${taskId} reassigned to ${newAssigneeId} by ${user.id}`
  );

  return { success: true };
}
