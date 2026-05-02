# TaskMe — Customer Pilot Program Plan

> **Prepared by:** Senior Product Analyst  
> **Date:** May 1, 2026  
> **Version:** 1.0  
> **Confidentiality:** Internal + Customer Leadership

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Pilot Objectives](#2-pilot-objectives)
3. [Pilot Structure: 7-Day vs 14-Day](#3-pilot-structure-7-day-vs-14-day)
4. [Recommendation](#4-recommendation)
5. [Pre-Pilot Preparation (T-minus 7 days)](#5-pre-pilot-preparation)
6. [Customer Onboarding Checklist](#6-customer-onboarding-checklist)
7. [Pilot Execution Plan](#7-pilot-execution-plan)
8. [Success Metrics & KPIs](#8-success-metrics--kpis)
9. [Monitoring & Support Plan](#9-monitoring--support-plan)
10. [Risk Register & Mitigation](#10-risk-register--mitigation)
11. [Data Collection Framework](#11-data-collection-framework)
12. [Go / No-Go Decision Framework](#12-go--no-go-decision-framework)
13. [Post-Pilot Conversion Strategy](#13-post-pilot-conversion-strategy)
14. [Pilot Cost & Resource Estimate](#14-pilot-cost--resource-estimate)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

TaskMe is a compliance-grade, real-time task management platform with **photo-verified completion**, **3-tier automatic escalation**, and **role-based dashboards** (Staff → Supervisor → Manager). It replaces fragmented communication (WhatsApp, paper checklists) with an auditable digital workflow.

This document outlines a structured pilot program to deploy TaskMe with a customer for **7 or 14 days**, validate product-market fit, measure operational impact, and generate a conversion decision with data.

---

## 2. Pilot Objectives

| # | Objective | Measurement |
|---|-----------|-------------|
| 1 | **Validate core workflow adoption** | % of assigned tasks completed through the app (not WhatsApp/verbal) |
| 2 | **Prove photo-evidence value** | # of tasks with photo evidence vs. baseline (paper/no evidence) |
| 3 | **Measure escalation effectiveness** | Time-to-detect overdue tasks (target: <1 hour vs. 4–8 hours baseline) |
| 4 | **Assess reporting time savings** | Time to produce weekly report (target: <5 min vs. 2–3 hours baseline) |
| 5 | **Measure user adoption & friction** | DAU/MAU ratio, task completion rate, drop-off points |
| 6 | **Gather qualitative feedback** | NPS score, user interviews, pain points |
| 7 | **Validate technical reliability** | Uptime, push notification delivery rate, real-time sync accuracy |

---

## 3. Pilot Structure: 7-Day vs 14-Day

### Option A: 7-Day Sprint Pilot

```
Day 1-2:  Onboarding & Training → Guided usage with support
Day 3-5:  Independent Operation → Team uses autonomously
Day 6:    Review & Feedback Collection
Day 7:    Wrap-up, Report Generation, Go/No-Go Discussion
```

| Pros | Cons |
|------|------|
| Lower commitment from customer | Insufficient data for trend analysis |
| Faster decision cycle | Users may still be learning on Day 3-5 |
| Less resource-intensive | Can't measure week-over-week improvement |
| Good for time-pressured buyers | Harder to prove ROI with small sample |

**Best for:** Small teams (5-10 staff), single-site, customers who want quick validation, budget-conscious evaluations.

---

### Option B: 14-Day Deep Pilot ⭐ RECOMMENDED

```
WEEK 1: Foundation
  Day 1-2:   Onboarding, training, and guided first tasks
  Day 3-5:   Supervised independent usage (support on standby)
  Day 6-7:   Week 1 checkpoint — review metrics, address friction

WEEK 2: Validation
  Day 8-10:  Full autonomous operation (minimal hand-holding)
  Day 11-12: Advanced features: reporting, export, escalation review
  Day 13:    Feedback collection (surveys, interviews, data pull)
  Day 14:    Executive presentation — results + conversion discussion
```

| Pros | Cons |
|------|------|
| Full adoption curve captured | Higher commitment from both sides |
| Week-over-week trend data | 2 weeks of resource allocation |
| Users surpass learning curve | Customer may lose momentum if poorly managed |
| Stronger ROI evidence | More complex logistics |
| Tests escalation engine thoroughly (multiple cycles) | — |

**Best for:** Teams of 10-50+, multi-site, enterprise evaluations, customers where ROI proof is critical for budget approval.

---

## 4. Recommendation

> **Default to 14-Day Pilot** unless the customer explicitly requests 7 days or has fewer than 8 team members.

**Rationale:**
- TaskMe's escalation engine runs on 30-minute cycles — a 14-day pilot generates **~672 escalation check cycles**, enough to demonstrate all 3 tiers (1hr, 3hr, 6hr overdue).
- Week 1 metrics are always depressed due to learning curve; Week 2 shows true adoption.
- Photo-evidence value is best demonstrated when reviewers accumulate a library of completion proofs.
- The 7-day trend chart on the Manager Dashboard only becomes meaningful with 14 days of data.

---

## 5. Pre-Pilot Preparation (T-minus 7 days)

### 5.1 Technical Readiness

| Task | Owner | Deadline | Status |
|------|-------|----------|--------|
| Provision dedicated Supabase project for customer | Engineering | T-7 | ☐ |
| Configure customer-specific environment variables | Engineering | T-7 | ☐ |
| Set up VAPID keys for push notifications | Engineering | T-7 | ☐ |
| Configure CRON_SECRET for escalation engine | Engineering | T-7 | ☐ |
| Deploy to customer-accessible URL (Netlify/Vercel) | Engineering | T-6 | ☐ |
| Run seed script with customer's actual team data | Engineering | T-5 | ☐ |
| Verify escalation cron job is firing every 30 min | Engineering | T-5 | ☐ |
| Test push notifications on target devices (iOS Safari, Android Chrome) | QA | T-4 | ☐ |
| Load test with expected concurrent users | QA | T-4 | ☐ |
| Verify RLS policies work correctly for each role | QA | T-4 | ☐ |
| Prepare rollback plan if critical issues arise | Engineering | T-3 | ☐ |
| Create customer admin account (Manager role) | Engineering | T-2 | ☐ |
| Create all staff & supervisor accounts | Engineering | T-2 | ☐ |

### 5.2 Customer Data Collection

Collect from customer before pilot begins:

```
REQUIRED:
├── Team roster (Name, Email, Role: Staff/Supervisor/Manager)
├── Site locations (building names, floor numbers, zones)
├── Typical task types (housekeeping, maintenance, inspection, etc.)
├── Shift schedules (when staff are active)
├── Reporting hierarchy (who reports to whom)
├── Current task volume (avg tasks/day, tasks/week)
└── Current pain points (what's failing today?)

OPTIONAL:
├── SLA requirements (completion time targets)
├── Compliance requirements (photo evidence needs)
├── Integration wishlist (PMS, POS, HR systems)
└── Language preferences per user (English, Chinese)
```

### 5.3 Environment Setup

```
PRODUCTION PILOT ENVIRONMENT:
├── URL: https://taskme-{customer-name}.netlify.app
├── Database: Dedicated Supabase project (data isolation)
├── Storage: Dedicated bucket for photo evidence
├── Cron: Escalation engine running every 30 min
├── Push: VAPID keys configured, service worker active
└── Monitoring: Error tracking enabled (Sentry recommended)
```

### 5.4 Disable Demo Features

Before customer access, remove/disable:

| Item | Action |
|------|--------|
| Auto-login API route (`/api/auto-login`) | Disable or remove — customers must use real credentials |
| Hardcoded demo credentials on login page | Replace with branded login (customer logo + standard email/password) |
| Seed demo data | Use customer's real team data, not CleanPro demo users |
| Auto-role switching in middleware | Disable — users should stay in their assigned role |

---

## 6. Customer Onboarding Checklist

### 6.1 Pre-Training Setup (Customer Side)

- [ ] Each user has a smartphone with Chrome (Android) or Safari (iOS)
- [ ] Wi-Fi or mobile data available at all work areas
- [ ] Camera permission enabled on devices
- [ ] Notification permission enabled on devices
- [ ] Add TaskMe to home screen (PWA install)

### 6.2 Training Plan

| Session | Audience | Duration | Format | Content |
|---------|----------|----------|--------|---------|
| **Session 1** | Manager + Supervisors | 45 min | In-person / Video call | System overview, Manager dashboard, reports, escalation flow, account management |
| **Session 2** | Supervisors only | 30 min | In-person / Video call | Task creation, assignment, review workflow (approve/reject/escalate/reassign), team monitoring |
| **Session 3** | All Staff | 20 min | In-person (group) | Login, view tasks, start task, complete with photo, check status, push notifications |
| **Session 4** | All users | 10 min | Self-serve (video) | PWA installation, push notification setup, language switching |

### 6.3 Training Materials to Prepare

- [ ] 2-minute "Staff Quick Start" video (login → view task → take photo → submit)
- [ ] 5-minute "Supervisor Guide" video (create task → review → approve/reject → export)
- [ ] 1-page printed quick-reference card (with QR code to app URL)
- [ ] FAQ document (top 10 expected questions)
- [ ] WhatsApp/Telegram support group for pilot duration

---

## 7. Pilot Execution Plan

### 14-Day Plan (Day-by-Day)

#### WEEK 1: Foundation & Adoption

| Day | Focus | Activities | Success Marker |
|-----|-------|------------|----------------|
| **Day 1** | 🎯 Launch | Training sessions (Manager → Supervisor → Staff). First 5 tasks created by supervisor and assigned. Staff complete 2-3 tasks with photo evidence. | All users logged in, PWA installed, ≥3 tasks completed with photos |
| **Day 2** | 🎯 Reinforce | Supervisor creates full day's task list. Staff work through tasks independently. On-site support available for questions. First review cycle (approve/reject). | ≥70% of assigned tasks attempted, supervisor completes first review cycle |
| **Day 3** | 📈 Independent | Reduced support presence. Team operates workflow independently. Monitor for drop-offs or confusion. | ≥80% task completion rate, no critical blockers reported |
| **Day 4** | 📈 Stress Test | Intentionally include a few tasks with tight deadlines to trigger escalation engine. Observe Tier 1 (1hr) and Tier 2 (3hr) escalations. | Escalation engine fires correctly, manager receives notification |
| **Day 5** | 📈 Reporting | Supervisor generates first weekly report. Manager reviews dashboard metrics. Export CSV for comparison with old method. | Report generated in <5 min, manager validates data accuracy |
| **Day 6** | 🔍 Week 1 Review | 15-min check-in with each role. Collect friction points. Quick survey (5 questions). Fix any technical issues. | NPS ≥ 6, top 3 friction points identified and addressed |
| **Day 7** | 🔄 Adjust | Implement quick fixes from Day 6 feedback. Adjust task templates if needed. Weekend/light day — reduced activity expected. | Fixes deployed, team informed of changes |

#### WEEK 2: Validation & Business Case

| Day | Focus | Activities | Success Marker |
|-----|-------|------------|----------------|
| **Day 8** | 🚀 Full Speed | No support on-site. Team fully autonomous. Monitor metrics remotely. | Task volume matches or exceeds pre-pilot baseline |
| **Day 9** | 🚀 Scale | If single-site: add more task types. If multi-site pilot: expand to 2nd site. | Task diversity increases, or 2nd site onboarded |
| **Day 10** | 🚀 Advanced | Train supervisor on advanced reporting filters (per-staff, per-site, date ranges). Manager explores escalation resolution workflow. | Supervisor exports filtered report independently |
| **Day 11** | 📊 Evidence | Compile photo evidence audit log. Demonstrate compliance value to manager. Show before/after comparison. | Manager acknowledges photo-evidence ROI |
| **Day 12** | 📊 Metrics | Pull all metrics. Prepare comparison dashboard (baseline vs. pilot). Draft executive summary. | Week 2 completion rate > Week 1 (adoption curve proven) |
| **Day 13** | 💬 Feedback | Structured interviews: 10 min each (2 staff, 1 supervisor, 1 manager). Digital survey (NPS + feature ranking). | All interviews completed, NPS ≥ 7 |
| **Day 14** | 🏁 Close | Executive presentation to customer decision-maker. Present ROI analysis. Discuss conversion terms. Agree on next steps. | Go/No-Go decision made or timeline agreed |

### 7-Day Compressed Plan

| Day | Focus | Activities |
|-----|-------|------------|
| **Day 1** | Launch + Training | All training in 1 session (90 min). First tasks created + completed. |
| **Day 2** | Reinforce | Full day operations. Support available. |
| **Day 3** | Independent | Team operates alone. Escalation test triggered. |
| **Day 4** | Advanced | Reporting + export. Manager dashboard review. |
| **Day 5** | Full Speed | Autonomous operation. Remote monitoring only. |
| **Day 6** | Feedback | Surveys + interviews. Metrics compilation. |
| **Day 7** | Close | Results presentation + conversion discussion. |

---

## 8. Success Metrics & KPIs

### 8.1 Primary KPIs (Must-Hit for Conversion)

| KPI | Target (7-Day) | Target (14-Day) | Measurement Source |
|-----|-----------------|------------------|--------------------|
| **Daily Active Usage Rate** | ≥70% of registered users | ≥80% of registered users | Supabase auth logs |
| **Task Completion Rate** | ≥75% | ≥85% | `tasks` table (completed/total) |
| **Photo Evidence Submission** | 100% of completions | 100% of completions | `task_evidence` table |
| **Escalation Detection Speed** | <1 hour (vs 4-8hr baseline) | <1 hour | `escalations` table timestamps |
| **Report Generation Time** | <5 minutes | <5 minutes | Observed during training |
| **NPS Score** | ≥ 6 | ≥ 7 | End-of-pilot survey |

### 8.2 Secondary KPIs (Nice-to-Have)

| KPI | Target | Measurement |
|-----|--------|-------------|
| Push notification opt-in rate | ≥60% | `push_subscriptions` table |
| Task rejection rate (quality signal) | <20% → <10% over time | `task_reviews` table |
| Average time to complete task | Decreasing trend | `tasks.completed_at - tasks.created_at` |
| Supervisor review turnaround | <2 hours | `task_reviews.reviewed_at - tasks.completed_at` |
| Week-over-week improvement (14-day only) | Week 2 > Week 1 on all primary KPIs | Comparative analysis |
| PWA installation rate | ≥80% | Observed / self-report |
| Support ticket volume | Decreasing trend | Support channel messages |

### 8.3 Anti-Metrics (Watch for Red Flags)

| Red Flag | Threshold | Action |
|----------|-----------|--------|
| User drop-off after Day 2 | >30% stop logging in | Investigate friction, provide 1:1 support |
| Bypass behavior | Staff complete tasks on WhatsApp instead of app | Re-train, simplify workflow |
| Photo skip attempts | Users complain about mandatory photos | Explain compliance value, consider optional for low-priority |
| Excessive rejections | >40% rejection rate | Review task clarity, train staff on expectations |
| Push notification fatigue | Users disable notifications | Reduce frequency, prioritize critical-only |

---

## 9. Monitoring & Support Plan

### 9.1 Daily Monitoring Dashboard

Track these **every morning** (takes ~10 min):

```
DAILY CHECK (9:00 AM):
├── 1. Active users yesterday          → Supabase auth dashboard
├── 2. Tasks created yesterday         → SELECT COUNT(*) FROM tasks WHERE created_at > yesterday
├── 3. Tasks completed yesterday       → SELECT COUNT(*) FROM tasks WHERE completed_at > yesterday
├── 4. Tasks overdue (current)         → SELECT COUNT(*) FROM tasks WHERE status = 'overdue'
├── 5. Escalations triggered           → SELECT COUNT(*) FROM escalations WHERE escalated_at > yesterday
├── 6. Push notifications sent         → Web Push delivery logs
├── 7. Errors/crashes                  → Sentry / Netlify function logs
└── 8. Support messages received       → WhatsApp/Telegram group
```

### 9.2 Support Tiers

| Tier | Channel | Response Time | Scope |
|------|---------|---------------|-------|
| **L1 — Self-serve** | FAQ doc + Quick-ref card | Instant | Login issues, how-to questions |
| **L2 — Chat support** | WhatsApp/Telegram group | <30 min (business hours) | Workflow questions, feature guidance |
| **L3 — Dedicated support** | Video call | <2 hours | Technical issues, data questions |
| **L4 — Engineering** | Internal escalation | <4 hours | Bugs, downtime, data loss |

### 9.3 Support Schedule

| Period | Support Level | Availability |
|--------|---------------|--------------|
| Day 1-2 | On-site / dedicated video | 8 AM – 6 PM |
| Day 3-5 | Chat + scheduled check-in (1x/day) | 9 AM – 5 PM |
| Day 6-7 | Chat only (reactive) | 9 AM – 5 PM |
| Day 8-14 | Chat only (reactive) | 9 AM – 5 PM |

---

## 10. Risk Register & Mitigation

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| R1 | **Poor Wi-Fi at customer site** | Medium | High | Pre-test connectivity at all work areas. Provide mobile hotspot as backup. PWA caches static assets. |
| R2 | **Staff resistance to photo requirement** | High | Medium | Frame as "protection, not surveillance" — evidence protects staff from false blame. Start with high-priority tasks only. |
| R3 | **Supervisor bottleneck on reviews** | Medium | Medium | Set expectation: review within 2 hours. Demonstrate batch-review workflow. |
| R4 | **Push notification failures** | Low | High | Test on all target devices before Day 1. Have fallback (manual check-in reminders). |
| R5 | **Data privacy concerns** | Medium | High | Provide data processing agreement (DPA). Explain RLS security model. Photos stored encrypted. Customer owns all data. |
| R6 | **Customer champion leaves/unavailable** | Low | Critical | Identify 2 champions (primary + backup). Ensure manager is engaged. |
| R7 | **System downtime during pilot** | Low | Critical | Use Netlify (99.99% SLA). Monitor uptime. Have status page ready. |
| R8 | **Insufficient task volume** | Medium | Medium | Pre-plan task list with supervisor. Minimum 10 tasks/day for meaningful data. |
| R9 | **Language barrier (non-English staff)** | Medium | Medium | Enable Chinese language for Mandarin-speaking staff. Provide translated quick-ref card. |
| R10 | **Competitor comparison during pilot** | Low | Medium | Differentiate on photo-evidence + auto-escalation (unique features). Provide comparison matrix. |

---

## 11. Data Collection Framework

### 11.1 Quantitative Data (Automated)

Extracted from Supabase at Day 7 and Day 14:

```sql
-- Daily task metrics
SELECT 
  DATE(created_at) as day,
  COUNT(*) as tasks_created,
  COUNT(*) FILTER (WHERE status IN ('completed','approved')) as tasks_completed,
  COUNT(*) FILTER (WHERE status = 'overdue') as tasks_overdue,
  ROUND(COUNT(*) FILTER (WHERE status IN ('completed','approved'))::numeric / 
        NULLIF(COUNT(*), 0) * 100, 1) as completion_rate
FROM tasks
GROUP BY DATE(created_at)
ORDER BY day;

-- Per-user adoption
SELECT 
  p.full_name,
  p.role,
  COUNT(DISTINCT DATE(t.completed_at)) as active_days,
  COUNT(t.id) as tasks_handled
FROM profiles p
LEFT JOIN tasks t ON t.assigned_to = p.id
GROUP BY p.full_name, p.role;

-- Escalation effectiveness
SELECT 
  e.reason,
  e.escalated_at,
  t.due_date,
  EXTRACT(EPOCH FROM (e.escalated_at - t.due_date))/3600 as hours_overdue_when_caught
FROM escalations e
JOIN tasks t ON t.id = e.task_id;

-- Evidence completeness
SELECT 
  COUNT(DISTINCT t.id) as completed_tasks,
  COUNT(DISTINCT te.task_id) as tasks_with_evidence,
  ROUND(COUNT(DISTINCT te.task_id)::numeric / 
        NULLIF(COUNT(DISTINCT t.id), 0) * 100, 1) as evidence_rate
FROM tasks t
LEFT JOIN task_evidence te ON te.task_id = t.id
WHERE t.status IN ('completed', 'approved');
```

### 11.2 Qualitative Data (Manual Collection)

#### End-of-Pilot Survey (All Users — 5 min)

```
1. How easy was TaskMe to use? (1-5 scale)
2. Did TaskMe save you time compared to your previous method? (Yes/No/Same)
3. How likely are you to recommend TaskMe to a colleague? (0-10 NPS)
4. What was the BEST thing about TaskMe? (Open text)
5. What was the most FRUSTRATING thing? (Open text)
6. Which feature did you use most? (Multi-select: Task list, Photo upload, Notifications, Reports, Dashboard)
7. What feature is MISSING that you need? (Open text)
```

#### Stakeholder Interviews (15 min each)

**Manager Interview:**
- Has visibility into operations improved? How?
- How does the escalation system compare to manual follow-up?
- Would you trust TaskMe data for client SLA reporting?
- What would prevent you from purchasing?

**Supervisor Interview:**
- Is creating/assigning tasks faster than WhatsApp/verbal?
- How useful is the review workflow (approve/reject)?
- Is the team performance view actionable?
- What's missing for daily operations?

**Staff Interview:**
- Was the app easy to learn?
- Does the photo requirement feel reasonable?
- Do push notifications help or annoy you?
- Do you prefer this over the old way?

---

## 12. Go / No-Go Decision Framework

### 12.1 Scoring Matrix

| Criteria | Weight | Score (1-5) | Weighted |
|----------|--------|-------------|----------|
| Task completion rate ≥ 85% | 25% | ___ | ___ |
| Daily active usage ≥ 80% | 20% | ___ | ___ |
| NPS ≥ 7 | 15% | ___ | ___ |
| Photo evidence rate = 100% | 15% | ___ | ___ |
| Manager endorsement (verbal) | 10% | ___ | ___ |
| No critical technical issues | 10% | ___ | ___ |
| Week 2 > Week 1 improvement | 5% | ___ | ___ |
| **TOTAL** | **100%** | | **/5.0** |

### 12.2 Decision Rules

| Score | Decision | Action |
|-------|----------|--------|
| **≥ 4.0** | 🟢 **GO** | Proceed to commercial agreement. Transition pilot to production. |
| **3.0 – 3.9** | 🟡 **CONDITIONAL GO** | Address top 3 gaps. Offer 7-day extension or discounted first quarter. |
| **2.0 – 2.9** | 🟠 **EXTEND** | Identify root causes. Offer 14-day extension with enhanced support. |
| **< 2.0** | 🔴 **NO-GO** | Document learnings. Exit gracefully. Offer to revisit in 90 days. |

---

## 13. Post-Pilot Conversion Strategy

### 13.1 If GO → Conversion Path

```
Day 14 → GO Decision
    │
    ├── Day 15-16: Commercial negotiation (pricing, contract terms)
    │
    ├── Day 17-18: Production environment setup
    │   ├── Migrate pilot data to production Supabase
    │   ├── Custom domain (taskme.{customer}.com)
    │   ├── Remove demo features, harden security
    │   └── Configure customer-specific branding (logo, colors)
    │
    ├── Day 19-20: Expand rollout
    │   ├── Onboard remaining staff/sites
    │   ├── Create customer-specific task templates
    │   └── Configure site locations
    │
    └── Day 21+: Steady state
        ├── Monthly business review calls
        ├── Feature request tracking
        └── Usage monitoring + health checks
```

### 13.2 If CONDITIONAL GO → Bridge Offers

| Offer | Purpose |
|-------|---------|
| **7-day free extension** | Address specific gaps, re-measure |
| **50% discount — first 3 months** | Reduce risk perception for hesitant buyer |
| **Feature commitment** | Agree to deliver top-requested feature within 30 days |
| **Success guarantee** | Full refund if KPIs not met after 90 days |

### 13.3 Pilot-to-Production Data Handling

| Item | Action |
|------|--------|
| Task data from pilot | Offer to keep (continuity) or wipe (fresh start) |
| Photo evidence | Migrate to production storage bucket |
| User accounts | Keep — reset passwords for security |
| Escalation history | Archive for baseline comparison |

---

## 14. Pilot Cost & Resource Estimate

### 14.1 Internal Resources Required

| Role | Time Commitment | Phase |
|------|-----------------|-------|
| **Product Analyst** | 2-3 hrs/day (Week 1), 1 hr/day (Week 2) | Monitoring, metrics, customer interface |
| **Engineer** | 4 hrs (setup) + 1 hr/day (on-call) | Environment setup, bug fixes |
| **QA** | 4 hrs (pre-pilot testing) | Device testing, RLS verification |
| **Customer Success** | 2 hrs/day (Day 1-3), 30 min/day (Day 4-14) | Training, support, relationship |

### 14.2 Infrastructure Costs

| Item | Cost (14-day pilot) |
|------|---------------------|
| Supabase (Free tier sufficient for pilot) | $0 |
| Netlify (Free tier: 100GB bandwidth) | $0 |
| Supabase Storage (1GB free) | $0 |
| Custom domain (optional) | ~$12/year |
| **Total pilot cost** | **$0 – $12** |

> **Note:** For customers with >50 users or >10GB photo storage, Supabase Pro ($25/month) may be required during pilot.

---

## 15. Appendices

### Appendix A: Pilot Launch Email Template

```
Subject: Welcome to TaskMe — Your 14-Day Pilot Starts Today! 🚀

Hi {Customer Name},

Your TaskMe pilot is live! Here's everything you need:

📱 App URL: https://taskme-{customer}.netlify.app
📋 Your login: {email} (password sent separately)
📖 Quick Start Guide: [attached]
💬 Support Chat: [WhatsApp/Telegram link]

TODAY'S AGENDA:
• 10:00 AM — Manager + Supervisor Training (45 min)
• 11:00 AM — Staff Training (20 min)  
• 11:30 AM — First tasks created and assigned

Your dedicated support contact: {Name}, {Phone}, {Email}

Let's make this pilot a success!
— The TaskMe Team
```

### Appendix B: Daily Metrics Tracking Sheet

| Day | Users Active | Tasks Created | Tasks Completed | Completion % | Escalations | Support Tickets | Notes |
|-----|-------------|---------------|-----------------|-------------|-------------|-----------------|-------|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |
| 11 | | | | | | | |
| 12 | | | | | | | |
| 13 | | | | | | | |
| 14 | | | | | | | |

### Appendix C: Competitive Differentiators to Highlight During Pilot

| Feature | TaskMe | Generic Task Apps (Asana, Trello) | WhatsApp/Paper |
|---------|--------|-----------------------------------|----------------|
| Mandatory photo evidence | ✅ Built-in | ❌ No | ❌ No |
| Automatic 3-tier escalation | ✅ 1hr/3hr/6hr | ❌ Manual only | ❌ None |
| Role-based access control (RLS) | ✅ Database-level | ⚠️ App-level only | ❌ None |
| Real-time push notifications | ✅ Web Push | ✅ Email/in-app | ⚠️ Manual |
| Compliance-ready audit trail | ✅ Full chain | ⚠️ Activity log | ❌ None |
| One-click report export | ✅ CSV + Evidence | ⚠️ Limited | ❌ Manual |
| PWA (no app store needed) | ✅ Install from browser | ❌ Native only | N/A |
| Multi-language | ✅ EN + ZH | ✅ Many | N/A |
| Designed for frontline workers | ✅ Purpose-built | ❌ Generic | N/A |

### Appendix D: Key Technical Pre-Pilot Checklist

```
ENVIRONMENT VARIABLES REQUIRED:
├── NEXT_PUBLIC_SUPABASE_URL          → Customer's Supabase project URL
├── NEXT_PUBLIC_SUPABASE_ANON_KEY     → Public anonymous key
├── SUPABASE_SERVICE_ROLE_KEY         → Server-side admin key (never exposed)
├── NEXT_PUBLIC_VAPID_PUBLIC_KEY      → Web Push public key
├── VAPID_PRIVATE_KEY                 → Web Push private key
├── CRON_SECRET                       → Bearer token for escalation API
└── NEXT_PUBLIC_SITE_URL              → Deployed app URL
```

### Appendix E: Post-Pilot Executive Summary Template

```
TASKME PILOT RESULTS — {CUSTOMER NAME}
Duration: {7/14} days | {Start Date} – {End Date}
Team Size: {N} staff, {N} supervisors, {N} managers
Site(s): {Location(s)}

KEY RESULTS:
• Task completion rate: __% (target: 85%)
• Daily active usage: __% (target: 80%)  
• Photo evidence rate: __% (target: 100%)
• Escalation detection: __ hours (target: <1hr, baseline: 4-8hr)
• Report generation: __ minutes (target: <5min, baseline: 2-3hr)
• NPS Score: __ (target: ≥7)

ROI ESTIMATE:
• Supervisor time saved: __ hrs/week × $__/hr = $__/month
• Overdue task reduction: __% → estimated __% SLA improvement
• Compliance risk reduction: Photo evidence for __% of tasks

RECOMMENDATION: [GO / CONDITIONAL GO / EXTEND / NO-GO]
SCORE: __/5.0

TOP FEEDBACK:
• Best: "___"
• Worst: "___"  
• #1 Feature Request: "___"

NEXT STEPS:
1. ___
2. ___
3. ___
```

---

*End of Customer Pilot Plan — TaskMe v1.0*
