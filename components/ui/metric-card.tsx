"use client";

import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────
   Design tokens
   Primary  : #1E3A8A
   Success  : #22C55E
   Warning  : #F59E0B
   Danger   : #EF4444
   ───────────────────────────────── */

export type MetricVariant =
  | "primary" //  deep blue — neutral key metric
  | "success" //  emerald — positive metric
  | "warning" //  amber   — needs attention
  | "danger" //   red     — urgent / negative
  | "neutral"; //  slate   — supporting metric

export type TrendDirection = "up" | "down" | "flat";

export interface MetricTrend {
  /** Numeric delta (e.g. +5, -3). Sign determines direction unless `direction` set. */
  value: number;
  /** Short label, e.g. "vs last week". Defaults to "vs previous". */
  label?: string;
  /**
   * For metrics where "down" is good (e.g. Overdue), pass `goodWhen="down"`
   * so an arrow-down renders in green instead of red.
   */
  goodWhen?: "up" | "down";
  direction?: TrendDirection;
}

export interface MetricCardProps {
  /** Short uppercase label rendered above the number. */
  title: string;
  /** Hero number or short string. */
  value: number | string;
  /** Optional unit suffix shown next to the value (e.g. "%", "h"). */
  unit?: string;
  /** Optional helper line below the number. */
  subLabel?: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Color variant. */
  variant?: MetricVariant;
  /**
   * When true and value is truthy/non-zero, renders the "danger/warning"
   * spotlight treatment (tinted card + colored left border).
   */
  emphasize?: boolean;
  /** Optional trend indicator. */
  trend?: MetricTrend;
  /** Optional inline CTA link. Only rendered when value is truthy/non-zero. */
  cta?: { label: string; href: string };
  /** Render skeleton while data is loading. */
  loading?: boolean;
  /** Forwarded class. */
  className?: string;
}

const variantMap: Record<
  MetricVariant,
  {
    iconBg: string;
    blob: string;
    border: string;
    bg: string;
    label: string;
    valueColor: string;
    leftBorder: string;
    ctaBg: string;
    ring: string;
  }
> = {
  primary: {
    iconBg: "bg-[#1E3A8A]",
    blob: "bg-[#1E3A8A]",
    border: "border-slate-200",
    bg: "bg-white",
    label: "text-slate-500",
    valueColor: "text-slate-900",
    leftBorder: "before:bg-[#1E3A8A]",
    ctaBg: "bg-[#1E3A8A] hover:bg-[#172e6e] shadow-indigo-500/30",
    ring: "ring-blue-100",
  },
  success: {
    iconBg: "bg-emerald-500",
    blob: "bg-emerald-500",
    border: "border-slate-200",
    bg: "bg-white",
    label: "text-slate-500",
    valueColor: "text-slate-900",
    leftBorder: "before:bg-emerald-500",
    ctaBg: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30",
    ring: "ring-emerald-100",
  },
  warning: {
    iconBg: "bg-amber-500",
    blob: "bg-amber-500",
    border: "border-slate-200",
    bg: "bg-white",
    label: "text-slate-500",
    valueColor: "text-slate-900",
    leftBorder: "before:bg-amber-500",
    ctaBg: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30",
    ring: "ring-amber-100",
  },
  danger: {
    iconBg: "bg-red-500",
    blob: "bg-red-500",
    border: "border-slate-200",
    bg: "bg-white",
    label: "text-slate-500",
    valueColor: "text-slate-900",
    leftBorder: "before:bg-red-500",
    ctaBg: "bg-red-600 hover:bg-red-700 shadow-red-500/30",
    ring: "ring-red-100",
  },
  neutral: {
    iconBg: "bg-slate-700",
    blob: "bg-slate-500",
    border: "border-slate-200",
    bg: "bg-white",
    label: "text-slate-500",
    valueColor: "text-slate-900",
    leftBorder: "before:bg-slate-400",
    ctaBg: "bg-slate-800 hover:bg-slate-900 shadow-slate-500/30",
    ring: "ring-slate-100",
  },
};

const emphasizeMap: Record<
  MetricVariant,
  { bg: string; border: string; label: string; value: string }
> = {
  primary: {
    bg: "bg-blue-50/40",
    border: "border-blue-200",
    label: "text-[#1E3A8A]",
    value: "text-[#1E3A8A]",
  },
  success: {
    bg: "bg-emerald-50/40",
    border: "border-emerald-200",
    label: "text-emerald-700",
    value: "text-emerald-700",
  },
  warning: {
    bg: "bg-amber-50/50",
    border: "border-amber-200",
    label: "text-amber-700",
    value: "text-amber-800",
  },
  danger: {
    bg: "bg-red-50/50",
    border: "border-red-200",
    label: "text-red-600",
    value: "text-red-700",
  },
  neutral: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    label: "text-slate-600",
    value: "text-slate-900",
  },
};

function deriveDirection(t: MetricTrend): TrendDirection {
  if (t.direction) return t.direction;
  if (t.value > 0) return "up";
  if (t.value < 0) return "down";
  return "flat";
}

export function MetricCard({
  title,
  value,
  unit,
  subLabel,
  icon: Icon,
  variant = "primary",
  emphasize,
  trend,
  cta,
  loading,
  className,
}: MetricCardProps) {
  const v = variantMap[variant];

  // Auto-emphasize negative metrics when value is non-zero
  const isHot =
    !!emphasize &&
    (typeof value === "number" ? value > 0 : Boolean(value && value !== "0"));

  const emp = emphasizeMap[variant];

  return (
    <div
      className={cn(
        // Card shell
        "group relative overflow-hidden rounded-2xl border p-5 shadow-sm ring-1 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md",
        // Left urgency border (only when emphasized)
        isHot &&
          "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:content-['']",
        isHot ? emp.bg : v.bg,
        isHot ? emp.border : v.border,
        v.ring,
        isHot && v.leftBorder,
        className,
      )}
    >
      {/* Decorative blob */}
      <div
        className={cn(
          "pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full opacity-[0.06] transition-opacity group-hover:opacity-[0.1]",
          v.blob,
        )}
      />

      <div className={cn("flex items-start justify-between gap-3", isHot && "pl-1.5")}>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider",
              isHot ? emp.label : v.label,
            )}
          >
            {title}
          </p>

          <div className="mt-2 flex items-baseline gap-1.5">
            {loading ? (
              <span className="inline-block h-9 w-20 animate-pulse rounded-md bg-slate-100" />
            ) : (
              <span
                className={cn(
                  "text-4xl font-extrabold tabular-nums leading-none tracking-tight",
                  isHot ? emp.value : v.valueColor,
                )}
              >
                {value}
              </span>
            )}
            {unit && !loading && (
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  isHot ? emp.value : "text-slate-500",
                )}
              >
                {unit}
              </span>
            )}
          </div>

          {/* Trend OR subLabel (trend takes precedence) */}
          {!loading && trend ? (
            <TrendChip trend={trend} className="mt-2" />
          ) : (
            !loading &&
            subLabel && (
              <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                {subLabel}
              </p>
            )
          )}
        </div>

        {/* Icon */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition-transform duration-200 group-hover:scale-105",
            v.iconBg,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Inline CTA */}
      {cta && !loading && shouldShowCta(value) && (
        <Link
          href={cta.href}
          className={cn(
            "relative z-10 mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-bold text-white shadow-md transition active:scale-[0.98]",
            "min-h-[40px]",
            v.ctaBg,
          )}
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function shouldShowCta(value: number | string): boolean {
  if (typeof value === "number") return value > 0;
  return Boolean(value) && value !== "0" && value !== "0%";
}

/* ──────────────────────────────────────────────
   Trend chip (inline)
   ────────────────────────────────────────────── */

function TrendChip({
  trend,
  className,
}: {
  trend: MetricTrend;
  className?: string;
}) {
  const direction = deriveDirection(trend);
  const goodWhen = trend.goodWhen ?? "up";
  const isGood =
    direction === "flat"
      ? null
      : direction === goodWhen
        ? true
        : false;

  const tone =
    isGood === null
      ? "text-slate-500 bg-slate-50 ring-slate-200"
      : isGood
        ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
        : "text-red-700 bg-red-50 ring-red-200";

  const Icon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;

  const sign =
    trend.value > 0 ? "+" : trend.value < 0 ? "−" : ""; // unicode minus
  const display = `${sign}${Math.abs(trend.value)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {display}
      {trend.label && (
        <span className="ml-0.5 font-medium opacity-80">{trend.label}</span>
      )}
    </span>
  );
}
