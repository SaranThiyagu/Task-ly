"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "./(auth)/login/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  Camera,
  ClipboardCheck,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Users,
  Shield,
  BarChart3,
} from "lucide-react";

const DEMO_PASSWORD = "Demo@1234";

const demoUsers = [
  {
    role: "Staff",
    name: "Sarah Tan",
    title: "Cleaner",
    email: "sarah.tan@cleanpro-demo.com",
    icon: Users,
    color: "blue",
    description: "Submit task evidence, view assigned jobs, track progress",
  },
  {
    role: "Supervisor",
    name: "Michael Lim",
    title: "Supervisor",
    email: "michael.lim@cleanpro-demo.com",
    icon: Shield,
    color: "emerald",
    description: "Review submissions, approve tasks, manage team",
  },
  {
    role: "Manager",
    name: "David Wong",
    title: "Owner",
    email: "david.wong@cleanpro-demo.com",
    icon: BarChart3,
    color: "violet",
    featured: true,
    description: "KPI dashboards, escalations, reports & exports",
  },
] as const;

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-600",
    button: "bg-blue-600 hover:bg-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "text-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: "text-violet-600",
    button: "bg-violet-600 hover:bg-violet-700",
    badge: "bg-violet-100 text-violet-700",
  },
};

export default function LandingPage() {
  const router = useRouter();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDemoLogin(email: string) {
    setLoadingEmail(email);
    setError(null);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white font-bold text-lg">
              T
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              TaskMe
            </span>
          </div>
          <p className="hidden sm:block text-sm text-slate-400">
            Operational Task Management for Singapore Teams
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => router.push("/login")}
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-400 mb-6 border border-blue-500/20">
          <CheckSquare className="h-4 w-4" />
          Built for Singapore SMEs
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
          Stop Chasing Staff
          <br />
          <span className="text-blue-400">on WhatsApp</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-slate-400 leading-relaxed">
          TaskMe gives you photo proof of every completed task with automatic
          escalation when things go wrong.
        </p>

        {/* Feature bullets */}
        <div className="mx-auto mt-10 flex max-w-xl flex-col gap-4 text-left sm:gap-3">
          {[
            {
              icon: Camera,
              text: "Staff submit task evidence with photos",
            },
            {
              icon: ClipboardCheck,
              text: "Supervisors review and approve remotely",
            },
            {
              icon: AlertTriangle,
              text: "Overdue tasks auto-escalate to management",
            },
          ].map((feature) => (
            <div
              key={feature.text}
              className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 sm:bg-transparent sm:px-0 sm:py-0"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/15">
                <feature.icon className="h-4 w-4 text-green-400" />
              </div>
              <span className="text-base sm:text-lg text-slate-300">
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Login Cards */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Try the Live Demo
          </h2>
          <p className="mt-2 text-slate-400">
            Click any card to instantly log in as that role
          </p>
        </div>

        {error && (
          <div className="mx-auto mb-6 max-w-md rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {demoUsers.map((user) => {
            const colors = colorMap[user.color];
            const isLoading = loadingEmail === user.email;
            const isFeatured = "featured" in user && user.featured;

            return (
              <Card
                key={user.email}
                className={`relative overflow-hidden border-0 bg-white/5 backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:scale-[1.02] ${
                  isFeatured
                    ? "ring-2 ring-violet-500/50 sm:col-span-2 lg:col-span-1"
                    : ""
                }`}
              >
                {isFeatured && (
                  <div className="absolute top-0 right-0 rounded-bl-lg bg-violet-500 px-3 py-1 text-xs font-semibold text-white">
                    RECOMMENDED
                  </div>
                )}
                <div className="p-6">
                  {/* Role badge + icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg}`}
                    >
                      <user.icon className={`h-6 w-6 ${colors.icon}`} />
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${colors.badge}`}
                    >
                      {user.role}
                    </span>
                  </div>

                  {/* Name + title */}
                  <h3 className="text-lg font-semibold text-white">
                    {user.name}
                  </h3>
                  <p className="text-sm text-slate-400">{user.title}</p>

                  {/* Description */}
                  <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                    {user.description}
                  </p>

                  {/* Credentials */}
                  <div className="mt-4 rounded-lg bg-black/20 px-3 py-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Email</span>
                      <span className="font-mono text-slate-300">
                        {user.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Password</span>
                      <span className="font-mono text-slate-300">
                        {DEMO_PASSWORD}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    className={`mt-5 w-full h-11 text-white font-medium ${colors.button} min-h-[44px]`}
                    disabled={loadingEmail !== null}
                    onClick={() => handleDemoLogin(user.email)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Try {user.role} View
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <p className="text-center text-sm text-slate-500">
          Built for Singapore SMEs &nbsp;·&nbsp; Cleaning &nbsp;·&nbsp; F&B
          &nbsp;·&nbsp; Facilities Management
        </p>
      </footer>
    </div>
  );
}
