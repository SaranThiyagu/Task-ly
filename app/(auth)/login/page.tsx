"use client";

import { useState } from "react";
import { login } from "./actions";
import { Card } from "@/components/ui/card";
import {
  CheckSquare,
  Loader2,
  Users,
  Shield,
  BarChart3,
  ArrowRight,
} from "lucide-react";

// ── Hardcoded demo credentials (shared password across roles) ──
const DEMO_PASSWORD = "Demo@1234";

const roles = [
  {
    role: "Staff",
    name: "Sarah Tan",
    email: "sarah.tan@cleanpro-demo.com",
    icon: Users,
    iconBg: "bg-blue-50 text-blue-600",
    description: "Submit task evidence and track assigned jobs",
  },
  {
    role: "Supervisor",
    name: "Michael Lim",
    email: "michael.lim@cleanpro-demo.com",
    icon: Shield,
    iconBg: "bg-emerald-50 text-emerald-600",
    description: "Review submissions, approve tasks, manage team",
  },
  {
    role: "Manager",
    name: "David Wong",
    email: "david.wong@cleanpro-demo.com",
    icon: BarChart3,
    iconBg: "bg-violet-50 text-violet-600",
    description: "KPI dashboards, escalations, reports & exports",
  },
] as const;

export default function LoginPage() {
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleLogin(email: string) {
    setError(null);
    setLoadingEmail(email);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", DEMO_PASSWORD);

    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoadingEmail(null);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-900 p-12 text-white">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-8 w-8 text-blue-400" />
          <span className="text-2xl font-bold tracking-tight">TaskMe</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Streamline your
            <br />
            task management
          </h1>
          <p className="text-lg text-slate-300 max-w-md">
            Assign, track, and review tasks across your team with real-time
            visibility and role-based workflows.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          &copy; {new Date().getFullYear()} TaskMe. All rights reserved.
        </p>
      </div>

      {/* Right panel — role picker (no username/password input) */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-gray-50 px-6 py-10">
        <Card className="w-full max-w-md p-8 shadow-lg border-0">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">TaskMe</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900">
              Choose your role
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              One-click access to the demo dashboards
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {roles.map((r) => {
              const isLoading = loadingEmail === r.email;
              return (
                <button
                  key={r.email}
                  type="button"
                  disabled={loadingEmail !== null}
                  onClick={() => handleRoleLogin(r.email)}
                  className="group w-full text-left rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${r.iconBg}`}
                    >
                      <r.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {r.role}
                        </p>
                        <span className="text-xs text-slate-400">
                          · {r.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {r.description}
                      </p>
                    </div>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                    ) : (
                      <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Demo mode · Credentials are pre-configured
          </p>
        </Card>
      </div>
    </div>
  );
}
