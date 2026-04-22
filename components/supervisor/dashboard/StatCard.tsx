"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: { value: number; label: string };
  critical?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  critical,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        critical && value > 0
          ? "border-red-200 bg-red-50/50 stat-card-critical"
          : "border-gray-200 shadow-sm"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[13px] font-medium tracking-wide text-gray-500">
            {label}
          </p>
          <p
            className={cn(
              "text-3xl font-bold tracking-tight",
              critical && value > 0 ? "text-red-700" : "text-gray-900"
            )}
          >
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.value >= 0 ? "text-green-600" : "text-red-500"
                )}
              >
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-[11px] text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>

      {/* Decorative gradient */}
      <div
        className={cn(
          "pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full opacity-[0.04] transition-opacity group-hover:opacity-[0.08]",
          critical && value > 0 ? "bg-red-500" : "bg-indigo-500"
        )}
      />
    </div>
  );
}
