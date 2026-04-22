"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: "completion" | "submission" | "escalation";
  title: string;
  name: string;
  time: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

function groupByDay(items: ActivityItem[]) {
  const groups: { label: string; items: ActivityItem[] }[] = [];
  const todayItems: ActivityItem[] = [];
  const yesterdayItems: ActivityItem[] = [];
  const olderItems: ActivityItem[] = [];

  for (const item of items) {
    if (!item.time) {
      olderItems.push(item);
      continue;
    }
    const date = new Date(item.time);
    if (isToday(date)) todayItems.push(item);
    else if (isYesterday(date)) yesterdayItems.push(item);
    else olderItems.push(item);
  }

  if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems });
  if (yesterdayItems.length > 0)
    groups.push({ label: "Yesterday", items: yesterdayItems });
  if (olderItems.length > 0) groups.push({ label: "Earlier", items: olderItems });

  return groups;
}

const typeConfig = {
  completion: {
    icon: CheckCircle2,
    bg: "bg-green-50",
    text: "text-green-600",
    verb: "completed",
  },
  submission: {
    icon: ClipboardCheck,
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    verb: "submitted evidence for",
  },
  escalation: {
    icon: ArrowUpRight,
    bg: "bg-orange-50",
    text: "text-orange-600",
    verb: "escalated",
  },
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  const groups = groupByDay(items);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <Activity className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/80 px-4 py-2 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </p>
            </div>
            {group.items.map((item, idx) => {
              const config = typeConfig[item.type];
              const Icon = config.icon;
              return (
                <div
                  key={item.id}
                  className="activity-feed-item flex items-start gap-3 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50/50 last:border-b-0"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.bg}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${config.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-gray-700 leading-snug">
                      <span className="font-semibold text-gray-900">
                        {item.name}
                      </span>{" "}
                      {config.verb}{" "}
                      <span className="font-medium text-gray-900">
                        {item.title}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {item.time
                        ? formatDistanceToNow(new Date(item.time), {
                            addSuffix: true,
                          })
                        : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 px-4 py-2.5">
        <Link
          href="/supervisor/tasks"
          className="text-[12px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
        >
          View all activity →
        </Link>
      </div>
    </div>
  );
}
