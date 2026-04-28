"use client";

import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Users,
} from "lucide-react";
import Link from "next/link";

interface AIInsightsProps {
  overdueCount: number;
  completedToday: number;
  pendingReviews: number;
  activeTasks?: number;
}

type InsightTone = "warning" | "positive" | "info" | "danger";

interface Insight {
  icon: typeof Sparkles;
  title: string;
  body: string;
  tone: InsightTone;
  href?: string;
  cta?: string;
}

const toneStyles: Record<
  InsightTone,
  { card: string; iconBg: string; iconColor: string; chip: string; cta: string }
> = {
  danger: {
    card: "border-red-200 bg-gradient-to-br from-red-50 via-white to-red-50/40",
    iconBg: "bg-red-500",
    iconColor: "text-white",
    chip: "bg-red-100 text-red-700",
    cta: "text-red-700 hover:text-red-800",
  },
  warning: {
    card: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50/40",
    iconBg: "bg-amber-500",
    iconColor: "text-white",
    chip: "bg-amber-100 text-amber-800",
    cta: "text-amber-700 hover:text-amber-800",
  },
  positive: {
    card: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40",
    iconBg: "bg-emerald-500",
    iconColor: "text-white",
    chip: "bg-emerald-100 text-emerald-700",
    cta: "text-emerald-700 hover:text-emerald-800",
  },
  info: {
    card: "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50/40",
    iconBg: "bg-[#1E3A8A]",
    iconColor: "text-white",
    chip: "bg-indigo-100 text-indigo-700",
    cta: "text-[#1E3A8A] hover:text-indigo-800",
  },
};

export function AIInsights({
  overdueCount,
  completedToday,
  pendingReviews,
  activeTasks,
}: AIInsightsProps) {
  const insights: Insight[] = [];

  if (overdueCount > 0) {
    insights.push({
      icon: AlertTriangle,
      title: `${overdueCount} task${overdueCount > 1 ? "s" : ""} likely to miss SLA`,
      body:
        overdueCount > 3
          ? "Multiple overdue items — consider reassigning or escalating now."
          : "Resolve or escalate before SLA breach.",
      tone: "danger",
      cta: "Review overdue",
      href: "/supervisor/tasks?filter=overdue",
    });
  }

  if (pendingReviews > 0) {
    insights.push({
      icon: Sparkles,
      title:
        pendingReviews > 3
          ? `${pendingReviews} reviews pending — batch review recommended`
          : `${pendingReviews} review${pendingReviews > 1 ? "s" : ""} awaiting your action`,
      body: "Quick approvals keep your team unblocked.",
      tone: pendingReviews > 5 ? "warning" : "info",
      cta: "Start reviewing",
      href: "/supervisor/reviews",
    });
  }

  if (completedToday > 0) {
    insights.push({
      icon: TrendingUp,
      title: `${completedToday} task${completedToday > 1 ? "s" : ""} completed today`,
      body:
        completedToday >= 5
          ? "Team is performing above target. Great pace!"
          : "Team is on track — keep the momentum going.",
      tone: "positive",
      cta: "View completions",
      href: "/supervisor/tasks?filter=completed",
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: Sparkles,
      title: "All systems nominal",
      body: "No overdue items and no reviews awaiting action.",
      tone: "positive",
    });
  }

  if (typeof activeTasks === "number" && insights.length < 3) {
    insights.push({
      icon: Users,
      title: `${activeTasks} active tasks across team`,
      body: "Check team workload distribution for balance.",
      tone: "info",
      cta: "View team",
      href: "/supervisor/team",
    });
  }

  return (
    <section aria-label="AI insights">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-indigo-500 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <h2 className="text-[15px] font-bold text-slate-900">AI Insights</h2>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A]">
          Beta
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.slice(0, 3).map((insight, idx) => {
          const Icon = insight.icon;
          const s = toneStyles[insight.tone];
          return (
            <article
              key={idx}
              className={`relative overflow-hidden rounded-2xl border ${s.card} p-4 shadow-sm transition hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.iconBg} shadow-sm`}
                >
                  <Icon className={`h-4.5 w-4.5 ${s.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13.5px] font-bold leading-snug text-slate-900">
                    {insight.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-snug text-slate-600">
                    {insight.body}
                  </p>
                  {insight.cta && insight.href && (
                    <Link
                      href={insight.href}
                      className={`mt-2 inline-flex items-center gap-1 text-[11.5px] font-bold ${s.cta}`}
                    >
                      {insight.cta}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
