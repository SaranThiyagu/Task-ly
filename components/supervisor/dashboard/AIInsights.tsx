"use client";

import { Sparkles, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";

interface AIInsightsProps {
  overdueCount: number;
  completedToday: number;
  pendingReviews: number;
}

export function AIInsights({
  overdueCount,
  completedToday,
  pendingReviews,
}: AIInsightsProps) {
  const insights: { icon: typeof Sparkles; text: string; type: "warning" | "positive" | "info" }[] = [];

  if (overdueCount > 0) {
    insights.push({
      icon: AlertTriangle,
      text: `${overdueCount} task${overdueCount > 1 ? "s" : ""} likely to miss SLA`,
      type: "warning",
    });
  }

  if (completedToday > 0) {
    insights.push({
      icon: TrendingUp,
      text: `${completedToday} task${completedToday > 1 ? "s" : ""} completed today — team is on track`,
      type: "positive",
    });
  }

  if (pendingReviews > 3) {
    insights.push({
      icon: Sparkles,
      text: `${pendingReviews} reviews pending — consider batch reviewing`,
      type: "info",
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: Sparkles,
      text: "All systems nominal — no action required",
      type: "positive",
    });
  }

  const typeStyles = {
    warning: "text-amber-600 bg-amber-50",
    positive: "text-green-600 bg-green-50",
    info: "text-indigo-600 bg-indigo-50",
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-indigo-100/60 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
        </div>
        <h3 className="text-[13px] font-semibold text-gray-900">
          AI Insights
        </h3>
        <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
          Beta
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          const styles = typeStyles[insight.type];
          return (
            <div
              key={idx}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/50"
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <p className="flex-1 text-[13px] text-gray-700">{insight.text}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-indigo-100/60 px-4 py-2.5">
        <button className="flex items-center gap-1 text-[12px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700">
          View Recommendations
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
