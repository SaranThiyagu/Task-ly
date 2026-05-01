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
  Bell,
  Clock,
  FileText,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Zap,
  TrendingUp,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Flame,
  PhoneCall,
  Star,
} from "lucide-react";

const DEMO_PASSWORD = "Demo@1234";

const demoUsers = [
  {
    role: "Staff",
    name: "Sarah Tan",
    title: "Housekeeper",
    email: "sarah.tan@cleanpro-demo.com",
    icon: Users,
    color: "blue",
    description: "View assigned tasks, complete with photo evidence, track your shift progress",
  },
  {
    role: "Supervisor",
    name: "Michael Lim",
    title: "Floor Supervisor",
    email: "michael.lim@cleanpro-demo.com",
    icon: Shield,
    color: "emerald",
    description: "Review photo submissions, approve or reject, reassign overdue tasks",
  },
  {
    role: "Manager",
    name: "David Wong",
    title: "Operations Manager",
    email: "david.wong@cleanpro-demo.com",
    icon: BarChart3,
    color: "violet",
    featured: true,
    description: "Live KPI dashboards, escalation oversight, team performance & CSV reports",
  },
] as const;

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-600",
    button: "bg-blue-600 hover:bg-blue-700",
    badge: "bg-blue-100 text-blue-700",
    glow: "shadow-blue-500/20",
    ring: "ring-blue-500/40",
    accent: "text-blue-400",
    accentBg: "bg-blue-500/10 border-blue-500/20",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "text-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    glow: "shadow-emerald-500/20",
    ring: "ring-emerald-500/40",
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/10 border-emerald-500/20",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: "text-violet-600",
    button: "bg-violet-600 hover:bg-violet-700",
    badge: "bg-violet-100 text-violet-700",
    glow: "shadow-violet-500/20",
    ring: "ring-violet-500/40",
    accent: "text-violet-400",
    accentBg: "bg-violet-500/10 border-violet-500/20",
  },
};

/* ── Role feature definitions ── */
const roleFeatures = [
  {
    role: "Staff",
    color: "blue" as const,
    icon: Users,
    persona: "Sarah Tan — Housekeeper, Marina Bay Boutique Hotel",
    painPoint: "\"I forget which rooms I've done. My supervisor calls me on WhatsApp to check. Sometimes tasks get missed and I get blamed.\"",
    headline: "Every shift, crystal clear",
    features: [
      {
        icon: Bell,
        title: "Instant task notifications",
        useCase: "Sarah's phone buzzes — Room 412 checkout just came in. One tap opens the task with priority, location, and instructions. No WhatsApp, no confusion.",
      },
      {
        icon: Camera,
        title: "Photo evidence on completion",
        useCase: "Sarah cleans the room, photographs it, adds a note \"extra towels stocked\", and submits. The timestamp and photo are locked — she is protected if a guest disputes the clean.",
      },
      {
        icon: Clock,
        title: "Due time visibility",
        useCase: "The task list shows Overdue (red), Due Soon (amber), and Completed (green). Sarah knows exactly what to prioritise without a supervisor walking the floor.",
      },
      {
        icon: CheckCircle2,
        title: "Rejection feedback loop",
        useCase: "Supervisor rejects Room 304 — \"photo too dark, redo bathroom\". Sarah gets a push notification with the reason and resubmits in 5 minutes. No phone calls, no misunderstandings.",
      },
    ],
    outcome: "Sarah completes 100% of her tasks on time. Her SLA score is visible on her profile. She builds a track record that management can see.",
    stat: "↑ 40% fewer missed tasks in first month",
  },
  {
    role: "Supervisor",
    color: "emerald" as const,
    icon: Shield,
    persona: "Michael Lim — Floor Supervisor, 3 properties, 18 staff",
    painPoint: "\"I manage 18 housekeepers across 3 floors. I physically walk every room to check. If I miss one, the GM calls me. I can't be everywhere.\"",
    headline: "Manage 18 staff from one screen",
    features: [
      {
        icon: ClipboardCheck,
        title: "One-tap approval queue",
        useCase: "Michael opens his review queue — 12 completed tasks with photos. He approves 10 with one tap each. Two photos are too dark — he rejects with quick-select reason \"Photo unclear\" and both staff are notified instantly.",
      },
      {
        icon: MapPin,
        title: "Overdue task radar",
        useCase: "It is 2pm. Room 508 has been pending since 10am. TaskMe flags it as overdue and surfaces it at the top of Michael's dashboard. He reassigns it to an available housekeeper — 2 taps.",
      },
      {
        icon: ThumbsUp,
        title: "Approve / Reject / Escalate",
        useCase: "A maintenance task has been overdue for 6 hours and the assigned staff member is not responding. Michael escalates to David Wong (Manager) with one tap — the escalation includes the full task history and timestamps.",
      },
      {
        icon: TrendingUp,
        title: "Team performance cards",
        useCase: "Michael checks his team tab — Sarah has an 94% on-time rate this week. Two new staff members are at 61% and flagged at-risk. He knows who to coach before the GM asks.",
      },
    ],
    outcome: "Michael stops physically walking floors to verify work. He reviews 80 task submissions per day in under 20 minutes from any device.",
    stat: "↓ 70% reduction in supervisor floor-check time",
  },
  {
    role: "Manager",
    color: "violet" as const,
    icon: BarChart3,
    persona: "David Wong — Operations Manager, Far East Properties Group",
    painPoint: "\"I find out about problems when a guest complains or a TripAdvisor review appears. By then it is too late. I have no real-time view of what is happening on the floors.\"",
    headline: "Know before the guest complains",
    features: [
      {
        icon: Zap,
        title: "Live operations dashboard",
        useCase: "David opens TaskMe at 9am with his coffee. The dashboard shows: 3 overdue tasks, 1 critical escalation in the F&B kitchen, completion rate 87% (down from 94% last week). He acts before the first guest interaction of the day.",
      },
      {
        icon: AlertTriangle,
        title: "Automatic escalation alerts",
        useCase: "A kitchen cleaning task has been ignored for 6 hours. The escalation engine automatically flags it as CRITICAL and pushes an alert to David's phone at 7am — before service begins. Zero food safety risk reaches the floor.",
      },
      {
        icon: BarChart3,
        title: "Site performance comparison",
        useCase: "David manages 3 properties. The site table shows Tanjong Pagar at 91% completion, Chinatown at 78%. He identifies the underperforming site, clicks through to see which team members are dragging the numbers, and calls the supervisor.",
      },
      {
        icon: Download,
        title: "One-click compliance reports",
        useCase: "An MoH auditor asks for cleaning records from last month. David filters by site, date range, and status — clicks Export CSV. A full audit trail with timestamps, photos on record, and supervisor sign-offs is ready in 30 seconds.",
      },
    ],
    outcome: "David stops managing by walking around and starts managing by exception. He only gets involved when the system tells him something actually needs his attention.",
    stat: "↓ 60% fewer guest complaints in pilot hotels",
  },
];

/* ── Stats bar ── */
const stats = [
  { value: "3 roles", label: "Staff · Supervisor · Manager" },
  { value: "< 30s", label: "Task completion with photo" },
  { value: "3-tier", label: "Automatic escalation engine" },
  { value: "1 click", label: "Audit-ready CSV export" },
];

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

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 font-bold text-lg text-white">T</div>
            <span className="text-xl font-bold tracking-tight text-white">TaskMe</span>
          </div>
          <p className="hidden text-sm text-slate-400 sm:block">Compliance-Grade Task Management · Singapore</p>
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

      {/* ── HERO ── */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pb-16 sm:pt-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-400">
          <Star className="h-3.5 w-3.5" />
          Built for Singapore hospitality, facility management & aged care
        </div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Stop Managing Tasks
          <br />
          <span className="text-blue-400">on WhatsApp</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
          TaskMe gives every role — Staff, Supervisor, Manager — exactly what they need.
          Photo-verified completions, automatic escalation, and audit-ready reports. Out of the box.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-[15px] font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700"
          >
            Try Live Demo
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/20 px-6 text-[15px] font-bold text-slate-300 transition hover:bg-white/10"
          >
            See How It Works
          </button>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-white/10 bg-white/5">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-white/10 px-4 sm:grid-cols-4 sm:px-6">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center px-4 py-6 text-center">
              <span className="text-2xl font-extrabold text-white sm:text-3xl">{s.value}</span>
              <span className="mt-1 text-[12px] text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROLE FEATURES ── */}
      <section id="features-section" className="mx-auto max-w-6xl space-y-6 px-4 py-16 sm:space-y-8 sm:px-6 sm:py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">How TaskMe Works — Role by Role</h2>
          <p className="mt-3 text-slate-400">Every role has a different problem. TaskMe solves each one specifically.</p>
        </div>

        {roleFeatures.map((roleData, idx) => {
          const colors = colorMap[roleData.color];
          const RoleIcon = roleData.icon;
          const isReversed = idx % 2 === 1;

          return (
            <div
              key={roleData.role}
              className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm"
            >
              {/* Role header */}
              <div className={`flex flex-col gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8`}>
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${colors.accentBg} border`}>
                    <RoleIcon className={`h-7 w-7 ${colors.accent}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${colors.badge}`}>
                        {roleData.role}
                      </span>
                    </div>
                    <h3 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">{roleData.headline}</h3>
                    <p className="text-[13px] text-slate-500">{roleData.persona}</p>
                  </div>
                </div>
                <div className={`rounded-2xl border ${colors.accentBg} px-4 py-2.5 text-[13px] font-bold ${colors.accent}`}>
                  {roleData.stat}
                </div>
              </div>

              <div className={`flex flex-col gap-0 lg:flex-row ${isReversed ? "lg:flex-row-reverse" : ""}`}>
                {/* Pain point */}
                <div className="flex flex-col justify-center gap-4 border-b border-white/10 p-6 sm:p-8 lg:w-[38%] lg:border-b-0 lg:border-r lg:border-white/10">
                  <div>
                    <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-500">The Problem Today</p>
                    <blockquote className="border-l-2 border-slate-600 pl-4 text-[15px] italic leading-relaxed text-slate-400">
                      {roleData.painPoint}
                    </blockquote>
                  </div>
                  <div className={`rounded-2xl border ${colors.accentBg} p-4`}>
                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">The Outcome with TaskMe</p>
                    <p className="text-[13.5px] leading-relaxed text-slate-300">{roleData.outcome}</p>
                  </div>
                </div>

                {/* Features */}
                <div className="grid flex-1 grid-cols-1 gap-0 divide-y divide-white/5 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  {roleData.features.map((feature, fIdx) => {
                    const FIcon = feature.icon;
                    return (
                      <div
                        key={feature.title}
                        className={`p-5 sm:p-6 ${fIdx >= 2 ? "border-t border-white/5" : ""}`}
                      >
                        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${colors.accentBg} border`}>
                          <FIcon className={`h-4.5 w-4.5 ${colors.accent}`} />
                        </div>
                        <h4 className="mb-2 text-[14px] font-bold text-white">{feature.title}</h4>
                        <p className="text-[12.5px] leading-relaxed text-slate-400">{feature.useCase}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── HOW IT FLOWS ── */}
      <section className="border-y border-white/10 bg-white/[0.02] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">The Complete Accountability Chain</h2>
            <p className="mt-3 text-slate-400">From task creation to audit trail — every step is tracked, timestamped, and escalated automatically.</p>
          </div>
          <div className="relative flex flex-col items-center gap-0 sm:flex-row sm:items-start sm:justify-between">
            {/* Connector line */}
            <div className="absolute left-1/2 top-8 hidden h-0.5 w-[calc(100%-80px)] -translate-x-1/2 bg-gradient-to-r from-blue-500/30 via-emerald-500/30 to-violet-500/30 sm:block" />

            {[
              { step: "1", icon: FileText, label: "Task Created", sub: "Supervisor / Manager assigns task with priority, location, due time", color: "blue" },
              { step: "2", icon: Bell, label: "Staff Notified", sub: "Push notification to staff phone in under 1 second", color: "blue" },
              { step: "3", icon: Camera, label: "Photo Submitted", sub: "Staff completes task and uploads mandatory photo evidence", color: "blue" },
              { step: "4", icon: ClipboardCheck, label: "Supervisor Reviews", sub: "Approve, reject with reason, or escalate to manager", color: "emerald" },
              { step: "5", icon: AlertTriangle, label: "Auto-Escalation", sub: "Overdue 1h → flagged. 3h → escalated. 6h → CRITICAL alert", color: "emerald" },
              { step: "6", icon: CheckSquare, label: "Audit Trail", sub: "Full history: timestamps, photos, reviews, decisions — CSV export ready", color: "violet" },
            ].map((s) => {
              const SIcon = s.icon;
              const c = colorMap[s.color as keyof typeof colorMap];
              return (
                <div key={s.step} className="relative z-10 flex flex-row items-start gap-4 sm:w-[16%] sm:flex-col sm:items-center sm:text-center">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${c.accentBg}`}>
                    <SIcon className={`h-7 w-7 ${c.accent}`} />
                  </div>
                  <div>
                    <p className="text-[13px] font-extrabold text-white">{s.label}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── OBJECTION BUSTERS ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Questions We Hear Every Demo</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              q: "My staff aren't tech-savvy.",
              a: "The staff interface has 3 buttons. If they can use WhatsApp, they can use TaskMe. We designed it specifically for frontline workers — large touch targets, photo-first, minimal typing.",
              icon: PhoneCall,
            },
            {
              q: "We already use Deputy / ShiftCare.",
              a: "Keep using it for scheduling. TaskMe handles what happens after the shift starts — did the task actually get done, is there proof, and who is accountable? We sit alongside your scheduling tool.",
              icon: RefreshCw,
            },
            {
              q: "Is there a Chinese version?",
              a: "Yes. TaskMe ships with English and Simplified Chinese out of the box. Staff can switch language on their device. Supervisor and manager views are in English.",
              icon: CheckCircle2,
            },
            {
              q: "Where is the data hosted?",
              a: "Supabase infrastructure on AWS ap-southeast-1 — Singapore region. Data never leaves Singapore. We can provide a data processing agreement for PDPA compliance.",
              icon: Shield,
            },
            {
              q: "What does it cost?",
              a: "S$3–5 per staff member per month. A team of 30 costs S$90–150/month — less than one guest compensation payout or a single MoH compliance incident.",
              icon: TrendingUp,
            },
            {
              q: "We need it to connect to Opera PMS.",
              a: "Opera Cloud integration is on our Q4 2026 roadmap. Pilot partners get first access and direct input into the integration spec. In the meantime, setup takes under 10 minutes.",
              icon: Zap,
            },
          ].map((item) => {
            const QIcon = item.icon;
            return (
              <div key={item.q} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <QIcon className="h-4 w-4 text-slate-400" />
                  <p className="text-[13px] font-bold text-white">"{item.q}"</p>
                </div>
                <p className="text-[12.5px] leading-relaxed text-slate-400">{item.a}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── DEMO LOGIN CARDS ── */}
      <section id="demo-section" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Try the Live Demo</h2>
          <p className="mt-2 text-slate-400">Click any card to instantly log in as that role — no signup required</p>
        </div>

        {error && (
          <div className="mx-auto mb-6 max-w-md rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
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
                className={`relative overflow-hidden border-0 bg-white/5 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:bg-white/10 ${
                  isFeatured ? `ring-2 ${colors.ring} sm:col-span-2 lg:col-span-1` : ""
                }`}
              >
                {isFeatured && (
                  <div className="absolute right-0 top-0 rounded-bl-xl bg-violet-500 px-3 py-1 text-[11px] font-bold text-white">
                    RECOMMENDED
                  </div>
                )}
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.accentBg} border`}>
                      <user.icon className={`h-6 w-6 ${colors.accent}`} />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${colors.badge}`}>
                      {user.role}
                    </span>
                  </div>
                  <h3 className="text-[17px] font-bold text-white">{user.name}</h3>
                  <p className="text-sm text-slate-400">{user.title}</p>
                  <p className="mt-3 text-[13px] leading-relaxed text-slate-500">{user.description}</p>

                  <div className="mt-4 space-y-1.5 rounded-xl bg-black/20 px-3 py-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Email</span>
                      <span className="font-mono text-slate-300">{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Password</span>
                      <span className="font-mono text-slate-300">{DEMO_PASSWORD}</span>
                    </div>
                  </div>

                  <Button
                    className={`mt-5 h-11 w-full font-bold text-white ${colors.button} min-h-[44px] rounded-xl`}
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

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 font-bold text-white">T</div>
              <span className="font-bold text-white">TaskMe</span>
            </div>
            <p className="text-[12px] text-slate-500">
              Hospitality · Facility Management · Aged Care · NDIS
              &nbsp;·&nbsp; Singapore & APAC
            </p>
            <p className="text-[12px] text-slate-600">© {new Date().getFullYear()} TaskMe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
