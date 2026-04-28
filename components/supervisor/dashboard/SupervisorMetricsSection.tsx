"use client";

import {
  ClipboardCheck,
  AlertOctagon,
  CheckCircle2,
  Activity,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";

/**
 * Supervisor Dashboard — Metrics Section
 *
 * Renders the six core supervisor metrics with an urgency-first ordering:
 *   1. Pending Reviews     (warning, emphasized — action needed)
 *   2. Overdue Tasks       (danger,  emphasized — strongest pop)
 *   3. Active Tasks        (primary)
 *   4. Completed Today     (success)
 *   5. Team Completion     (primary, with trend)
 *   6. Escalations         (danger, only when > 0)
 *
 * Layout:
 *  - mobile      : 2 column grid
 *  - lg (≥1024px): 3 columns
 *  - xl (≥1280px): 6 columns
 */
export interface SupervisorMetricsSectionProps {
  pendingReviews: number;
  overdue: number;
  activeTasks: number;
  completedToday: number;
  /** 0–100 */
  teamCompletionRate: number;
  teamCompletionTrend?: number;
  escalations?: number;
  loading?: boolean;
}

export function SupervisorMetricsSection({
  pendingReviews,
  overdue,
  activeTasks,
  completedToday,
  teamCompletionRate,
  teamCompletionTrend,
  escalations = 0,
  loading,
}: SupervisorMetricsSectionProps) {
  const showEscalations = escalations > 0;

  return (
    <section
      aria-label="Team performance at a glance"
      className={`grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 ${
        showEscalations ? "xl:grid-cols-6" : "xl:grid-cols-5"
      }`}
    >
      {/* 1 — PENDING REVIEWS (action needed) */}
      <MetricCard
        title="Pending Reviews"
        value={pendingReviews}
        icon={ClipboardCheck}
        variant="warning"
        emphasize
        subLabel={
          pendingReviews > 0
            ? "Awaiting your review"
            : "All reviews up to date"
        }
        cta={
          pendingReviews > 0
            ? { label: "Review now", href: "/supervisor/reviews" }
            : undefined
        }
        loading={loading}
      />

      {/* 2 — OVERDUE (strongest urgency) */}
      <MetricCard
        title="Overdue"
        value={overdue}
        icon={AlertOctagon}
        variant="danger"
        emphasize
        subLabel={
          overdue > 0
            ? "Tasks past due — escalate or reassign"
            : "Team is on track"
        }
        cta={
          overdue > 0
            ? {
                label: "View overdue",
                href: "/supervisor/tasks?status=overdue",
              }
            : undefined
        }
        loading={loading}
      />

      {/* 3 — ACTIVE TASKS */}
      <MetricCard
        title="Active Tasks"
        value={activeTasks}
        icon={Activity}
        variant="primary"
        subLabel="In progress across team"
        loading={loading}
      />

      {/* 4 — COMPLETED TODAY */}
      <MetricCard
        title="Completed Today"
        value={completedToday}
        icon={CheckCircle2}
        variant="success"
        subLabel={
          completedToday > 0
            ? `${completedToday} finished today`
            : "Nothing completed yet today"
        }
        loading={loading}
      />

      {/* 5 — TEAM COMPLETION RATE */}
      <MetricCard
        title="Team Completion"
        value={teamCompletionRate}
        unit="%"
        icon={TrendingUp}
        variant={
          teamCompletionRate >= 90
            ? "success"
            : teamCompletionRate >= 70
              ? "warning"
              : "danger"
        }
        emphasize={teamCompletionRate < 70}
        trend={
          teamCompletionTrend !== undefined
            ? {
                value: teamCompletionTrend,
                label: "vs last week",
                goodWhen: "up",
              }
            : undefined
        }
        loading={loading}
      />

      {/* 6 — ESCALATIONS (only when > 0) */}
      {showEscalations && (
        <MetricCard
          title="Escalations"
          value={escalations}
          icon={ShieldAlert}
          variant="danger"
          emphasize
          subLabel="Escalated to manager"
          cta={{
            label: "View escalations",
            href: "/supervisor/tasks?escalated=1",
          }}
          loading={loading}
        />
      )}
    </section>
  );
}
