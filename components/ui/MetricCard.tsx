"use client";

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────
   TaskMe Design Tokens
   Primary  : #1E3A8A
   Success  : #22C55E
   Warning  : #F59E0B
   Danger   : #EF4444
   ───────────────────────────────── */

export type MetricVariant =
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "info";

export interface MetricCardProps {
  title: string;
  value: string | number;
  label?: string;
  icon?: React.ReactNode;
  variant: MetricVariant;
  /** "up" | "down" | null — direction of change. */
  trend?: "up" | "down" | null;
  /** Display string shown next to the trend arrow, e.g. "+12%". */
  trendValue?: string;
  /**
   * For overdue / pending — when true the card switches to a tinted
   * background, gains a 6px colored left border and pulses softly.
   */
  isUrgent?: boolean;
  className?: string;
}

const variantTheme: Record<
  MetricVariant,
  {
    iconBg: string;
    iconColor: string;
    blob: string;
    ring: string;
    leftBar: string;
    urgentBg: string;
    urgentBorder: string;
    urgentLabel: string;
    urgentValue: string;
    trendGood: "up" | "down"; // direction considered positive
  }
> = {
  success: {
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    blob: "bg-emerald-500",
    ring: "ring-emerald-100",
    leftBar: "before:bg-emerald-500",
    urgentBg: "bg-emerald-50/60",
    urgentBorder: "border-emerald-200",
    urgentLabel: "text-emerald-700",
    urgentValue: "text-emerald-700",
    trendGood: "up",
  },
  warning: {
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    blob: "bg-amber-500",
    ring: "ring-amber-100",
    leftBar: "before:bg-amber-500",
    urgentBg: "bg-amber-50/70",
    urgentBorder: "border-amber-200",
    urgentLabel: "text-amber-700",
    urgentValue: "text-amber-800",
    trendGood: "down", // for warnings, lower is better
  },
  danger: {
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    blob: "bg-red-500",
    ring: "ring-red-100",
    leftBar: "before:bg-red-500",
    urgentBg: "bg-red-50/70",
    urgentBorder: "border-red-200",
    urgentLabel: "text-red-600",
    urgentValue: "text-red-700",
    trendGood: "down", // for danger, lower is better
  },
  info: {
    iconBg: "bg-blue-50",
    iconColor: "text-[#1E3A8A]",
    blob: "bg-[#1E3A8A]",
    ring: "ring-blue-100",
    leftBar: "before:bg-[#1E3A8A]",
    urgentBg: "bg-blue-50/60",
    urgentBorder: "border-blue-200",
    urgentLabel: "text-[#1E3A8A]",
    urgentValue: "text-[#1E3A8A]",
    trendGood: "up",
  },
  neutral: {
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    blob: "bg-slate-500",
    ring: "ring-slate-100",
    leftBar: "before:bg-slate-400",
    urgentBg: "bg-slate-50",
    urgentBorder: "border-slate-200",
    urgentLabel: "text-slate-600",
    urgentValue: "text-slate-900",
    trendGood: "up",
  },
};

export function MetricCard({
  title,
  value,
  label,
  icon,
  variant,
  trend = null,
  trendValue,
  isUrgent = false,
  className,
}: MetricCardProps) {
  const t = variantTheme[variant];
  const showUrgent = isUrgent;

  return (
    <div
      className={cn(
        // Card shell
        "group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ring-1 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md",
        t.ring,
        showUrgent
          ? cn(
              "border bg-gradient-to-br",
              t.urgentBg,
              t.urgentBorder,
              // 6px colored left bar
              "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:content-['']",
              t.leftBar,
            )
          : "border-slate-200",
        className,
      )}
    >
      {/* Decorative blob */}
      <div
        className={cn(
          "pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full opacity-[0.06] transition-opacity group-hover:opacity-[0.1]",
          t.blob,
        )}
      />

      <div
        className={cn(
          "flex items-start justify-between gap-3",
          showUrgent && "pl-2",
        )}
      >
        <div className="min-w-0 flex-1">
          {/* Title */}
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider",
              showUrgent ? t.urgentLabel : "text-slate-500",
            )}
          >
            {title}
          </p>

          {/* Value */}
          <p
            className={cn(
              "mt-2 text-4xl font-extrabold tabular-nums leading-none tracking-tight sm:text-[44px]",
              showUrgent ? t.urgentValue : "text-slate-900",
            )}
          >
            {value}
          </p>

          {/* Trend + label row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {trend && (
              <TrendChip
                direction={trend}
                value={trendValue}
                goodWhen={t.trendGood}
              />
            )}
            {label && (
              <span
                className={cn(
                  "text-[11.5px] font-medium",
                  showUrgent ? "text-slate-600" : "text-slate-400",
                )}
              >
                {label}
              </span>
            )}
          </div>
        </div>

        {/* Icon */}
        {icon && (
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-200 group-hover:scale-105",
              showUrgent ? "bg-white" : t.iconBg,
              showUrgent && "ring-1",
              showUrgent && t.urgentBorder,
            )}
          >
            <span className={cn("[&_svg]:h-5 [&_svg]:w-5", t.iconColor)}>
              {icon}
            </span>
          </div>
        )}
      </div>

      {/* Soft pulse for urgent cards */}
      {showUrgent && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 inline-flex h-2.5 w-2.5"
        >
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              t.blob,
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2.5 w-2.5 rounded-full",
              t.blob,
            )}
          />
        </span>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Trend chip
   ────────────────────────────────────────────── */

function TrendChip({
  direction,
  value,
  goodWhen,
}: {
  direction: "up" | "down";
  value?: string;
  goodWhen: "up" | "down";
}) {
  const isGood = direction === goodWhen;
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ring-1 ring-inset",
        isGood
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-red-50 text-red-700 ring-red-200",
      )}
    >
      <Icon className="h-3 w-3" />
      {value && <span className="tabular-nums">{value}</span>}
    </span>
  );
}
