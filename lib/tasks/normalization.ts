import type { TaskStatus } from "@/lib/types";

export function normalizeTaskStatus(rawStatus: unknown): TaskStatus {
  const value = String(rawStatus ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, "_");

  if (value === "todo" || value === "pending") return "pending";
  if (value === "inprogress" || value === "in_progress") return "in_progress";
  if (
    value === "completed" ||
    value === "approved" ||
    value === "underreview" ||
    value === "under_review" ||
    value === "in_review"
  ) {
    return "completed";
  }
  if (value === "rejected") return "rejected";
  if (value === "overdue") return "overdue";

  return "pending";
}

export function normalizeTaskPriority(rawPriority: unknown): "low" | "medium" | "high" | "critical" {
  const value = String(rawPriority ?? "")
    .trim()
    .toLowerCase();

  if (value === "low" || value === "medium" || value === "high" || value === "critical") {
    return value;
  }

  return "medium";
}
