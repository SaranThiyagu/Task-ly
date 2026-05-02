"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * Subscribes to real-time changes on the tasks table for the current user
 * within their organization.
 * Automatically refreshes the page and shows toast notifications when:
 * - A new task is assigned
 * - A task status changes (e.g. supervisor reviews)
 * - A task is updated (priority change, reassignment)
 */
export function useRealtimeTasks(userId: string | undefined, orgId?: string) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`tasks:${orgId ?? userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tasks",
          filter: `assigned_to=eq.${userId}`,
        },
        (payload) => {
          const task = payload.new as { title?: string };
          toast.info(`New task assigned: ${task.title ?? "Untitled"}`, {
            action: { label: "View", onClick: () => router.push("/staff/tasks") },
          });
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `assigned_to=eq.${userId}`,
        },
        (payload) => {
          const oldStatus = (payload.old as { status?: string }).status;
          const newStatus = (payload.new as { status?: string }).status;

          if (oldStatus !== newStatus) {
            if (newStatus === "rejected") {
              toast.error("A task was rejected — check the review feedback");
            } else if (oldStatus === "completed" && newStatus === "completed") {
              // Review added but status unchanged — handled by task_reviews channel
            } else if (newStatus) {
              toast.info(`Task status updated to ${newStatus.replace("_", " ")}`);
            }
          }
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_reviews",
        },
        () => {
          toast.info("A task review was submitted");
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, orgId, router]);
}
