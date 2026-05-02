import { createClient } from "@supabase/supabase-js";
import { sendPushToUser } from "@/lib/push/sendPush";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface EscalationResult {
  processed: number;
  markedOverdue: number;
  escalatedToManager: number;
  markedCritical: number;
  errors: string[];
  orgsProcessed: number;
}

export async function checkAndEscalateOverdueTasks(): Promise<EscalationResult> {
  // Use service role client to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const now = new Date();

  const result: EscalationResult = {
    processed: 0,
    markedOverdue: 0,
    escalatedToManager: 0,
    markedCritical: 0,
    errors: [],
    orgsProcessed: 0,
  };

  // Get all active organizations
  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("is_active", true);

  if (orgsError) {
    result.errors.push(`Fetch orgs error: ${orgsError.message}`);
    console.error(`[ESCALATION] ${now.toISOString()} Fetch orgs error:`, orgsError.message);
    return result;
  }

  if (!orgs || orgs.length === 0) {
    console.log(`[ESCALATION] ${now.toISOString()} No active organizations found`);
    return result;
  }

  // Process each organization independently
  for (const org of orgs) {
    result.orgsProcessed++;

    // Find overdue tasks for this org
    const { data: overdueTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, title, assigned_to, created_by, due_date, status, priority, org_id")
      .eq("org_id", org.id)
      .in("status", ["pending", "in_progress", "overdue"])
      .lt("due_date", now.toISOString());

    if (fetchError) {
      result.errors.push(`[${org.name}] Fetch error: ${fetchError.message}`);
      console.error(`[ESCALATION] ${now.toISOString()} [${org.name}] Fetch error:`, fetchError.message);
      continue;
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      continue;
    }

    // Get this org's manager for escalations
    const { data: managers } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "manager")
      .eq("org_id", org.id)
      .limit(1);

    const managerId = managers?.[0]?.id || null;

    // Get this org's supervisor for escalation source
    const { data: supervisors } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "supervisor")
      .eq("org_id", org.id)
      .limit(1);

    const supervisorId = supervisors?.[0]?.id || null;

    // Check existing escalations to avoid duplicates
    const taskIds = overdueTasks.map((t) => t.id);
    const { data: existingEscalations } = await supabase
      .from("escalations")
      .select("task_id, reason")
      .in("task_id", taskIds)
      .eq("is_resolved", false);

    const escalatedTaskReasons = new Map<string, Set<string>>();
    (existingEscalations || []).forEach((e: { task_id: string; reason: string }) => {
      if (!escalatedTaskReasons.has(e.task_id)) {
        escalatedTaskReasons.set(e.task_id, new Set());
      }
      escalatedTaskReasons.get(e.task_id)!.add(e.reason);
    });

    for (const task of overdueTasks) {
      result.processed++;
      const overdueMs = now.getTime() - new Date(task.due_date).getTime();
      const overdueHours = overdueMs / (1000 * 60 * 60);
      const existingReasons = escalatedTaskReasons.get(task.id) || new Set();

      try {
        // Tier 1: Overdue by 1+ hour → mark as overdue, notify staff
        if (overdueHours >= 1) {
          const { error: updateError } = await supabase
            .from("tasks")
            .update({ status: "overdue" })
            .eq("id", task.id)
            .in("status", ["pending", "in_progress"]);

          if (updateError) {
            result.errors.push(`Update task ${task.id}: ${updateError.message}`);
          } else {
            result.markedOverdue++;
            console.log(
              `[ESCALATION] ${now.toISOString()} [${org.name}] Task "${task.title}" (${task.id}) marked overdue (${overdueHours.toFixed(1)}h)`
            );
            if (task.assigned_to) {
              await sendPushToUser(task.assigned_to, {
                title: "Task Overdue ⚠️",
                body: `"${task.title}" is overdue. Please complete it now.`,
                url: "/staff/tasks",
                tag: `overdue-${task.id}`,
              });
            }
          }
        }

        // Tier 2: Overdue by 3+ hours → escalate to org's manager
        if (overdueHours >= 3 && managerId) {
          const reason = "AUTO: Task overdue by 3+ hours — escalated to manager";
          if (!existingReasons.has(reason)) {
            const { error: escError } = await supabase
              .from("escalations")
              .insert({
                task_id: task.id,
                escalated_from: supervisorId || task.created_by,
                escalated_to: managerId,
                reason,
                org_id: org.id,
              });

            if (escError) {
              result.errors.push(`Escalate task ${task.id}: ${escError.message}`);
            } else {
              result.escalatedToManager++;
              console.log(
                `[ESCALATION] ${now.toISOString()} [${org.name}] Task "${task.title}" (${task.id}) escalated to manager (${overdueHours.toFixed(1)}h overdue)`
              );
              if (managerId) {
                await sendPushToUser(managerId, {
                  title: "Task Escalated 🔴",
                  body: `"${task.title}" overdue by ${overdueHours.toFixed(0)}h — escalated to you.`,
                  url: "/manager/escalations",
                  tag: `escalation-${task.id}`,
                });
              }
            }
          }
        }

        // Tier 3: Overdue by 6+ hours → mark critical, escalate with CRITICAL flag
        if (overdueHours >= 6 && managerId) {
          if (task.priority !== "critical") {
            await supabase
              .from("tasks")
              .update({ priority: "critical" })
              .eq("id", task.id);
          }

          const reason = "CRITICAL: Task overdue by 6+ hours — immediate attention required";
          if (!existingReasons.has(reason)) {
            const { error: critError } = await supabase
              .from("escalations")
              .insert({
                task_id: task.id,
                escalated_from: supervisorId || task.created_by,
                escalated_to: managerId,
                reason,
                org_id: org.id,
              });

            if (critError) {
              result.errors.push(`Critical escalate task ${task.id}: ${critError.message}`);
            } else {
              result.markedCritical++;
              console.log(
                `[ESCALATION] ${now.toISOString()} [${org.name}] CRITICAL: Task "${task.title}" (${task.id}) — ${overdueHours.toFixed(1)}h overdue`
              );
              const criticalPushes: Promise<void>[] = [];
              if (task.assigned_to) {
                criticalPushes.push(
                  sendPushToUser(task.assigned_to, {
                    title: "CRITICAL: Task Requires Immediate Action 🚨",
                    body: `"${task.title}" is critically overdue (${overdueHours.toFixed(0)}h). Act now.`,
                    url: "/staff/tasks",
                    tag: `critical-${task.id}`,
                  })
                );
              }
              if (managerId) {
                criticalPushes.push(
                  sendPushToUser(managerId, {
                    title: "CRITICAL Escalation 🚨",
                    body: `"${task.title}" is ${overdueHours.toFixed(0)}h overdue — immediate attention required.`,
                    url: "/manager/escalations",
                    tag: `critical-mgr-${task.id}`,
                  })
                );
              }
              await Promise.allSettled(criticalPushes);
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`Task ${task.id}: ${message}`);
        console.error(`[ESCALATION] ${now.toISOString()} [${org.name}] Error processing task ${task.id}:`, message);
      }
    }
  }

  console.log(
    `[ESCALATION] ${now.toISOString()} Complete — orgs: ${result.orgsProcessed}, processed: ${result.processed}, overdue: ${result.markedOverdue}, escalated: ${result.escalatedToManager}, critical: ${result.markedCritical}, errors: ${result.errors.length}`
  );

  return result;
}
