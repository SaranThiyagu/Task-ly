"use client";

import { Search, Bell, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface TopBarProps {
  name: string;
}

export function TopBar({ name }: TopBarProps) {
  const firstName = name.split(" ")[0];

  return (
    <div className="hidden lg:flex items-center justify-between pb-6">
      {/* Left side */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Supervisor Dashboard
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Welcome back, {firstName} &middot;{" "}
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="h-9 w-56 rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-3 text-[13px] text-gray-700 placeholder:text-gray-400 transition-all duration-200 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-gray-700">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            3
          </span>
        </button>

        {/* AI Copilot button */}
        <button className="flex h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-[12px] font-semibold text-indigo-700 transition-all duration-200 hover:bg-indigo-100">
          <Sparkles className="h-3.5 w-3.5" />
          AI Copilot
        </button>
      </div>
    </div>
  );
}
