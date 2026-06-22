"use server";

import { createClient } from "@/lib/supabase/server";
import { getAssignedToColumn } from "@/lib/supabase/staff-queries";
import { normalizeTaskStatus } from "@/lib/tasks/normalization";

function isStatusConstraintError(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("tasks_status_check") || m.includes("status") || m.includes("check constraint");
}

async function hasCompletedAtColumn(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").select("completed_at").limit(0);
  if (!error) return true;

  const msg = error.message?.toLowerCase() ?? "";
  if (error.code === "PGRST204" || error.code === "42703" || msg.includes("completed_at")) {
    return false;
  }

  return true;
}

export async function startTask(taskId: string) {
  const supabase = await createClient();
  const assignedToCol = await getAssignedToColumn(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the task is assigned to this user and is pending
  const { data: task } = await supabase
    .from("tasks")
    .select(`id, ${assignedToCol}, status`)
    .eq("id", taskId)
    .single();

  if (!task) return { error: "Task not found" };
  const assignedToValue = (task as Record<string, unknown>)[assignedToCol];
  if (assignedToValue !== user.id) return { error: "Not authorized" };

  const status = normalizeTaskStatus((task as Record<string, unknown>).status);
  if (status !== "pending") return { error: "Task cannot be started" };

  // Try supported "started" statuses across known schema variants.
  const startStatusCandidates = ["in_progress", "inprogress", "started", "active"];
  let sawStatusConstraint = false;

  for (const candidate of startStatusCandidates) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: candidate })
      .eq("id", taskId);

    if (!error) {
      return { success: true, started: true };
    }

    if (isStatusConstraintError(error.message)) {
      sawStatusConstraint = true;
      continue;
    }

    return { error: error.message };
  }

  // Some very old schemas don't support an explicit "in-progress" state.
  // In that case, allow the user to proceed directly to completion evidence flow.
  if (sawStatusConstraint) {
    return { success: true, started: false, openCompleteModal: true };
  }

  return { error: "Unable to start task" };
}

export async function completeTask(
  taskId: string,
  photoUrl: string,
  notes: string
) {
  const supabase = await createClient();
  const assignedToCol = await getAssignedToColumn(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the task is assigned to this user
  const { data: task } = await supabase
    .from("tasks")
    .select(`id, ${assignedToCol}, status`)
    .eq("id", taskId)
    .single();

  if (!task) return { error: "Task not found" };
  const assignedToValue = (task as Record<string, unknown>)[assignedToCol];
  if (assignedToValue !== user.id) return { error: "Not authorized" };

  const status = normalizeTaskStatus((task as Record<string, unknown>).status);
  if (status !== "in_progress" && status !== "pending" && status !== "rejected") {
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
  const supportsCompletedAt = await hasCompletedAtColumn();

  const completedPayload: Record<string, unknown> = {
    status: "completed",
  };
  if (supportsCompletedAt) {
    completedPayload.completed_at = new Date().toISOString();
  }

  let { error: taskError } = await supabase
    .from("tasks")
    .update(completedPayload)
    .eq("id", taskId);

  // Legacy schemas commonly use "approved" to represent completion.
  if (taskError && isStatusConstraintError(taskError.message)) {
    const legacyPayload: Record<string, unknown> = {
      status: "approved",
    };
    if (supportsCompletedAt) {
      legacyPayload.completed_at = new Date().toISOString();
    }

    const legacy = await supabase
      .from("tasks")
      .update(legacyPayload)
      .eq("id", taskId);

    taskError = legacy.error;
  }

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
  const assignedToCol = await getAssignedToColumn(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: task } = await supabase
    .from("tasks")
    .select(`id, ${assignedToCol}, status`)
    .eq("id", taskId)
    .single();

  if (!task) return { error: "Task not found" };
  const assignedToValue = (task as Record<string, unknown>)[assignedToCol];
  if (assignedToValue !== user.id) return { error: "Not authorized" };

  const status = normalizeTaskStatus((task as Record<string, unknown>).status);
  if (status !== "rejected") return { error: "Only rejected tasks can be resubmitted" };

  const supportsCompletedAt = await hasCompletedAtColumn();

  const resubmitPayload: Record<string, unknown> = {
    status: "in_progress",
  };
  if (supportsCompletedAt) {
    resubmitPayload.completed_at = null;
  }

  let { error } = await supabase
    .from("tasks")
    .update(resubmitPayload)
    .eq("id", taskId);

  if (error && isStatusConstraintError(error.message)) {
    const legacyPayload: Record<string, unknown> = {
      status: "inprogress",
    };
    if (supportsCompletedAt) {
      legacyPayload.completed_at = null;
    }

    const legacy = await supabase
      .from("tasks")
      .update(legacyPayload)
      .eq("id", taskId);

    error = legacy.error;
  }

  if (error) return { error: error.message };
  return { success: true };
}
