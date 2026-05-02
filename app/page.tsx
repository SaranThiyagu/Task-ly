"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "./(auth)/login/actions";

const DEMO_PASSWORD = "Demo@1234";

const demoUsers = [
  {
    role: "Staff",
    name: "Sarah Tan",
    title: "Floor Housekeeper",
    email: "sarah.tan@cleanpro-demo.com",
    initials: "ST",
    avatarBg: "#d4edda",
    avatarColor: "#00a868",
    badgeBg: "rgba(0,208,132,0.1)",
    badgeColor: "#00a868",
    btnStyle: "bg-[#ece9e2] text-[#0a0a0f] hover:bg-[#e0dcd4]",
    description:
      "See how staff receive task assignments, submit photo evidence, and track their own SLA compliance score — all from a simple mobile-first view.",
  },
  {
    role: "Supervisor",
    name: "Michael Lim",
    title: "Floor Supervisor",
    email: "michael.lim@cleanpro-demo.com",
    initials: "ML",
    avatarBg: "#d4e6f1",
    avatarColor: "#3b6eff",
    badgeBg: "rgba(59,110,255,0.1)",
    badgeColor: "#3b6eff",
    btnStyle: "bg-[#0a0a0f] text-white hover:bg-[#1a1a24]",
    featured: true,
    description:
      "Review photo evidence, approve or reject with structured reasons, manage your team workload, and see real-time escalation alerts — without leaving your desk.",
  },
  {
    role: "Manager",
    name: "David Wong",
    title: "Operations Manager",
    email: "david.wong@cleanpro-demo.com",
    initials: "DW",
    avatarBg: "#f3d9fa",
    avatarColor: "#9c36b5",
    badgeBg: "rgba(156,54,181,0.1)",
    badgeColor: "#9c36b5",
    btnStyle: "bg-[#ece9e2] text-[#0a0a0f] hover:bg-[#e0dcd4]",
    description:
      "Executive KPIs, cross-site performance, escalation feed, 7-day trend charts, and one-click compliance reports. Everything that matters, in one view.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection observer for fade-up animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".landing-fade-up").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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
    <div className="landing-page min-h-screen overflow-x-hidden">
      {/* ── NAV ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 h-16 bg-[#f5f4f0]/88 backdrop-blur-xl border-b border-black/10 transition-shadow ${
          scrolled ? "shadow-[0_2px_20px_rgba(0,0,0,0.08)]" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0a0a0f] rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <rect x="2" y="2" width="5" height="5" rx="1.5" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1.5" fill="white" opacity="0.5" />
              <rect x="2" y="9" width="5" height="5" rx="1.5" fill="white" opacity="0.5" />
              <rect x="9" y="9" width="5" height="5" rx="1.5" fill="white" />
            </svg>
          </div>
          <span className="font-syne font-extrabold text-xl tracking-tight text-[#0a0a0f]">
            TaskMe
          </span>
        </div>
        <div className="hidden md:flex gap-8">
          <a href="#how-it-works" className="text-sm text-[#6b6b80] hover:text-[#0a0a0f] transition-colors">
            How it works
          </a>
          <a href="#features" className="text-sm text-[#6b6b80] hover:text-[#0a0a0f] transition-colors">
            Features
          </a>
          <a href="#industries" className="text-sm text-[#6b6b80] hover:text-[#0a0a0f] transition-colors">
            Industries
          </a>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="bg-[#0a0a0f] text-white text-[13px] font-medium px-5 py-2.5 rounded-full hover:bg-[#1a1a24] transition-all hover:-translate-y-0.5"
        >
          Try Live Demo →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(10,10,15,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(10,10,15,0.04) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Blobs */}
        <div className="landing-blob-a absolute top-[10%] left-[-8%] w-[600px] h-[400px] rounded-full bg-[rgba(0,208,132,0.12)] blur-[80px] pointer-events-none" />
        <div className="landing-blob-b absolute top-[5%] right-[-6%] w-[500px] h-[500px] rounded-full bg-[rgba(59,110,255,0.08)] blur-[80px] pointer-events-none" />
        <div className="landing-blob-c absolute bottom-[15%] left-[30%] w-[400px] h-[300px] rounded-full bg-[rgba(245,200,66,0.10)] blur-[80px] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 max-w-[860px]">
          <div className="inline-flex items-center gap-1.5 bg-white border border-black/10 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#6b6b80] mb-8 shadow-sm">
            <span className="landing-pulse-dot w-1.5 h-1.5 rounded-full bg-[#00d084]" />
            Built for Singapore hospitality, FM &amp; aged care
          </div>

          <h1 className="font-syne font-extrabold text-[clamp(44px,7vw,84px)] leading-[1.0] tracking-[-0.04em] text-[#0a0a0f] mb-2">
            Stop Managing Tasks
            <br />
            <span className="landing-strike text-[#9898aa]">on WhatsApp</span>
            <br />
            <span className="text-[#00a868]">on TaskMe</span>
          </h1>

          <p className="text-lg font-light text-[#6b6b80] leading-relaxed max-w-[560px] mx-auto mt-6 mb-10">
            Give every role — Staff, Supervisor, Manager — exactly what they need.
            Photo-verified completions, automatic escalation, and MOM audit-ready reports.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="#demo"
              className="inline-flex items-center gap-2 bg-[#0a0a0f] text-white text-[15px] font-medium px-7 py-3.5 rounded-full shadow-[0_4px_20px_rgba(10,10,15,0.18)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(10,10,15,0.22)] transition-all"
            >
              Try Live Demo <span className="text-lg">→</span>
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-[#0a0a0f] text-[15px] px-6 py-3.5 rounded-full border-[1.5px] border-black/[0.18] hover:bg-black/5 transition-colors"
            >
              ▷ See how it works
            </a>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 mt-16 bg-white border border-black/10 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)] max-w-[700px] w-full mx-auto grid grid-cols-2 sm:grid-cols-4">
          {[
            { val: "3", color: "text-[#00a868]", label: "Roles — Staff, Supervisor, Manager" },
            { val: "<30s", color: "text-[#0a0a0f]", label: "Task creation & assignment" },
            { val: "3-tier", color: "text-[#3b6eff]", label: "Automatic escalation engine" },
            { val: "1-click", color: "text-[#ff5c35]", label: "Audit-ready CSV export" },
          ].map((s, i) => (
            <div key={i} className="py-6 px-4 text-center border-r border-black/10 last:border-r-0">
              <div className={`font-syne text-[28px] font-bold tracking-tight leading-none mb-1 ${s.color}`}>
                {s.val}
              </div>
              <div className="text-[12px] text-[#9898aa]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PAIN BANNER ── */}
      <section className="bg-[#0a0a0f] py-0">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-12 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/40 mb-4">The problem</p>
            <h2 className="font-syne text-[clamp(28px,4vw,40px)] font-bold tracking-tight text-white leading-[1.1] mb-6">
              Your operations run on{" "}
              <span className="text-[#00d084]">WhatsApp</span> — and that&apos;s costing you.
            </h2>
            <p className="text-base text-white/55 leading-relaxed font-light">
              Tasks get lost. Supervisors discover overdue work hours later. Compliance audits mean
              scrambling through chat history. TaskMe replaces all of it with a structured
              accountability chain.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { icon: "❌", color: "bg-[rgba(255,92,53,0.15)]", title: "30–40% of verbal tasks are forgotten", desc: "No digital record, no acknowledgement, no proof. Tasks disappear in group chats." },
              { icon: "⏱", color: "bg-[rgba(255,92,53,0.15)]", title: "Delays discovered 4–8 hours later", desc: "Supervisors find overdue tasks during site walks — not in real time when it matters." },
              { icon: "📋", color: "bg-[rgba(255,92,53,0.15)]", title: "2–3 hours weekly on manual reports", desc: "Supervisors compiling spreadsheets from memory instead of managing their team." },
              { icon: "✅", color: "bg-[rgba(0,208,132,0.15)]", title: "TaskMe solves all three — from day one", desc: "100% task capture, 1-hour automatic escalation, one-click CSV export. No training required." },
            ].map((item, i) => (
              <div key={i} className="flex gap-3.5 items-start bg-white/[0.04] border border-white/[0.08] rounded-[10px] p-4 hover:bg-white/[0.07] transition-colors">
                <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center text-base shrink-0`}>
                  {item.icon}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white mb-0.5">{item.title}</h4>
                  <p className="text-[13px] text-white/45 font-light leading-snug">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — CHAIN ── */}
      <section id="how-it-works" className="bg-white border-y border-black/10 py-20 sm:py-24">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-12">
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#9898aa] mb-3">
            The accountability chain
          </p>
          <h2 className="font-syne text-[clamp(32px,4vw,52px)] font-bold tracking-tight text-[#0a0a0f] leading-[1.05] mb-14">
            From task creation to audit trail
            <br />— every step tracked automatically
          </h2>

          <div className="relative grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-0">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-7 left-10 right-10 h-px bg-gradient-to-r from-[#00d084]/25 via-[#3b6eff]/25 to-[#ff5c35]/25" />
            {[
              { icon: "📋", title: "Task Created", desc: "Supervisor assigns with priority, due date & site location", active: true },
              { icon: "🔔", title: "Staff Notified", desc: "Instant push notification to staff device, even when app is closed", active: false },
              { icon: "📸", title: "Photo Submitted", desc: "Staff completes with mandatory timestamped photo evidence", active: false },
              { icon: "✅", title: "Supervisor Reviews", desc: "Approve, reject with reason, reassign, or escalate", active: false },
              { icon: "📊", title: "Audit Trail", desc: "Every action timestamped, attributed, exportable for compliance", active: false },
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-row sm:flex-col items-start sm:items-center gap-4 sm:text-center">
                <div
                  className={`w-14 h-14 rounded-full border flex items-center justify-center text-xl shrink-0 ${
                    step.active
                      ? "bg-[#0a0a0f] border-[#0a0a0f] shadow-[0_0_0_6px_white,0_0_0_7px_rgba(0,208,132,0.3)]"
                      : "bg-white border-black/10 shadow-[0_0_0_6px_white]"
                  }`}
                >
                  {step.icon}
                </div>
                <div>
                  <h4 className="text-[13px] font-medium text-[#0a0a0f] mb-1">{step.title}</h4>
                  <p className="text-[12px] text-[#9898aa] font-light leading-snug">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES SECTION ── */}
      <section className="max-w-[1200px] mx-auto px-6 sm:px-12 py-20 sm:py-24">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#9898aa] mb-3">
          Role-based design
        </p>
        <h2 className="font-syne text-[clamp(32px,4vw,52px)] font-bold tracking-tight text-[#0a0a0f] leading-[1.05] mb-4">
          Every role sees exactly
          <br />what they need
        </h2>
        <p className="text-[17px] font-light text-[#6b6b80] leading-relaxed max-w-[520px]">
          No noise, no overload. Each dashboard is purpose-built for the decisions that role makes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14">
          {/* Staff card */}
          <div className="landing-fade-up bg-white border border-black/10 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all">
            <span className="inline-block text-[11px] font-semibold tracking-[0.08em] uppercase px-2.5 py-1 rounded-full bg-[rgba(0,208,132,0.1)] text-[#00a868] mb-5">Staff</span>
            <h3 className="font-syne text-[22px] font-bold tracking-tight mb-2.5">Every shift, crystal clear</h3>
            <p className="text-sm text-[#6b6b80] font-light leading-relaxed">Staff see only their tasks — sorted by priority with one-tap completion and photo upload. No training required.</p>
            <div className="mt-6 flex flex-col gap-2.5">
              {["Prioritised task list — overdue first", "Photo-verified 3-step completion", "Real-time rejection & feedback loop", "Own SLA compliance score"].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-[13px] text-[#6b6b80]">
                  <span className="w-5 h-5 rounded-md bg-[rgba(0,208,132,0.1)] text-[#00a868] flex items-center justify-center text-[11px] shrink-0">✓</span>
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-7 pt-5 border-t border-black/10 flex items-baseline gap-1.5">
              <span className="font-syne text-[28px] font-bold tracking-tight text-[#00a868]">&lt;15min</span>
              <span className="text-[12px] text-[#9898aa] font-light">average onboarding time for new staff</span>
            </div>
          </div>

          {/* Supervisor card — featured */}
          <div className="landing-fade-up bg-[#0a0a0f] border border-[#0a0a0f] rounded-2xl p-8 text-white relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all">
            <div className="absolute -bottom-8 -right-8 w-[120px] h-[120px] rounded-full bg-[rgba(0,208,132,0.08)] pointer-events-none" />
            <span className="inline-block text-[11px] font-semibold tracking-[0.08em] uppercase px-2.5 py-1 rounded-full bg-[rgba(59,110,255,0.1)] text-[#3b6eff] mb-5">Supervisor</span>
            <h3 className="font-syne text-[22px] font-bold tracking-tight mb-2.5">Manage 18 staff from one screen</h3>
            <p className="text-sm text-white/55 font-light leading-relaxed">Pending reviews, overdue alerts, real-time activity feed, and AI-powered insight cards — all visible without leaving the dashboard.</p>
            <div className="mt-6 flex flex-col gap-2.5">
              {["One-tap approve / reject with reasons", "Overdue task radar — auto-flagged", "Per-staff performance heuristics", "Team workload balancing view"].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-[13px] text-white/65">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-white/70 flex items-center justify-center text-[11px] shrink-0">✓</span>
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-7 pt-5 border-t border-white/[0.12] flex items-baseline gap-1.5">
              <span className="font-syne text-[28px] font-bold tracking-tight text-[#00d084]">70%</span>
              <span className="text-[12px] text-white/40 font-light">reduction in supervisor floor check time</span>
            </div>
          </div>

          {/* Manager card */}
          <div className="landing-fade-up bg-white border border-black/10 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all">
            <span className="inline-block text-[11px] font-semibold tracking-[0.08em] uppercase px-2.5 py-1 rounded-full bg-[rgba(156,54,181,0.1)] text-[#9c36b5] mb-5">Manager</span>
            <h3 className="font-syne text-[22px] font-bold tracking-tight mb-2.5">Know before the guest complains</h3>
            <p className="text-sm text-[#6b6b80] font-light leading-relaxed">Executive KPIs, escalation feed, site-by-site breakdown, and 7-day trend charts. Resolve critical issues directly from the dashboard.</p>
            <div className="mt-6 flex flex-col gap-2.5">
              {["Live operations alert banner", "Cross-site performance table", "One-click compliance reports", "Top performers & at-risk spotlight"].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-[13px] text-[#6b6b80]">
                  <span className="w-5 h-5 rounded-md bg-[rgba(0,208,132,0.1)] text-[#00a868] flex items-center justify-center text-[11px] shrink-0">✓</span>
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-7 pt-5 border-t border-black/10 flex items-baseline gap-1.5">
              <span className="font-syne text-[28px] font-bold tracking-tight text-[#00a868]">40%</span>
              <span className="text-[12px] text-[#9898aa] font-light">fewer guest complaints in pilot hotels</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section id="features" className="max-w-[1200px] mx-auto px-6 sm:px-12 pb-20 sm:pb-24">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#9898aa] mb-3">
          Core features
        </p>
        <h2 className="font-syne text-[clamp(32px,4vw,52px)] font-bold tracking-tight text-[#0a0a0f] leading-[1.05] mb-14">
          Built for field operations,
          <br />not project management
        </h2>

        <div className="grid grid-cols-12 gap-3">
          {/* Escalation engine */}
          <div className="landing-fade-up col-span-12 md:col-span-5 bg-white border border-black/10 rounded-2xl p-7 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition-all">
            <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-[rgba(255,92,53,0.1)] text-[#ff5c35] mb-4">Escalation engine</span>
            <h3 className="font-syne text-xl font-bold tracking-tight text-[#0a0a0f] mb-2">Automatic 3-tier escalation</h3>
            <p className="text-[13px] text-[#6b6b80] font-light leading-relaxed">Zero human effort required. The engine detects delays and graduated response kicks in automatically.</p>
            <div className="mt-5 flex flex-col gap-0">
              {[
                { time: "+1h", color: "#ff5c35", bg: "rgba(255,92,53,0.04)", text: "Staff notified — \"Task Overdue ⚠️\"", tier: "Tier 1", tierBg: "rgba(255,92,53,0.1)" },
                { time: "+3h", color: "#3b6eff", bg: "rgba(59,110,255,0.04)", text: "Manager escalation created & notified", tier: "Tier 2", tierBg: "rgba(59,110,255,0.1)" },
                { time: "+6h", color: "#c0392b", bg: "rgba(255,92,53,0.08)", text: "Priority → CRITICAL. Both alerted", tier: "Tier 3", tierBg: "rgba(192,57,43,0.12)" },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: row.bg }}>
                  <span className="font-syne text-[13px] font-bold tracking-tight min-w-[44px] text-right" style={{ color: row.color }}>{row.time}</span>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                  <span className="text-[12px] text-[#6b6b80] font-light flex-1">{row.text}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto" style={{ background: row.tierBg, color: row.color }}>{row.tier}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Photo evidence */}
          <div className="landing-fade-up col-span-12 md:col-span-7 bg-white border border-black/10 rounded-2xl p-7 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition-all">
            <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-[rgba(0,208,132,0.1)] text-[#00a868] mb-4">Photo verification</span>
            <h3 className="font-syne text-xl font-bold tracking-tight text-[#0a0a0f] mb-2">Irrefutable proof of work</h3>
            <p className="text-[13px] text-[#6b6b80] font-light leading-relaxed">Every task completion requires timestamped photo evidence — before/after shots supported. An immutable audit trail for every MOM or client inspection.</p>
            <div className="mt-5 bg-[#ece9e2] rounded-[10px] p-4 flex flex-col gap-2">
              {[
                { emoji: "🛏", bg: "#d4edda", name: "Room 412 — Turnover complete", meta: "Sarah T. · Today 09:42 AM", status: "Approved", statusClass: "bg-[rgba(0,208,132,0.12)] text-[#00a868]" },
                { emoji: "🧹", bg: "#d4e6f1", name: "Lobby deep clean — B1 level", meta: "Michael L. · Today 10:15 AM", status: "In Review", statusClass: "bg-[rgba(59,110,255,0.1)] text-[#3b6eff]" },
                { emoji: "🔧", bg: "#fef3cd", name: "HVAC filter inspection", meta: "David W. · Today 11:00 AM", status: "Approved", statusClass: "bg-[rgba(0,208,132,0.12)] text-[#00a868]" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-[52px] h-[52px] rounded-lg flex items-center justify-center text-[22px] shrink-0" style={{ background: item.bg }}>{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[12px] font-medium text-[#0a0a0f] mb-0.5 truncate">{item.name}</h5>
                    <p className="text-[11px] text-[#9898aa]">{item.meta}</p>
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${item.statusClass}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard mock */}
          <div className="landing-fade-up col-span-12 md:col-span-8 bg-white border border-black/10 rounded-2xl p-7 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition-all">
            <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-[rgba(59,110,255,0.1)] text-[#3b6eff] mb-4">Manager dashboard</span>
            <h3 className="font-syne text-xl font-bold tracking-tight text-[#0a0a0f] mb-2">Live operations overview</h3>
            <p className="text-[13px] text-[#6b6b80] font-light leading-relaxed">Executive KPIs, site-by-site risk breakdown, and 7-day trend charts. Real-time WebSocket updates — no refresh needed.</p>
            <div className="mt-5 bg-[#0a0a0f] rounded-[10px] p-4">
              <div className="flex gap-2 mb-3">
                {[
                  { val: "142", label: "Tasks today", color: "#fff" },
                  { val: "89%", label: "Completion", color: "#00d084" },
                  { val: "7", label: "Overdue", color: "#ff5c35" },
                  { val: "2", label: "Escalations", color: "#3b6eff" },
                ].map((kpi, i) => (
                  <div key={i} className="flex-1 bg-white/[0.06] rounded-lg p-2.5 text-center">
                    <div className="font-syne text-lg font-bold tracking-tight" style={{ color: kpi.color }}>{kpi.val}</div>
                    <div className="text-[10px] text-white/35 mt-0.5">{kpi.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: "Site A", width: "92%", color: "#00d084" },
                  { label: "Site B", width: "74%", color: "#3b6eff" },
                  { label: "Site C", width: "61%", color: "#ff5c35" },
                  { label: "Site D", width: "88%", color: "#00d084" },
                ].map((bar, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 w-[52px] text-right shrink-0">{bar.label}</span>
                    <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: bar.width, background: bar.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="landing-fade-up col-span-12 md:col-span-4 bg-white border border-black/10 rounded-2xl p-7 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition-all">
            <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-[rgba(0,208,132,0.1)] text-[#00a868] mb-4">Push notifications</span>
            <h3 className="font-syne text-xl font-bold tracking-tight text-[#0a0a0f] mb-2">Instant alerts, even offline</h3>
            <p className="text-[13px] text-[#6b6b80] font-light leading-relaxed">Web Push VAPID — delivered to the lock screen even when TaskMe is closed.</p>
            <div className="mt-5 flex flex-col gap-2">
              {[
                { emoji: "📋", bg: "#d4edda", title: "New Task Assigned", desc: "Lobby cleaning — due in 2h", time: "Now", dot: "#00d084" },
                { emoji: "⚠️", bg: "#fef3cd", title: "Task Escalated 🔴", desc: "Pool deck inspection — 3h overdue", time: "12m ago", dot: "#ff5c35" },
                { emoji: "✅", bg: "#d4e6f1", title: "Evidence Submitted", desc: "Room 812 — Sarah awaits review", time: "34m ago", dot: null },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-[#f5f4f0] rounded-[10px] p-3 border border-black/10">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: n.bg }}>{n.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[12px] font-medium text-[#0a0a0f] mb-0.5">{n.title}</h5>
                    <p className="text-[11px] text-[#9898aa]">{n.desc}</p>
                  </div>
                  <span className="text-[10px] text-[#9898aa] whitespace-nowrap">{n.time}</span>
                  {n.dot && <div className="w-1.5 h-1.5 rounded-full self-center shrink-0" style={{ background: n.dot }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Bilingual */}
          <div className="landing-fade-up col-span-12 sm:col-span-6 md:col-span-4 bg-white border border-black/10 rounded-2xl p-7 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition-all">
            <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-[rgba(245,200,66,0.15)] text-[#b8901a] mb-4">Localisation</span>
            <h3 className="font-syne text-xl font-bold tracking-tight text-[#0a0a0f] mb-2">English + 中文<br />built in</h3>
            <p className="text-[13px] text-[#6b6b80] font-light leading-relaxed">The only task management platform with English–Mandarin bilingual UI designed specifically for Singapore&apos;s FM and hospitality workforce.</p>
            <div className="mt-5 flex gap-2">
              <div className="flex-1 bg-[#ece9e2] rounded-lg p-3 text-center">
                <div className="text-[11px] text-[#9898aa] mb-1">English</div>
                <div className="text-[13px] font-medium text-[#0a0a0f]">Task Complete ✓</div>
              </div>
              <div className="flex-1 bg-[#ece9e2] rounded-lg p-3 text-center">
                <div className="text-[11px] text-[#9898aa] mb-1">中文</div>
                <div className="text-[13px] font-medium text-[#0a0a0f]">任务完成 ✓</div>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="landing-fade-up col-span-12 sm:col-span-6 md:col-span-4 bg-white border border-black/10 rounded-2xl p-7 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition-all">
            <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-[rgba(59,110,255,0.1)] text-[#3b6eff] mb-4">Compliance</span>
            <h3 className="font-syne text-xl font-bold tracking-tight text-[#0a0a0f] mb-2">MOM &amp; PDPA ready</h3>
            <p className="text-[13px] text-[#6b6b80] font-light leading-relaxed">Row-level security at the database layer. Every action timestamped and attributed. CSV export in minutes for any audit.</p>
            <div className="mt-5 flex flex-col gap-1.5">
              {["Row-Level Security (Supabase)", "Immutable timestamped audit trail", "PDPA Data Processing Agreement", "One-click evidence log export"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-[#6b6b80]">
                  <span className="text-[#00a868]">✓</span> {item}
                </div>
              ))}
            </div>
          </div>

          {/* Realtime */}
          <div className="landing-fade-up col-span-12 sm:col-span-12 md:col-span-4 bg-white border border-black/10 rounded-2xl p-7 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition-all">
            <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-[rgba(0,208,132,0.1)] text-[#00a868] mb-4">Realtime</span>
            <h3 className="font-syne text-xl font-bold tracking-tight text-[#0a0a0f] mb-2">Live updates via WebSocket</h3>
            <p className="text-[13px] text-[#6b6b80] font-light leading-relaxed">Supabase Realtime channels keep every dashboard in sync. See task completions, reviews, and escalations appear instantly — no page refresh.</p>
            <div className="mt-5 flex flex-col gap-1.5">
              {["Task status changes propagate in <1s", "Per-org channel isolation", "Works on 3G/4G mobile connections", "Automatic reconnection & sync"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-[#6b6b80]">
                  <span className="text-[#00a868]">✓</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ── */}
      <section id="industries" className="max-w-[1200px] mx-auto px-6 sm:px-12 pb-20 sm:pb-24">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#9898aa] mb-3">
          Industries
        </p>
        <h2 className="font-syne text-[clamp(32px,4vw,52px)] font-bold tracking-tight text-[#0a0a0f] leading-[1.05] mb-14">
          Built for Singapore&apos;s
          <br />most demanding operations
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: "🏨", title: "Hospitality", desc: "Hotels, resorts, serviced apartments", active: true },
            { icon: "🏢", title: "Facility Management", desc: "Commercial, retail, mixed-use", active: false },
            { icon: "🏥", title: "Aged Care", desc: "Nursing homes, assisted living", active: false },
            { icon: "🛍", title: "Retail & Malls", desc: "Multi-site, CapitaLand, Frasers", active: false },
            { icon: "🔨", title: "Construction", desc: "BCA safety inspections, WSHA", active: false },
          ].map((ind, i) => (
            <div
              key={i}
              className={`border rounded-[10px] px-5 py-6 text-center cursor-pointer transition-all hover:bg-[#0a0a0f] hover:border-[#0a0a0f] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(10,10,15,0.15)] group ${
                ind.active
                  ? "bg-[#0a0a0f] border-[#0a0a0f] -translate-y-0.5 shadow-[0_8px_24px_rgba(10,10,15,0.15)]"
                  : "bg-white border-black/10"
              }`}
            >
              <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center text-xl mx-auto mb-3 transition-colors ${
                ind.active ? "bg-white/10" : "bg-[#ece9e2] group-hover:bg-white/10"
              }`}>
                {ind.icon}
              </div>
              <h4 className={`text-[13px] font-medium mb-1 transition-colors ${
                ind.active ? "text-white" : "text-[#0a0a0f] group-hover:text-white"
              }`}>{ind.title}</h4>
              <p className={`text-[11px] font-light leading-snug transition-colors ${
                ind.active ? "text-white/50" : "text-[#9898aa] group-hover:text-white/50"
              }`}>{ind.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROOF BANNER ── */}
      <section className="bg-[#0a0a0f] py-0">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-12 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/35 mb-4">What customers say</p>
            <blockquote className="font-syne text-[clamp(22px,3vw,28px)] font-semibold tracking-tight text-white leading-[1.25] mb-6">
              &ldquo;We went from <span className="text-[#00d084]">4 hours</span> of manual reporting every week to <span className="text-[#00d084]">5 minutes</span>. The escalation alerts alone caught three issues before the guest even noticed.&rdquo;
            </blockquote>
            <p className="text-[13px] text-white/40">— Operations Manager, 5-star hotel, Orchard Road</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { val: "95%", desc: "Faster escalation response — from hours to minutes" },
              { val: "90%", desc: "Reduction in weekly supervisor reporting time" },
              { val: "100%", desc: "Task capture — vs 60% with verbal/WhatsApp" },
              { val: "40%", desc: "Fewer guest complaints in 30-day pilots" },
            ].map((m, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-[10px] p-6">
                <div className="font-syne text-4xl font-bold tracking-tight text-[#00d084] leading-none mb-1.5">{m.val}</div>
                <div className="text-[13px] text-white/45 font-light leading-snug">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO SECTION ── */}
      <section id="demo" className="max-w-[1200px] mx-auto px-6 sm:px-12 pb-20 sm:pb-24">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#9898aa] mb-3">Try it now</p>
        <h2 className="font-syne text-[clamp(32px,4vw,52px)] font-bold tracking-tight text-[#0a0a0f] leading-[1.05] mb-4">
          Click to log in as any role
          <br />— no signup required
        </h2>
        <p className="text-[17px] font-light text-[#6b6b80] leading-relaxed max-w-[520px] mb-14">
          Experience the exact dashboard each role sees. Real data, real workflows.
        </p>

        {error && (
          <div className="max-w-md mx-auto mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {demoUsers.map((user) => {
            const isLoading = loadingEmail === user.email;
            return (
              <div
                key={user.email}
                className={`bg-white border rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)] transition-all ${
                  user.featured ? "border-[#0a0a0f] shadow-[0_4px_20px_rgba(10,10,15,0.10)]" : "border-black/10"
                }`}
                onClick={() => !loadingEmail && handleDemoLogin(user.email)}
              >
                <div className="p-5 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-lg font-semibold shrink-0"
                      style={{ background: user.avatarBg, color: user.avatarColor }}
                    >
                      {user.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#0a0a0f]">{user.name}</h4>
                      <p className="text-[12px] text-[#9898aa]">{user.title}</p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold tracking-[0.06em] uppercase px-2.5 py-1 rounded-full"
                    style={{ background: user.badgeBg, color: user.badgeColor }}
                  >
                    {user.role}
                  </span>
                </div>
                <div className="px-5 pb-4">
                  <p className="text-[13px] text-[#6b6b80] font-light leading-relaxed">{user.description}</p>
                </div>
                <div className="px-5 pb-5">
                  <button
                    disabled={loadingEmail !== null}
                    className={`w-full py-2.5 rounded-full text-[13px] font-medium transition-all disabled:opacity-60 ${user.btnStyle}`}
                  >
                    {isLoading ? "Signing in…" : `Try ${user.role} View →`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <div className="px-6 sm:px-12 pb-20 sm:pb-24">
        <div className="max-w-[700px] mx-auto bg-[#0a0a0f] rounded-3xl px-8 sm:px-12 py-16 sm:py-20 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-[rgba(0,208,132,0.08)] pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-[240px] h-[240px] rounded-full bg-[rgba(59,110,255,0.06)] pointer-events-none" />
          <h2 className="font-syne text-[clamp(28px,4vw,44px)] font-bold tracking-tight text-white mb-4 relative z-10">
            Replace WhatsApp<br />with accountability — today
          </h2>
          <p className="text-base text-white/50 font-light leading-relaxed mb-9 relative z-10">
            Free 30-day pilot. No credit card. No IT setup. Your team is running in under 15
            minutes. PSG grant covers up to 50% of cost.
          </p>
          <div className="flex gap-3 justify-center flex-wrap relative z-10">
            <a href="#demo" className="bg-white text-[#0a0a0f] text-sm font-medium px-7 py-3 rounded-full hover:bg-[#ece9e2] transition-colors">
              Start Free Pilot →
            </a>
            <a href="#how-it-works" className="text-white/70 text-sm border border-white/20 px-6 py-3 rounded-full hover:border-white/50 hover:text-white transition-all">
              See how it works
            </a>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-black/10 px-6 sm:px-12 py-10">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-syne font-extrabold text-lg tracking-tight text-[#0a0a0f]">TaskMe</span>
          <div className="flex gap-6">
            {["Privacy", "Terms", "PDPA", "Support", "Singapore"].map((link) => (
              <span key={link} className="text-[13px] text-[#9898aa] hover:text-[#0a0a0f] cursor-pointer transition-colors">
                {link}
              </span>
            ))}
          </div>
          <p className="text-[12px] text-[#9898aa]">© 2026 TaskMe · Compliance-Grade Task Management</p>
        </div>
      </footer>
    </div>
  );
}
