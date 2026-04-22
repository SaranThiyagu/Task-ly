"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EscalationBannerProps {
  total: number;
  criticalCount: number;
}

export function EscalationBanner({ total, criticalCount }: EscalationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || total === 0) return null;

  const isCritical = criticalCount > 0;

  return (
    <div
      className={`relative rounded-lg border-2 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
        isCritical
          ? "border-red-400 bg-red-50 animate-pulse-subtle"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`shrink-0 rounded-full p-1.5 ${
            isCritical ? "bg-red-200 animate-ping-slow" : "bg-red-100"
          }`}
        >
          <AlertTriangle
            className={`h-4 w-4 ${isCritical ? "text-red-700" : "text-red-600"}`}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-800">
            ⚠️ {total} task{total !== 1 ? "s" : ""} require
            {total === 1 ? "s" : ""} immediate attention
          </p>
          {criticalCount > 0 && (
            <p className="text-xs text-red-600 mt-0.5">
              {criticalCount} critical escalation{criticalCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link href="/manager/escalations">
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-400 hover:text-red-700 hover:bg-red-100"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tailwind custom animations via inline style */}
      <style jsx>{`
        @keyframes ping-slow {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes pulse-subtle {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2s ease-in-out infinite;
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
