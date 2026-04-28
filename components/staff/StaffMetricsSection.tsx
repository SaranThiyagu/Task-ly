"use client";

import {
  AlertOctagon,
  Clock,
  CheckCircle2,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";

/**
 * Staff Dashboard — Metrics Section
 *
 * Drop-in section that renders the four core staff metrics:
 *  1. Overdue Tasks       (danger,  emphasized)
 *  2. Due Today           (warning, emphasized)
 *  3. Completed Today     (success)
 *  4. SLA Compliance %    (primary, with trend)
 *
 * Layout:
 *  - mobile      : 1 column stack
 *  - sm (≥640px) : 2×2 grid
 *  - lg (≥1024px): 4 columns
 */
export interface StaffMetricsSectionProps {
  overdue: number;
  dueToday: number;
  completedToday: number;
  /** 0–100 */
  slaPercent: number;
  /** Delta vs previous period — for the SLA trend chip */
  slaTrend?: number;
  /** Optional total for context under "Tasks Assigned" — see prop below */
  totalAssigned?: number;
  loading?: boolean;
}

export function StaffMetricsSection({
  overdue,
  dueToday,
  completedToday,
  slaPercent,
  slaTrend,
  totalAssigned,
  loading,
}: StaffMetricsSectionProps) {
  return (
    <section
      aria-label="Your performance at a glance"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4"
    >
      {/* 1 — OVERDUE (highest urgency) */}
      <MetricCard
        title="Overdue"
        value={overdue}
        icon={AlertOctagon}
        variant="danger"
        emphasize
        subLabel={
          overdue > 0
            ? "Past due — action required"
            : "Nothing past due — great work"
        }
        cta={
          overdue > 0
            ? { label: "Resolve overdue", href: "/staff/tasks?filter=overdue" }
            : undefined
        }
        loading={loading}
      />

      {/* 2 — DUE TODAY */}
      <MetricCard
        title="Due Today"
        value={dueToday}
        icon={Clock}
        variant="warning"
        emphasize={dueToday > 0}
        subLabel={
          dueToday === 0
            ? "All clear for today"
            : `${dueToday === 1 ? "1 task" : `${dueToday} tasks`} ending today`
        }
        cta={
          dueToday > 0
            ? { label: "View today’s list", href: "/staff/tasks?filter=today" }
            : undefined
        }
        loading={loading}
      />

      {/* 3 — COMPLETED TODAY */}
      <MetricCard
        title="Completed Today"
        value={completedToday}
        icon={CheckCircle2}
        variant="success"
        subLabel={
          completedToday > 0
            ? `Nice — ${completedToday} done today`
            : "No tasks completed yet today"
        }
        loading={loading}
      />

      {/* 4 — SLA COMPLIANCE */}
      <MetricCard
        title="SLA Compliance"
        value={slaPercent}
        unit="%"
        icon={TrendingUp}
        variant={
          slaPercent >= 90
            ? "success"
            : slaPercent >= 70
              ? "warning"
              : "danger"
        }
        emphasize={slaPercent < 70}
        subLabel={
          totalAssigned !== undefined
            ? `${totalAssigned} task${totalAssigned === 1 ? "" : "s"} assigned`
            : undefined
        }
        trend={
          slaTrend !== undefined
            ? {
                value: slaTrend,
                label: "vs last week",
                goodWhen: "up",
              }
            : undefined
        }
        loading={loading}
      />
    </section>
  );
}

/* ──────────────────────────────────────────────
   OPTIONAL: 5-card variant including "Tasks Assigned"
   Use when you want to surface workload size as well.
   ────────────────────────────────────────────── */

export function StaffMetricsSectionExtended(
  props: StaffMetricsSectionProps & { totalAssigned: number },
) {
  return (
    <section
      aria-label="Your performance at a glance"
      className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4"
    >
      <MetricCard
        title="Tasks Assigned"
        value={props.totalAssigned}
        icon={ClipboardList}
        variant="primary"
        subLabel="Total assigned to you"
        loading={props.loading}
      />
      <MetricCard
        title="Overdue"
        value={props.overdue}
        icon={AlertOctagon}
        variant="danger"
        emphasize
        cta={
          props.overdue > 0
            ? { label: "Resolve", href: "/staff/tasks?filter=overdue" }
            : undefined
        }
        loading={props.loading}
      />
      <MetricCard
        title="Due Today"
        value={props.dueToday}
        icon={Clock}
        variant="warning"
        emphasize={props.dueToday > 0}
        loading={props.loading}
      />
      <MetricCard
        title="Completed Today"
        value={props.completedToday}
        icon={CheckCircle2}
        variant="success"
        loading={props.loading}
      />
      <MetricCard
        title="SLA"
        value={props.slaPercent}
        unit="%"
        icon={TrendingUp}
        variant={
          props.slaPercent >= 90
            ? "success"
            : props.slaPercent >= 70
              ? "warning"
              : "danger"
        }
        trend={
          props.slaTrend !== undefined
            ? { value: props.slaTrend, label: "vs last week", goodWhen: "up" }
            : undefined
        }
        loading={props.loading}
      />
    </section>
  );
}
