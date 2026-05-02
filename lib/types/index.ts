export type UserRole = "staff" | "supervisor" | "manager";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "rejected"
  | "overdue";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type ReviewAction = "approved" | "rejected";

// ── Multi-tenancy types ──

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Core types ──

export interface Profile {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  reports_to: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  assigned_to: string | Profile;
  created_by: string | Profile;
  site_id: string | null;
  site_location: string | null; // deprecated — use site_id
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  completed_at: string | null;
  created_at: string;
}

export interface TaskEvidence {
  id: string;
  org_id: string | null;
  task_id: string;
  submitted_by: string | Profile;
  photo_url: string;
  notes: string | null;
  submitted_at: string;
}

export interface TaskReview {
  id: string;
  org_id: string | null;
  task_id: string;
  reviewed_by: string | Profile;
  action: ReviewAction;
  comment: string | null;
  reviewed_at: string;
}

export interface Escalation {
  id: string;
  org_id: string;
  task_id: string | Task;
  escalated_from: string | Profile;
  escalated_to: string | Profile;
  reason: string;
  escalated_at: string;
  is_resolved: boolean;
}

export interface DashboardStats {
  totalTasks: number;
  completedToday: number;
  overdueCount: number;
  pendingReview: number;
  escalationCount: number;
}

export interface PriorityConfig {
  label: string;
  color: string;
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  low: { label: "Low", color: "bg-green-100 text-green-800" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  high: { label: "High", color: "bg-orange-100 text-orange-800" },
  critical: { label: "Critical", color: "bg-red-100 text-red-800" },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-800" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  overdue: { label: "Overdue", color: "bg-amber-100 text-amber-800" },
};
