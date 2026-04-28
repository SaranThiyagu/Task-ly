"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────
   Design tokens
   Primary  : #1E3A8A
   Danger   : #EF4444
   Warning  : #F59E0B
   Success  : #22C55E
   ───────────────────────────────── */

export type StatTone = "blue" | "amber" | "red" | "green" | "indigo";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: StatTone;
  /** Strong urgency styling (red fill) when value > 0 */
  critical?: boolean;
  /** Optional inline action (e.g. "Review Now") */
  cta?: { label: string; href: string };
  /** Optional small subtext under the number */
  subLabel?: string;
}

const toneMap: Record<
  StatTone,
  {
    iconBg: string;
    iconColor: string;
    accent: string;
    blob: string;
    label: string;
  }
> = {
  blue: {
    iconBg: "bg-[#1E3A8A]",
    iconColor: "text-white",
    accent: "text-[#1E3A8A]",
    blob: "bg-indigo-500",
    label: "text-slate-500",
  },
  indigo: {
    iconBg: "bg-indigo-500",
    iconColor: "text-white",
    accent: "text-indigo-700",
    blob: "bg-indigo-500",
    label: "text-slate-500",
  },
  amber: {
    iconBg: "bg-amber-500",
    iconColor: "text-white",
    accent: "text-amber-700",
    blob: "bg-amber-500",
    label: "text-slate-500",
  },
  red: {
    iconBg: "bg-red-500",
    iconColor: "text-white",
    accent: "text-red-700",
    blob: "bg-red-500",
    label: "text-slate-500",
  },
  green: {
    iconBg: "bg-emerald-500",
    iconColor: "text-white",
    accent: "text-emerald-700",
    blob: "bg-emerald-500",
    label: "text-slate-500",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  critical,
  cta,
  subLabel,
}: StatCardProps) {
  const t = toneMap[tone];
  const isCritical = critical && value > 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col",
        isCritical
          ? "border-red-200 bg-red-50/40 stat-card-critical shadow-sm"
          : "border-slate-200 shadow-sm",
      )}
    >
      {/* Decorative blob */}
      <div
        className={cn(
          "pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full opacity-[0.06] transition-opacity group-hover:opacity-[0.1]",
          isCritical ? "bg-red-500" : t.blob,
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider",
              isCritical ? "text-red-600" : t.label,
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-4xl font-extrabold tabular-nums tracking-tight leading-none",
              isCritical ? "text-red-700" : "text-slate-900",
            )}
          >
            {value}
          </p>
          {subLabel && (
            <p className="mt-1.5 text-[11px] font-medium text-slate-400">
              {subLabel}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md transition-transform duration-200 group-hover:scale-105",
            isCritical ? "bg-red-500" : t.iconBg,
          )}
        >
          <Icon className={cn("h-5 w-5", t.iconColor)} />
        </div>
      </div>

      {/* Inline CTA */}
      {cta && value > 0 && (
        <Link
          href={cta.href}
          className={cn(
            "relative z-10 mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold transition-all duration-200",
            isCritical
              ? "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/30"
              : tone === "amber"
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/30"
                : "bg-[#1E3A8A] text-white hover:bg-[#172e6e] shadow-sm shadow-indigo-500/30",
          )}
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
