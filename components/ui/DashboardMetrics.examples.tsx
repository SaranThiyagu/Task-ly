"use client";

import {
  AlertOctagon,
  Clock,
  CheckCircle2,
  TrendingUp,
  ClipboardCheck,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";

/* ══════════════════════════════════════════════════
   STAFF DASHBOARD — Metrics
   Layout: 1 col mobile · 2×2 sm · 4 cols lg
   ══════════════════════════════════════════════════ */

export interface StaffMetricsProps {
  overdue: number;
  dueToday: number;
  completedToday: number;
  /** 0–100 */
  slaPercent: number;
  /** numeric delta vs last week — for trend chip on SLA */
  slaTrend?: number;
}

export function StaffDashboardMetrics({
  overdue,
  dueToday,
  completedToday,
  slaPercent,
  slaTrend,
}: StaffMetricsProps) {
  return (
    <section
      aria-label="Your performance at a glance"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4"
    >
      {/* 1 — OVERDUE — strongest urgency */}
      <MetricCard
        title="Overdue"
        value={overdue}
        label={
          overdue > 0 ? "Past due — action required" : "Nothing past due"
        }
        icon={<AlertOctagon />}
        variant="danger"
        isUrgent={overdue > 0}
      />

      {/* 2 — DUE TODAY */}
      <MetricCard
        title="Due Today"
        value={dueToday}
        label={
          dueToday === 0
            ? "All clear for today"
            : `${dueToday === 1 ? "1 task" : `${dueToday} tasks`} ending today`
        }
        icon={<Clock />}
        variant="warning"
        isUrgent={dueToday > 0}
      />

      {/* 3 — COMPLETED TODAY */}
      <MetricCard
        title="Completed Today"
        value={completedToday}
        label={completedToday > 0 ? "Nice work" : "No tasks completed yet"}
        icon={<CheckCircle2 />}
        variant="success"
      />

      {/* 4 — SLA COMPLIANCE */}
      <MetricCard
        title="SLA Compliance"
        value={`${slaPercent}%`}
        label="Last 7 days"
        icon={<TrendingUp />}
        variant={
          slaPercent >= 90 ? "success" : slaPercent >= 70 ? "warning" : "danger"
        }
        trend={
          slaTrend === undefined || slaTrend === 0
            ? null
            : slaTrend > 0
              ? "up"
              : "down"
        }
        trendValue={
          slaTrend !== undefined
            ? `${slaTrend > 0 ? "+" : ""}${slaTrend}%`
            : undefined
        }
        isUrgent={slaPercent < 70}
      />
    </section>
  );
}

/* ══════════════════════════════════════════════════
   SUPERVISOR DASHBOARD — Metrics
   Layout: 2 col mobile · 3 cols lg · 4 cols xl
   ══════════════════════════════════════════════════ */

export interface SupervisorMetricsProps {
  pendingReviews: number;
  overdue: number;
  completedToday: number;
  activeTasks: number;
  /** 0–100 */
  teamCompletionRate?: number;
  teamCompletionTrend?: number;
  escalations?: number;
}

export function SupervisorDashboardMetrics({
  pendingReviews,
  overdue,
  completedToday,
  activeTasks,
  teamCompletionRate,
  teamCompletionTrend,
  escalations = 0,
}: SupervisorMetricsProps) {
  const showExtras =
    teamCompletionRate !== undefined || escalations > 0;

  return (
    <section
      aria-label="Team performance at a glance"
      className={`grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 ${
        showExtras ? "xl:grid-cols-6" : "xl:grid-cols-4"
      }`}
    >
      {/* 1 — PENDING REVIEWS — primary supervisor action */}
      <MetricCard
        title="Pending Reviews"
        value={pendingReviews}
        label={
          pendingReviews > 0 ? "Awaiting your review" : "All caught up"
        }
        icon={<ClipboardCheck />}
        variant="warning"
        isUrgent={pendingReviews > 0}
      />

      {/* 2 — OVERDUE — strongest urgency */}
      <MetricCard
        title="Overdue Tasks"
        value={overdue}
        label={overdue > 0 ? "Escalate or reassign" : "Team is on track"}
        icon={<AlertOctagon />}
        variant="danger"
        isUrgent={overdue > 0}
      />

      {/* 3 — COMPLETED TODAY */}
      <MetricCard
        title="Completed Today"
        value={completedToday}
        label="Across team"
        icon={<CheckCircle2 />}
        variant="success"
      />

      {/* 4 — ACTIVE TASKS */}
      <MetricCard
        title="Active Tasks"
        value={activeTasks}
        label="In progress now"
        icon={<Activity />}
        variant="info"
      />

      {/* 5 — TEAM COMPLETION RATE (optional) */}
      {teamCompletionRate !== undefined && (
        <MetricCard
          title="Team Completion"
          value={`${teamCompletionRate}%`}
          label="Last 7 days"
          icon={<TrendingUp />}
          variant={
            teamCompletionRate >= 90
              ? "success"
              : teamCompletionRate >= 70
                ? "warning"
                : "danger"
          }
          trend={
            teamCompletionTrend === undefined || teamCompletionTrend === 0
              ? null
              : teamCompletionTrend > 0
                ? "up"
                : "down"
          }
          trendValue={
            teamCompletionTrend !== undefined
              ? `${teamCompletionTrend > 0 ? "+" : ""}${teamCompletionTrend}%`
              : undefined
          }
          isUrgent={teamCompletionRate < 70}
        />
      )}

      {/* 6 — ESCALATIONS (only when > 0) */}
      {escalations > 0 && (
        <MetricCard
          title="Escalations"
          value={escalations}
          label="Sent to manager"
          icon={<ShieldAlert />}
          variant="danger"
          isUrgent
        />
      )}
    </section>
  );
}

