# TaskMe — Project Feature Document

**Document Type:** Client Proposal — Product Feature Specification
**Version:** 2.0
**Date:** May 2026
**Prepared For:** Prospective Clients — Hospitality, Facility Management, Aged Care, and Multi-Site Operations
**Classification:** Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Objectives](#2-objectives)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Core Features](#4-core-features-detailed)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [System Architecture](#7-system-architecture)
8. [User Journey / Workflow](#8-user-journey--workflow)
9. [UI/UX Highlights](#9-uiux-highlights)
10. [Reporting & Analytics](#10-reporting--analytics)
11. [Security & Compliance](#11-security--compliance)
12. [Integrations](#12-integrations)
13. [Future Enhancements](#13-future-enhancements)
14. [Value Proposition](#14-value-proposition)

---

## 1. Executive Summary

### Overview

TaskMe is a compliance-grade, real-time task management platform purpose-built for industries where operational accountability is non-negotiable — hospitality, facility management, aged care, and multi-site commercial operations. The platform replaces fragmented communication channels (WhatsApp groups, paper checklists, spreadsheet trackers) with a structured digital workflow that enforces a complete accountability chain: task creation → assignment → photo-verified completion → supervisor review → automated escalation → manager oversight.

### Business Value

| Pain Point | How TaskMe Solves It |
|---|---|
| Tasks assigned via WhatsApp are lost, untracked, and unverifiable | Every task has a digital record with status tracking, timestamps, and photo evidence |
| Supervisors discover overdue work hours later during site walks | Automated 3-tier escalation engine detects delays within 1 hour and notifies stakeholders in real time |
| No proof of completion for client or regulatory audits | Mandatory photo evidence with GPS-awareness and timestamped submission creates an immutable audit trail |
| Managers rely on anecdotal reports to assess team performance | Real-time dashboards, SLA compliance rates, per-site and per-staff analytics with CSV export |
| Staff juggle between apps, losing context and wasting time | Single mobile-first PWA with role-specific views — staff see only their tasks, nothing more |

### Target Users & Industry Use Cases

| Industry | Primary Users | Sample Use Cases |
|---|---|---|
| **Hospitality** (Hotels, Resorts) | Housekeeping staff, floor supervisors, operations managers | Room turnovers, maintenance requests, deep-cleaning schedules, pest control verification |
| **Facility Management** (Commercial, Retail) | Maintenance technicians, site supervisors, FM managers | Equipment inspections, safety checks, cleaning audits, tenant service requests |
| **Aged Care** (Nursing Homes, Assisted Living) | Care assistants, shift supervisors, care managers | Resident care tasks, medication reminders, hygiene checks, incident response |
| **Multi-Site Retail** (Malls, Chains) | Store associates, area supervisors, regional managers | Store opening/closing procedures, visual merchandising, maintenance tickets |
| **Construction & Site Management** | Site workers, project supervisors, project managers | Safety inspection checklists, defect rectification, progress photo documentation |

---

## 2. Objectives

### Key Goals

1. **Digitise operational task workflows** — Replace verbal instructions, WhatsApp messages, and paper checklists with a structured, auditable digital system
2. **Enforce accountability through evidence** — Mandate photo-verified completion so every task has proof of work
3. **Enable proactive problem detection** — Automatically identify overdue tasks and escalate to the right person before they become incidents
4. **Provide operational visibility at every level** — Give staff clarity on their tasks, supervisors control over their team, and managers insight across the entire operation
5. **Reduce response time to operational failures** — From hours (discovered during site walks) to minutes (automated push notification upon delay)
6. **Create audit-ready records** — Every action is timestamped, attributed, and exportable for compliance reporting
7. **Support multi-lingual, multi-site teams** — Serve diverse workforces across locations with localised interfaces

### Problems Solved

| Problem | Impact Without TaskMe | Impact With TaskMe |
|---|---|---|
| Untracked task assignments | 30–40% of verbal instructions are forgotten or incomplete | 100% task capture with digital assignment and acknowledgment |
| No completion evidence | Disputes with clients, regulatory risk, "he said/she said" scenarios | Time-stamped photo evidence attached to every completed task |
| Delayed escalation | Overdue tasks discovered 4–8 hours later during shift handover | Automatic detection at 1 hour, escalation at 3 hours, critical alert at 6 hours |
| Manual reporting | Supervisors spend 2–3 hours weekly compiling reports from memory | One-click CSV export with real-time dashboards and trend analytics |
| Siloed communication | Staff unaware of task updates, supervisors unaware of completions | Real-time push notifications and live dashboard updates via WebSocket |
| No performance baseline | Inability to identify underperformers or reward top performers | Per-staff completion rate, on-time rate, cycle time, and SLA compliance metrics |

---

## 3. User Roles & Permissions

TaskMe implements a three-tier role hierarchy with strict row-level security enforcement at the database layer. Each role sees only the data and actions relevant to their responsibilities.

### 3.1 Staff (Field Operatives)

**Who they are:** Housekeepers, maintenance technicians, care assistants, cleaners — the people doing the hands-on work.

| Capability | Access Level |
|---|---|
| View assigned tasks | Own tasks only |
| Start task (move to "In Progress") | Own tasks only |
| Complete task with photo evidence | Own tasks only |
| Resubmit rejected tasks | Own tasks only |
| View completion history | Own history only |
| View review status (Approved / Rejected / In Review) | Own tasks only |
| Update profile and avatar | Own profile |
| Receive push notifications | Assignment alerts, overdue warnings, rejection notices |
| Create or assign tasks | Not permitted |
| View other staff members' data | Not permitted |
| Access reports or analytics | Not permitted |

### 3.2 Supervisor (Team Leads / Shift Leads)

**Who they are:** Floor supervisors, shift leads, team leads — responsible for a group of staff and the quality of their output.

| Capability | Access Level |
|---|---|
| Create and assign tasks to staff | Full access |
| Set task priority (Low / Medium / High / Critical) | Full access |
| Review completed tasks (Approve / Reject with reason) | All completed tasks |
| Reassign tasks to different staff | Any task |
| Escalate tasks to manager | Any task |
| View all tasks across their team | All assigned tasks |
| Monitor team performance (per-staff stats) | All staff |
| Generate and export reports (CSV) | All task data |
| View pending reviews queue | All pending reviews |
| Receive push notifications | New completions, evidence submissions |
| Access manager-level dashboards | Not permitted |
| Resolve escalations | Not permitted (manager only) |

### 3.3 Manager (Operations Manager / Regional Manager)

**Who they are:** Operations managers, regional managers, department heads — accountable for outcomes across teams and sites.

| Capability | Access Level |
|---|---|
| Full operational overview dashboard | All tasks, all sites, all teams |
| View and manage all escalations (Resolve / Reopen) | All escalations |
| Create and assign tasks directly | Full access |
| View all tasks across all teams and sites | Full access |
| Monitor supervisor and staff performance | All personnel |
| Per-site performance breakdown | All sites |
| Generate cross-team reports with advanced filters | Full access |
| Export operational data (CSV) | Full access |
| Receive escalation alerts (automatic and manual) | All escalations |
| View SLA compliance and completion trends | Full analytics |
| Delete tasks | Manager only |

### Permission Matrix Summary

| Action | Staff | Supervisor | Manager |
|---|---|---|---|
| View own tasks | ✅ | ✅ | ✅ |
| View all tasks | — | ✅ | ✅ |
| Create tasks | — | ✅ | ✅ |
| Complete tasks (with evidence) | ✅ | — | — |
| Approve / Reject tasks | — | ✅ | ✅ |
| Reassign tasks | — | ✅ | ✅ |
| Escalate to manager | — | ✅ | — |
| Resolve escalations | — | — | ✅ |
| View team performance | — | ✅ | ✅ |
| Export reports | — | ✅ | ✅ |
| Delete tasks | — | — | ✅ |
| Manage own profile | ✅ | ✅ | ✅ |

---

## 4. Core Features (Detailed)

### 4.1 Task Creation & Assignment

**Description:** Supervisors and managers create tasks with structured metadata and assign them to specific staff members. The system enforces required fields (title, assignee, due date) and optional enrichment (description, site location, priority level). Upon creation, the assigned staff member receives an instant push notification.

**User Roles Involved:** Supervisor (primary creator), Manager (can create directly from dashboard)

**Workflow:**
1. Supervisor opens Create Task modal from dashboard or task list
2. Fills in: Title (required, 120 char max), Description (optional, 500 char max), Assignee (dropdown of staff), Priority (Critical / High / Medium / Low with visual indicators), Site Location (optional, 80 char max), Due Date & Time (required, minimum = now, default = 4 hours from now)
3. System validates inputs, creates task with status "Pending"
4. Push notification sent to assigned staff: "New Task Assigned 📋 — {title}"
5. Task appears in staff's dashboard and task list in real time

**Business Benefits:**
- Eliminates verbal/chat-based assignments that get lost
- Structured priority system ensures critical tasks are surfaced first
- Immediate notification reduces time-to-awareness from hours to seconds
- Audit trail captures who created what, when, and for whom

### 4.2 Task Prioritisation

**Description:** Every task carries a four-tier priority level that drives visual treatment, sort order, and escalation behavior throughout the system.

**Priority Levels:**

| Priority | Visual Treatment | Behavior |
|---|---|---|
| **Critical** | Red badge, pulsing indicators, top-of-list placement | Auto-escalated to critical at 6h overdue. Appears in Priority Strip. Always shown first in sort. |
| **High** | Orange badge with flame icon | Sorted above medium/low. Flagged in overdue alerts. |
| **Medium** | Yellow badge | Standard treatment. Default for new tasks. |
| **Low** | Green badge | Sorted last. Minimal visual emphasis. |

**User Roles Involved:** Supervisor (sets priority at creation), Manager (views priority breakdown), System (auto-upgrades to Critical at Tier 3 escalation)

**Business Benefits:**
- Staff immediately know which task to tackle first
- Supervisors can triage workloads by adjusting priority
- Critical items are impossible to miss due to visual emphasis and auto-escalation

### 4.3 Photo-Verified Task Completion

**Description:** Staff complete tasks by submitting mandatory photo evidence and optional notes through a guided 3-step modal. This is the core accountability mechanism of the platform.

**Completion Workflow:**
1. **Upload Photo** — Staff takes or selects a photo (drag-and-drop or file picker). Image is previewed before upload.
2. **Add Details** — Optional notes field for context (e.g., "Found damage on wall, reported to supervisor").
3. **Review & Submit** — Confirmation screen showing photo preview and notes. Staff confirms submission.

**Technical Details:**
- Photos uploaded to secure cloud storage (Supabase Storage, `task-evidence` bucket)
- Photo URLs are validated server-side to ensure they originate from the application's storage (prevents URL injection)
- Each submission creates a `task_evidence` record with: photo URL, notes, submitted_by, submitted_at timestamp
- Task status moves from "In Progress" to "Completed" with `completed_at` timestamp
- Multiple evidence submissions supported per task (e.g., before/after photos)
- Success animation overlay confirms submission

**User Roles Involved:** Staff (submits evidence), Supervisor (reviews evidence), Manager (views evidence in task detail)

**Business Benefits:**
- Irrefutable proof of work for client SLA compliance and regulatory audits
- Reduces disputes between staff, supervisors, and clients
- Photo evidence eliminates "checked but not done" scenarios common with paper checklists
- Timestamped records create an immutable audit trail

### 4.4 Supervisor Review Workflow

**Description:** Completed tasks enter a review queue where supervisors inspect the photo evidence and either approve or reject the work. This quality gate ensures standards are met before a task is considered truly done.

**Review Actions:**

| Action | Description | Requirements |
|---|---|---|
| **Approve** | Marks task as verified and complete | Optional comment (e.g., "Good work, area looks clean") |
| **Reject** | Sends task back to staff for redo | Required reason. Quick-select options: "Photo unclear", "Task incomplete", "Wrong location", "Needs redo" |
| **Escalate** | Raises to manager for intervention | Required reason. Warning: "Manager will be notified immediately" |
| **Reassign** | Transfers to a different staff member | Select new assignee + new deadline. Resets status to "Pending" |

**Workflow:**
1. Staff completes task → appears in supervisor's "Pending Reviews" queue
2. Supervisor opens task → views photo evidence, notes, and task metadata
3. Supervisor takes action (Approve / Reject / Escalate / Reassign)
4. Staff receives push notification of the outcome
5. Rejected tasks return to staff's active task list for resubmission

**User Roles Involved:** Supervisor (primary reviewer), Manager (can view review history)

**Business Benefits:**
- Quality gate prevents substandard work from being marked as "done"
- Quick-reason buttons standardise feedback and reduce review time
- Rejection workflow creates a closed feedback loop — staff learn and improve
- Review history creates accountability for supervisors too (who approved what, when)

### 4.5 Automated 3-Tier Escalation Engine

**Description:** A server-side engine runs every 30 minutes (via scheduled cron job) to detect overdue tasks and automatically escalate them through three tiers of increasing severity. This eliminates the human bottleneck of "someone needs to notice the delay."

**Escalation Tiers:**

| Tier | Trigger | Automated Actions |
|---|---|---|
| **Tier 1** (1+ hour overdue) | Task due date exceeded by ≥ 1 hour | Task status → "Overdue". Push notification to assigned staff: "Task Overdue ⚠️ — {title}" |
| **Tier 2** (3+ hours overdue) | Task due date exceeded by ≥ 3 hours | Escalation record created (assigned to manager). Push notification to manager: "Task Escalated 🔴 — {title}". Deduplication check prevents repeat escalations. |
| **Tier 3** (6+ hours overdue) | Task due date exceeded by ≥ 6 hours | Task priority auto-upgraded to "Critical". CRITICAL escalation record created. Push notification to both staff AND manager: "CRITICAL Escalation 🚨 — {title}" |

**Deduplication:** Before creating an escalation record, the engine checks for existing unresolved escalations with the same reason text to prevent duplicate entries.

**User Roles Involved:** System (automated), Staff (receives Tier 1 alerts), Manager (receives Tier 2 and Tier 3 alerts, resolves escalations)

**Business Benefits:**
- Zero human effort required to detect and flag delays
- Graduated response: staff gets a nudge first, manager intervenes only if needed
- Prevents cascade failures: a 1-hour delay is caught before it becomes a 6-hour SLA breach
- Creates a documented escalation history for post-incident review
- Critical auto-upgrade ensures the most overdue tasks are visually prioritised everywhere in the system

### 4.6 Real-Time Notifications & Push Alerts

**Description:** TaskMe uses two notification channels to ensure stakeholders are informed the moment something happens:

1. **In-app real-time updates** — Supabase Realtime (WebSocket) subscriptions push live data changes to all open dashboards without manual refresh. When a task is created, completed, escalated, or reviewed, every connected dashboard updates instantly.
2. **Web Push notifications** — Browser-level push notifications delivered even when the app is not in the foreground. Powered by the Web Push protocol with VAPID authentication.

**Notification Events:**

| Event | Recipient | Channel |
|---|---|---|
| New task assigned | Staff | Push + In-app |
| Task marked overdue (Tier 1) | Staff | Push |
| Task escalated to manager (Tier 2) | Manager | Push + In-app |
| Critical escalation (Tier 3) | Staff + Manager | Push + In-app |
| Task completed (evidence submitted) | Supervisor | In-app (toast) |
| Task approved / rejected | Staff | In-app (toast) |
| Task reassigned | New assignee | Push |

**Technical Details:**
- Service worker (`sw.js`) handles push events and notification clicks (routes to relevant page)
- Push subscriptions stored in database and auto-cleaned on 410 Gone responses
- All dashboards subscribe to Supabase Realtime channels for relevant table changes
- Toast notifications (Sonner) for in-app events

**User Roles Involved:** All roles (receive role-appropriate notifications)

**Business Benefits:**
- Eliminates "I didn't know" as an excuse — notifications are proactive and persistent
- Managers don't need to poll dashboards — critical issues come to them
- Real-time updates mean dashboards always show current state during active shifts
- Push notifications work even when the browser is minimised or the device is locked

### 4.7 Role-Based Dashboards

**Description:** Each role has a purpose-built dashboard optimised for their specific decision-making needs. No role sees irrelevant information.

**Staff Dashboard:**
- Time-based greeting with personalised motivation message
- 4 stat chips: Overdue (red, pulsing), Due Today, Completed Today, SLA Compliance %
- "Start Next Task" CTA banner highlighting the highest-priority active task
- Overdue escalation alert banner (if applicable)
- Task sections: Overdue → Due Today → Completed Today (collapsible)

**Supervisor Dashboard:**
- 4 KPI cards with inline CTAs: Pending Reviews, Overdue Tasks, Completed Today, Active Tasks
- Priority strip for critical overdue tasks
- AI-powered insight cards (rule-based, up to 3 contextual recommendations)
- Two-column layout: Pending Reviews + Overdue list (left) | Activity Feed (right)
- Activity feed: chronological stream of completions, evidence submissions, and escalations

**Manager Dashboard:**
- 4 executive KPIs: Total Tasks Today, Completion Rate (with week-over-week trend), Overdue Tasks, Escalations
- Operations alert banner (pulsing red for critical, amber for warnings) — dismissible
- Quick Action cards: View Escalations, Resolve Overdue, Team Performance, Generate Report
- Escalations feed (top 5 with inline resolve)
- Recent activity feed (last 5 completions)
- Site performance table (sorted by risk: overdue desc → completion rate asc)
- Supervisor performance breakdown table (assigned, completed, in-progress, overdue, escalations, completion rate)
- 7-day trend chart (completed vs overdue, dual-bar per day)

**Business Benefits:**
- Each role gets exactly the information they need — no noise, no overload
- Dashboards are action-oriented (CTAs, not just numbers)
- Real-time data means decisions are based on current state, not stale reports

### 4.8 Reporting & Data Export

**Description:** Supervisors and managers access configurable report builders with flexible filtering, grouping, and export capabilities.

**Report Capabilities:**

| Capability | Supervisor Reports | Manager Reports |
|---|---|---|
| Date range selection | Quick pills (7d/30d/This Week/Month/90d) + custom | Quick pills (Today/7d/30d/90d) + custom |
| Filter by staff member | ✅ | ✅ |
| Filter by site | — | ✅ |
| Filter by priority | — | ✅ |
| Filter by status | ✅ (All/Completed/Pending/In Progress/Rejected/Overdue) | ✅ (All/Completed/Approved/In Review/Rejected/Pending/Overdue) |
| Group by | Per-staff breakdown | Per-staff or Per-site toggle |
| Sort columns | Name, Assigned, Completed, Overdue, Completion Rate | Label, Assigned, Completed, Overdue, Completion Rate, Escalations |
| Avg completion time | ✅ | — |
| Completion rate trend | ✅ (vs previous period) | ✅ (week-over-week) |
| CSV export | ✅ | ✅ |
| Evidence log export | ✅ | ✅ |
| Pagination | ✅ (10 per page) | ✅ (10 per page) |

**Export Formats:**
- **CSV Export** — Full report data with proper quoting/escaping, browser download trigger
- **Evidence Log Export** — Fetches all evidence records for filtered tasks: Evidence ID, Task Title, Site, Submitted By, Date, Photo URL, Notes

**Business Benefits:**
- Monthly/quarterly performance reviews backed by data, not anecdotes
- SLA compliance reports for client billing disputes
- CSV export integrates with Excel, Google Sheets, and payroll systems
- Evidence logs serve as audit documentation for regulatory compliance

### 4.9 Team Performance Management

**Description:** Supervisors and managers monitor individual and team-level performance through dedicated team views with per-person metrics, spotlights, and status heuristics.

**Supervisor Team View:**
- Per-staff cards: total tasks, active, completed, overdue, pending reviews, completion rate
- Status heuristic: "On Track" (green), "Needs Attention" (amber, overdue > 0 or active ≥ 5), "Overloaded" (red, overdue ≥ 2 or active ≥ 8)
- Search and filter by status category
- 4 team-level stat cards: Team Members, Active Tasks, Pending Reviews, Overdue Tasks

**Manager Team View:**
- Per-person table with sortable columns: Name, Role (staff/supervisor chip), Assigned, Completed, Rate, Overdue, Escalations, Last Activity
- Top Performers spotlight: staff with ≥ 3 completed, sorted by completion rate → on-time rate → completed count (top 3)
- Needs Attention spotlight: staff with overdue > 0 or completion rate < 60% or escalations > 0 (top 3)
- Team KPI strip: Headcount, Completion Rate, On-time Rate, Overdue count
- Site breakdown table: per-site assigned, completed, overdue, headcount, completion rate
- Supervisor breakdown table: per-supervisor assigned, completed, in-progress, overdue, escalations, completion rate
- Role filter: Staff / Supervisors / All

**Business Benefits:**
- Identifies underperformers before they become chronic problems
- Recognises top performers for rewards, promotions, or shift leadership nominations
- Site-level breakdown reveals systemic issues vs individual performance gaps
- Supervisor accountability: managers can see which supervisor's team is struggling

### 4.10 Task Reassignment

**Description:** Supervisors and managers can transfer a task from one staff member to another, with optional deadline adjustment. The reassigned task resets to "Pending" status.

**Workflow:**
1. Supervisor opens Reassign modal from task detail or overdue list
2. Current assignee shown (read-only)
3. Select new assignee (filtered list, current assignee excluded)
4. Set new deadline (datetime picker, default = 4 hours from now)
5. Confirm → task updated, push notification to new assignee

**User Roles Involved:** Supervisor, Manager

**Business Benefits:**
- Handles unexpected absences (sick leave, emergency) without creating new tasks
- Redistributes workload when staff are overloaded
- Maintains task history — the original assignment record is preserved

### 4.11 Multi-Language Support (i18n)

**Description:** TaskMe supports multilingual interfaces to serve diverse workforces common in hospitality and facility management.

**Supported Languages:** English (en), Simplified Chinese (zh)

**Implementation:**
- Cookie-based locale persistence (`NEXT_LOCALE` cookie, 1-year expiry)
- Automatic language detection from browser `Accept-Language` header on first visit
- In-app language switcher (toggle, instant page refresh)
- Full dictionary-based translation for all staff-facing UI: dashboard, tasks, completed view, profile, task detail, completion modal
- CJK font fallback stack: PingFang SC → Microsoft YaHei → Noto Sans SC → Hiragino Sans GB
- Date formatting respects locale (date-fns `enUS`/`zhCN`)

**User Roles Involved:** All roles (staff-facing UI fully translated; supervisor/manager UI in English)

**Business Benefits:**
- Serves Singapore's multilingual workforce (English, Mandarin, Malay, Tamil)
- Reduces training time for non-English-speaking staff
- Automatic detection means zero configuration for new users

### 4.12 Progressive Web App (PWA)

**Description:** TaskMe is installable as a native-like app on mobile devices without app store distribution.

**PWA Features:**
- Web App Manifest with standalone display mode and portrait orientation lock
- App icons (192px and 512px) for home screen installation
- Service worker for push notification handling and notification click routing
- iOS safe-area inset support for notched devices
- 44px minimum touch targets for thumb-friendly interaction
- 16px minimum input font size to prevent iOS auto-zoom

**Business Benefits:**
- No app store approval process — deploy updates instantly
- Works on any device with a browser (iOS, Android, desktop)
- "Add to Home Screen" provides native app feel without native development costs
- Push notifications work like a native app (even when browser is minimised)

---

## 5. Functional Requirements

### 5.1 Task Lifecycle Workflow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         TASK LIFECYCLE                                    │
│                                                                          │
│  ┌──────────┐    ┌─────────────┐    ┌───────────┐    ┌──────────────┐   │
│  │ PENDING   │───▶│ IN PROGRESS │───▶│ COMPLETED │───▶│ IN REVIEW    │   │
│  │(Created)  │    │(Staff starts)│    │(Evidence  │    │(Supervisor)  │   │
│  └──────────┘    └─────────────┘    │ submitted) │    └──────┬───────┘   │
│       │                │             └───────────┘           │           │
│       │                │                                     │           │
│       │                ▼                              ┌──────┴───────┐   │
│       │          ┌───────────┐                         │   APPROVED   │   │
│       │          │  OVERDUE   │                         │   (Done)     │   │
│       │          │(Auto-set   │                         └──────────────┘   │
│       │          │ by engine) │                                │           │
│       │          └─────┬─────┘                                │           │
│       │                │                               ┌──────┴───────┐   │
│       │                ▼                               │  REJECTED    │   │
│       │          ┌───────────┐                         │ (Back to     │   │
│       │          │ ESCALATED │                         │  staff)      │   │
│       │          │(To manager)│                         └──────┬───────┘   │
│       │          └───────────┘                                │           │
│       │                                                       │           │
│       │                              ┌────────────────────────┘           │
│       ▼                              ▼                                    │
│  ┌──────────────────────────────────────┐                                │
│  │     REASSIGNED (Reset to Pending)     │                                │
│  └──────────────────────────────────────┘                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Escalation Lifecycle

```
  Task overdue by 1h          Task overdue by 3h          Task overdue by 6h
        │                           │                           │
        ▼                           ▼                           ▼
  ┌──────────┐              ┌──────────────┐           ┌──────────────────┐
  │ TIER 1   │              │   TIER 2     │           │    TIER 3        │
  │ Mark     │              │ Escalate to  │           │ Priority →       │
  │ Overdue  │              │ Manager      │           │ CRITICAL         │
  │ + Notify │              │ + Notify     │           │ + Notify Both    │
  │ Staff    │              │ Manager      │           │ + Critical       │
  └──────────┘              └──────────────┘           │   Escalation     │
                                                        └──────────────────┘
                                                                │
                                                                ▼
                                                        ┌──────────────┐
                                                        │ Manager      │
                                                        │ Resolves or  │
                                                        │ Reopens      │
                                                        └──────────────┘
```

### 5.3 Key System Functionalities

| ID | Functionality | Description |
|---|---|---|
| F-01 | User authentication | Email/password login via Supabase Auth with session cookie management |
| F-02 | Role-based routing | Middleware enforces role-to-route mapping; redirects on mismatch |
| F-03 | Task CRUD | Create (supervisor/manager), Read (role-filtered), Update (status transitions), Delete (manager only) |
| F-04 | Task assignment | Assign to specific staff with due date and priority |
| F-05 | Status transitions | Pending → In Progress → Completed → Approved/Rejected (enforced server-side) |
| F-06 | Photo evidence upload | Client-side image handling, cloud storage, server-side URL validation |
| F-07 | Task review | Approve/Reject/Escalate/Reassign with required metadata |
| F-08 | Auto-escalation | Cron-triggered engine (every 30 min) with 3 tiers |
| F-09 | Manual escalation | Supervisor escalates to manager with reason |
| F-10 | Push notifications | Web Push via VAPID, service worker, auto-subscription |
| F-11 | Real-time updates | Supabase Realtime channels, WebSocket, auto-refresh |
| F-12 | Dashboard analytics | Role-specific KPIs, charts, and trend data |
| F-13 | Reporting engine | Configurable filters, grouping, sorting, pagination |
| F-14 | CSV/Evidence export | Client-side CSV generation with proper escaping |
| F-15 | Team management | Per-person stats, status heuristics, spotlight rankings |
| F-16 | Profile management | Avatar upload (client-side resize to 256px WebP), name display |
| F-17 | Internationalisation | Dictionary-based i18n, cookie locale, auto-detection |
| F-18 | Site-level analytics | Per-site task breakdown, completion rate, headcount |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target | Implementation |
|---|---|---|
| Page load time (initial) | < 2 seconds on 4G | Server-side rendering (React Server Components), optimised bundle splitting |
| Dashboard refresh latency | < 500ms | Supabase Realtime WebSocket push (no polling) |
| Photo upload time | < 3 seconds for 5MB image | Direct-to-cloud upload (Supabase Storage), client-side compression (WebP, 256px resize for avatars) |
| Report generation | < 2 seconds for 1000+ tasks | Client-side filtering with parallel Supabase queries via `Promise.all` |
| Escalation engine execution | < 10 seconds per run | Single database query for all overdue tasks, batch processing |
| Concurrent users | 100+ simultaneous | Serverless architecture (Vercel/Netlify edge functions), connection pooling via Supabase |

### 6.2 Security

| Measure | Implementation |
|---|---|
| Authentication | Supabase Auth (bcrypt-hashed passwords, JWT session tokens, secure httpOnly cookies) |
| Authorisation | Row-Level Security (RLS) at PostgreSQL level — every query filtered by user role and ID |
| Input validation | Server-side validation on all mutations; client-side validation for UX |
| Photo URL validation | Server-side check that photo URLs originate from application's Supabase Storage bucket |
| API protection | Escalation cron endpoint protected by bearer token (`CRON_SECRET`) |
| Session management | Middleware refreshes JWT on every request; expired sessions redirect to login |
| Data isolation | Staff cannot view other staff's tasks, evidence, or reviews (enforced at DB level) |
| XSS prevention | React's built-in JSX escaping, no `dangerouslySetInnerHTML` usage |
| CSRF protection | SameSite cookie attribute, server-side action validation |

### 6.3 Scalability

| Aspect | Approach |
|---|---|
| Horizontal scaling | Serverless deployment (Vercel/Netlify) — auto-scales with request volume |
| Database | Supabase PostgreSQL with connection pooling (PgBouncer), indexed queries on frequently filtered columns |
| Storage | Supabase Storage (S3-compatible) — unlimited photo storage with CDN delivery |
| Cron jobs | Platform-native scheduled functions (Vercel Cron / Netlify Scheduled Functions) |
| Real-time | Supabase Realtime channels — WebSocket multiplexing per connection |

### 6.4 Availability

| Aspect | Target |
|---|---|
| Uptime | 99.9% (Supabase SLA + Vercel/Netlify edge network) |
| Disaster recovery | Supabase daily backups (point-in-time recovery on Pro plan) |
| Region | Supabase project region configurable (Singapore `ap-southeast-1` recommended for APAC) |
| CDN | Vercel/Netlify global edge network for static assets and server-rendered pages |

### 6.5 Usability

| Principle | Implementation |
|---|---|
| Mobile-first design | All layouts built for 375px+ viewport first, enhanced for desktop |
| Touch-friendly | 44px minimum touch targets (WCAG 2.5.8), iOS safe-area padding |
| Accessibility | Semantic HTML, `aria-label` attributes, keyboard navigation, focus-visible indicators |
| Progressive disclosure | Staff see simplified views; complexity increases with role authority |
| Visual hierarchy | Color-coded priority/status system consistent across all views |
| Loading states | Skeleton screens, spinner indicators, optimistic UI updates |
| Error feedback | Toast notifications (Sonner) for success/error states on every action |
| Responsive tables | Desktop tables collapse to mobile card layouts on small screens |

---

## 7. System Architecture

### 7.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                   Next.js 16 App Router                       │   │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │   │
│  │  │ Staff   │  │Supervisor│  │ Manager  │  │   Landing    │  │   │
│  │  │ Module  │  │ Module   │  │ Module   │  │    Page      │  │   │
│  │  └────┬────┘  └────┬─────┘  └────┬─────┘  └──────────────┘  │   │
│  │       │             │             │                            │   │
│  │  ┌────┴─────────────┴─────────────┴────────────────────────┐  │   │
│  │  │           Shared Component Library (shadcn/ui)          │  │   │
│  │  │  MetricCard · UserAvatar · Modals · Tables · Badges     │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                    Supabase Realtime (WebSocket)                      │
│                    Web Push (Service Worker)                          │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────┐
│                       SERVER LAYER                                    │
│  ┌──────────────────────────────┴──────────────────────────────┐    │
│  │                 Next.js Server Components                    │    │
│  │      React Server Components (data fetching, auth gates)     │    │
│  │      Server Actions (task mutations, review actions)         │    │
│  │      API Routes (/api/tasks, /api/escalation, /api/push)    │    │
│  │      Middleware (auth, locale, role routing)                  │    │
│  └──────────────────────────────┬──────────────────────────────┘    │
│                                  │                                    │
│  ┌──────────────────────────────┴──────────────────────────────┐    │
│  │                 Scheduled Functions                           │    │
│  │      Escalation Engine (every 30 min via cron)                │    │
│  └──────────────────────────────┬──────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────────┐
│                       DATA LAYER (Supabase)                          │
│  ┌──────────────┐  ┌────────────┐  ┌───────────────┐               │
│  │  PostgreSQL   │  │  Auth      │  │  Storage      │               │
│  │  (6 tables,   │  │  (JWT,     │  │  (task-       │               │
│  │   RLS, 7      │  │   session  │  │   evidence,   │               │
│  │   indexes,    │  │   cookies) │  │   avatars)    │               │
│  │   triggers)   │  │            │  │               │               │
│  └──────────────┘  └────────────┘  └───────────────┘               │
│  ┌──────────────┐                                                    │
│  │  Realtime     │  WebSocket channels for tasks, evidence,          │
│  │  (postgres_   │  reviews, escalations table changes               │
│  │   changes)    │                                                    │
│  └──────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16.2.3 (App Router) | Full-stack React framework with server components, server actions, and API routes |
| **UI Library** | React 19 | Component-based UI rendering |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **Component Library** | shadcn/ui (Radix UI primitives) | Accessible, composable UI components (Dialog, Dropdown, Sheet, Tooltip, etc.) |
| **Icons** | Lucide React | Consistent icon set (200+ icons used) |
| **Date Handling** | date-fns | Lightweight date formatting, distance calculation, locale support |
| **Charts** | Recharts | Dashboard visualisations |
| **Toasts** | Sonner | Toast notification system |
| **Backend / Database** | Supabase (PostgreSQL 15+) | Managed PostgreSQL with Auth, Storage, Realtime, and Row-Level Security |
| **Authentication** | Supabase Auth | Email/password auth with JWT sessions and cookie management |
| **File Storage** | Supabase Storage | S3-compatible object storage for photos and avatars |
| **Real-time** | Supabase Realtime | WebSocket-based postgres_changes subscriptions |
| **Push Notifications** | web-push (VAPID) | Server-side Web Push protocol implementation |
| **i18n** | Custom (cookie + dictionary) | Lightweight internationalisation without heavy framework |
| **Deployment** | Vercel / Netlify | Serverless deployment with edge functions and cron support |
| **Language** | TypeScript 5 | Type-safe development across frontend and backend |

### 7.3 Database Schema

| Table | Columns | Relationships | RLS Policy |
|---|---|---|---|
| `profiles` | id, full_name, email, role, avatar_url, created_at | FK → auth.users | Staff: own; Supervisor/Manager: all |
| `tasks` | id, title, description, assigned_to, created_by, site_location, priority, status, due_date, completed_at, created_at | FK → profiles (assigned_to, created_by) | Staff: own assigned; Sup/Mgr: all |
| `task_evidence` | id, task_id, submitted_by, photo_url, notes, submitted_at | FK → tasks, FK → profiles | Staff: own; Sup/Mgr: all |
| `task_reviews` | id, task_id, reviewed_by, action, comment, reviewed_at | FK → tasks, FK → profiles | Staff: own task reviews; Sup/Mgr: all |
| `escalations` | id, task_id, escalated_from, escalated_to, reason, escalated_at, is_resolved | FK → tasks, FK → profiles (from/to) | Participants + Mgr: see; Sup/Mgr: create; Mgr: update |
| `push_subscriptions` | id, user_id, endpoint, p256dh, auth | FK → profiles | Own only |

---

## 8. User Journey / Workflow

### 8.1 Task Creation (Supervisor)

```
Step 1:  Supervisor logs in → lands on Supervisor Dashboard
Step 2:  Clicks "New Task" button (available on Dashboard and All Tasks page)
Step 3:  Create Task modal opens:
         ├── Enters task title (e.g., "Deep clean Room 405")
         ├── Adds description (optional): "Guest checkout completed, priority turnaround"
         ├── Selects assignee from staff dropdown: "Sarah Tan"
         ├── Taps priority: "High" (orange, flame icon)
         ├── Enters site: "Marina Bay Sands Level 4"
         └── Sets due date: "Today, 2:00 PM" (default: 4 hours from now)
Step 4:  Clicks "Create Task"
Step 5:  System validates inputs, creates task record (status: Pending)
Step 6:  Push notification sent to Sarah Tan: "New Task Assigned 📋 — Deep clean Room 405"
Step 7:  Task appears on Sarah's dashboard immediately (real-time WebSocket)
Step 8:  Modal closes, supervisor sees updated task count
```

### 8.2 Task Completion (Staff)

```
Step 1:  Sarah receives push notification → taps to open app
Step 2:  Dashboard shows "Deep clean Room 405" in Due Today section (orange dot: High priority)
Step 3:  Taps task card → Task Detail page opens
Step 4:  Taps "Start Task" → status changes to "In Progress"
Step 5:  Completes the cleaning work physically
Step 6:  Taps "Mark as Complete" → CompleteTaskModal opens (3-step wizard)
         ├── Step 1: Takes photo of cleaned room → uploads (previews in modal)
         ├── Step 2: Adds notes: "Deep cleaned all surfaces, replaced towels, mini-bar restocked"
         └── Step 3: Reviews photo + notes → taps "Submit"
Step 7:  Photo uploaded to cloud storage, evidence record created
Step 8:  Task status → "Completed", completed_at timestamp recorded
Step 9:  Success animation plays → redirects to dashboard
Step 10: Supervisor's dashboard updates in real-time (toast: "Sarah completed Deep clean Room 405")
```

### 8.3 Task Review (Supervisor)

```
Step 1:  Supervisor sees Pending Reviews count badge update (real-time)
Step 2:  Clicks "Pending Reviews" on dashboard → opens review queue
Step 3:  Selects "Deep clean Room 405" → Review Detail page opens
Step 4:  Views: photo evidence, staff notes, task metadata, timeline
Step 5:  Decision point:
         ├── ✅ APPROVE: Clicks "Approve" → optional comment: "Looks great!" → Confirm
         ├── ❌ REJECT: Clicks "Reject" → selects "Task incomplete" + types reason → Submit
         ├── ⬆️ ESCALATE: Clicks "Escalate" → types reason → Confirm (manager notified)
         └── 🔄 REASSIGN: Clicks "Reassign" → picks new staff + new deadline → Confirm
Step 6:  Review record created with action, comment/reason, timestamp
Step 7:  Staff receives notification of outcome
Step 8:  If rejected: task returns to staff's active list with rejection reason visible
```

### 8.4 Escalation Resolution (Manager)

```
Step 1:  Manager receives push notification: "Task Escalated 🔴 — Deep clean Room 405"
Step 2:  Opens app → Dashboard shows Operations Alert Banner (red, pulsing)
Step 3:  Clicks "View Escalations" → Escalations page with filter tabs
Step 4:  Reviews escalation card: reason, who escalated, timestamp, task status
Step 5:  Clicks "Resolve" → escalation marked as resolved (optimistic UI update)
Step 6:  Or clicks task → full task detail with escalation history, reviews, evidence
Step 7:  Can also "Reopen" a previously resolved escalation if the issue recurs
```

---

## 9. UI/UX Highlights

### 9.1 Key Screens

| Screen | Role | Purpose |
|---|---|---|
| **Staff Dashboard** | Staff | Personal task overview with motivational messaging and priority-sorted task cards |
| **Staff Task Detail** | Staff | Full task info + photo evidence upload (CompleteTaskModal) + review timeline |
| **Staff Completed View** | Staff | Completion history with Approved/In Review/Rejected filters and detail drawers |
| **Supervisor Dashboard** | Supervisor | Operational command center with review queue, overdue list, and activity feed |
| **Supervisor Review Detail** | Supervisor | Evidence review + 4-action panel (Approve/Reject/Escalate/Reassign) |
| **Supervisor All Tasks** | Supervisor | Full task list with search, multi-axis filtering, and sort |
| **Supervisor Team** | Supervisor | Per-staff performance cards with status heuristics |
| **Manager Dashboard** | Manager | Executive overview with KPIs, escalations feed, site performance, and trend charts |
| **Manager Escalations** | Manager | Full escalation triage with filter/search, resolve/reopen actions |
| **Manager All Tasks** | Manager | Cross-team task visibility with escalation badges and supervisor attribution |
| **Manager Task Detail** | Manager | Comprehensive task detail with escalation history, reviews, and evidence |
| **Manager Team Performance** | Manager | Per-person and per-site analytics with Top Performers and Needs Attention spotlights |
| **Manager Reports** | Manager | Configurable report builder with multi-filter, group-by toggle, and CSV export |

### 9.2 User Experience Principles

| Principle | How It's Applied |
|---|---|
| **Colour-coded priority system** | Critical = Red, High = Orange, Medium = Yellow, Low = Green — consistent across all views, badges, borders, and chart bars |
| **Progressive urgency indicators** | Pulsing dots for overdue items, red backgrounds for critical escalations, animated ping effects for attention areas |
| **Action-oriented dashboards** | Every metric card links to a relevant action page (e.g., "Pending Reviews: 4" links to review queue) |
| **Mobile-first responsive design** | Desktop sidebar collapses to bottom tab bar on mobile; tables collapse to card layouts; touch targets ≥ 44px |
| **Optimistic UI updates** | Resolve/reopen actions update the UI immediately before server confirmation, with error rollback |
| **Contextual empty states** | Every list shows a tailored empty state with icon + message + clear-filters CTA (not generic "No data") |
| **Time-based personalization** | Staff dashboard greeting changes: "Good morning", "Good afternoon", "Good evening" + personalised motivation taglines |
| **Hydration-safe time rendering** | Relative timestamps (e.g., "3 hours ago") suppressed during SSR to prevent hydration mismatches, with `suppressHydrationWarning` |
| **Dark sidebar navigation** | High-contrast sidebar with active-route indicators (indigo left border + background change) for instant wayfinding |
| **Responsive typography** | Size scales from mobile (text-2xl) to desktop (text-3xl) for headings; body text uses fixed 13–14px for readability |

---

## 10. Reporting & Analytics

### 10.1 Available Report Types

| Report | Available To | Content | Export |
|---|---|---|---|
| **Operational Overview** | Manager | Today's KPIs, completion rate trend, SLA compliance, site breakdown, 7-day chart | CSV (site data) |
| **Staff Performance Report** | Supervisor, Manager | Per-staff: assigned, completed, overdue, rejected, completion rate, avg cycle time | CSV |
| **Site Performance Report** | Manager | Per-site: assigned, completed, overdue, escalations, headcount, completion rate | CSV |
| **Escalation Report** | Manager | Open/critical/resolved escalation counts, task details, escalation reasons | CSV (via export) |
| **Evidence Audit Log** | Supervisor, Manager | Evidence ID, task title, site, submitted by, date, photo URL, notes | CSV |
| **Team Summary** | Supervisor, Manager | Headcount, team completion rate, on-time rate, overdue count | Dashboard view |

### 10.2 Analytics Insights

| Insight | Role | Data Source |
|---|---|---|
| Week-over-week completion rate trend (with directional arrow) | Manager | This week vs previous week completed/total ratio |
| SLA compliance percentage (tasks completed before due date) | Manager | Completed on-time / total completed |
| Per-staff completion rate with colour coding (green ≥ 90%, amber ≥ 70%, red < 70%) | Both | Completed / assigned ratio |
| Average task completion time (hours) | Supervisor | (completed_at - created_at) average |
| Top Performers ranking (top 3 by completion rate, ≥ 3 tasks threshold) | Manager | Filtered by minimum activity |
| Needs Attention flag (overdue > 0, or rate < 60%, or escalations > 0) | Manager | Multi-criteria filter |
| Site risk ranking (sorted by overdue desc → rate asc → escalations desc) | Manager | Composite sort |
| AI-powered contextual insights (up to 3 rule-based recommendations) | Supervisor | Overdue count, pending reviews, completion velocity |

---

## 11. Security & Compliance

### 11.1 Authentication & Authorisation

| Layer | Mechanism |
|---|---|
| **Identity Provider** | Supabase Auth (built on GoTrue) — industry-standard email/password with bcrypt hashing |
| **Session Management** | JWT tokens stored in secure, httpOnly, SameSite cookies; auto-refreshed by middleware on every request |
| **Role Enforcement (Application)** | Next.js middleware validates user role against route pattern; mismatches redirect to correct dashboard |
| **Role Enforcement (Database)** | PostgreSQL Row-Level Security (RLS) policies on every table — queries physically cannot return unauthorized rows |
| **API Protection** | Scheduled escalation endpoint requires `Authorization: Bearer {CRON_SECRET}` header |
| **Server Actions** | Every mutation re-verifies `supabase.auth.getUser()` and task ownership before executing |

### 11.2 Data Protection

| Measure | Detail |
|---|---|
| **Data isolation** | RLS ensures staff see only their own tasks, evidence, and reviews. No cross-staff data leakage possible. |
| **Input sanitisation** | Server-side validation on all form inputs (title length, required fields, URL origin verification for photos) |
| **Photo URL validation** | `completeTask()` server action verifies photo URLs originate from the application's Supabase Storage domain — prevents URL injection or phishing links |
| **Storage security** | Supabase Storage buckets with RLS-equivalent policies; photos accessible only to authorized roles |
| **Push subscription isolation** | Users can only manage their own push notification subscriptions (RLS enforced) |
| **Expired subscription cleanup** | Push notifications auto-remove subscriptions that return HTTP 410 Gone (device unregistered) |
| **No client-side secrets** | All sensitive operations (task mutations, review actions, escalation engine) execute server-side via Server Actions or API routes |

### 11.3 Audit Trail

Every action in the system is tracked with attribution and timestamp:

| Event | Recorded Data |
|---|---|
| Task created | Who created it, when, who it was assigned to, priority, due date |
| Task started | Who started it, when (status transition to in_progress) |
| Task completed | Who completed it, when, photo evidence URL, notes |
| Task reviewed | Who reviewed it, when, action (approved/rejected), comment/reason |
| Task reassigned | Who reassigned it, new assignee, new due date |
| Escalation created | Who escalated, who it was escalated to, reason, timestamp |
| Escalation resolved | Resolution status change, timestamp |
| Profile updated | Avatar change, timestamp |

---

## 12. Integrations

### 12.1 Current Integrations

| Integration | Type | Purpose |
|---|---|---|
| **Supabase Auth** | Authentication | User identity, session management, role storage |
| **Supabase Storage** | File Storage | Photo evidence and avatar image hosting with CDN delivery |
| **Supabase Realtime** | WebSocket | Live dashboard updates across all connected clients |
| **Web Push (VAPID)** | Push Notifications | Browser-level push alerts for task events |
| **Vercel Cron** | Scheduled Jobs | 30-minute escalation engine trigger |
| **Netlify Scheduled Functions** | Scheduled Jobs | Alternative 30-minute escalation trigger for Netlify deployments |

### 12.2 Integration-Ready Architecture

TaskMe's API-first design and Supabase backend make it straightforward to add:

| Potential Integration | Approach |
|---|---|
| **Email notifications** | Supabase Edge Functions or SendGrid/Postmark webhook on task events |
| **Calendar sync** (Google Calendar, Outlook) | iCal feed generation from task due dates; Google Calendar API for bidirectional sync |
| **Slack / Microsoft Teams** | Incoming webhooks for escalation alerts and daily summary posts |
| **HR / Payroll systems** | CSV export already available; REST API endpoint can be exposed for direct integration |
| **Property Management Systems** (Opera, Fidelio) | Webhook-based task creation from PMS room-status changes |
| **IoT Sensors** | API-triggered task creation (e.g., sensor detects maintenance issue → auto-create task) |
| **SSO (SAML/OIDC)** | Supabase Auth supports SAML 2.0 and third-party OIDC providers on enterprise plans |

---

## 13. Future Enhancements

### 13.1 Planned Roadmap

| Phase | Enhancement | Description | Business Impact |
|---|---|---|---|
| **Phase 1** | **AI-Powered Task Suggestions** | Machine learning model analyses historical completion patterns, workload distribution, and staff competency to suggest optimal task assignments and realistic due dates | 25–30% reduction in overdue tasks through smarter scheduling |
| **Phase 1** | **Automation Workflows** | Configurable rules engine: "When a task is completed at Site X, auto-create follow-up inspection task for Supervisor Y" | Eliminates manual follow-up task creation, reduces supervisor admin time by 40% |
| **Phase 2** | **Native Mobile App** (iOS + Android) | React Native or Capacitor wrapper for app store distribution with offline support, camera integration, and background location | Offline-capable for basement/remote sites; native camera for faster photo capture |
| **Phase 2** | **Recurring Tasks & Templates** | Schedule daily/weekly/monthly recurring tasks (e.g., "Daily lobby cleaning at 6 AM") with editable templates | Eliminates repetitive task creation; ensures routine operations never missed |
| **Phase 2** | **Custom Fields & Forms** | Configurable task forms per site or task type (e.g., "Temperature reading" field for F&B, "Resident mood" for aged care) | Adapts to industry-specific data capture without code changes |
| **Phase 3** | **Advanced Analytics Dashboard** | Recharts-powered analytics: heatmaps (overdue by hour-of-day), Pareto charts (80/20 problem areas), trend lines with forecasting | Data-driven operational improvement; identify systemic issues |
| **Phase 3** | **Client Portal** | Read-only dashboard for property owners or clients to view SLA compliance, completion photos, and incident reports | Reduces reporting overhead; builds client trust through transparency |
| **Phase 3** | **Geofencing & Location Verification** | GPS-based verification that photo evidence was captured at the correct site location | Prevents fraudulent "completing" tasks from remote locations |
| **Phase 4** | **Multi-Tenant Architecture** | Organisation-level isolation for SaaS deployment (each client gets independent data, branding, and user base) | Enables SaaS monetisation at scale |
| **Phase 4** | **Offline Mode** | Service worker caching for task list and submission queue; sync when back online | Critical for sites with poor connectivity (basements, rural areas) |

### 13.2 AI & Machine Learning Opportunities

| Capability | Data Source | Output |
|---|---|---|
| Optimal assignee prediction | Historical completion rates, cycle times, current workload | "Assign to Sarah — she has 85% on-time rate for this task type and only 2 active tasks" |
| Due date estimation | Historical cycle times by task type, priority, and site | "Suggested due date: 3.5 hours from now (based on similar tasks)" |
| Anomaly detection | Completion photo analysis (computer vision) | Flag potentially fraudulent evidence (stock photos, wrong location, poor quality) |
| Workload balancing | Active task counts, completion velocity, scheduled shifts | Alert supervisor when staff workload exceeds sustainable threshold |
| Escalation prediction | Historical overdue patterns, staff response times | "This task has a 78% probability of escalation — consider reassigning" |

---

## 14. Value Proposition

### 14.1 Why TaskMe Stands Out

| Differentiator | TaskMe | Traditional Tools (Trello, Asana, Monday) | WhatsApp / Paper |
|---|---|---|---|
| **Photo-verified completion** | ✅ Mandatory evidence with timestamped audit trail | ❌ Status-only (no proof of work) | ❌ Photos lost in chat history |
| **3-tier auto-escalation** | ✅ Automated detection at 1h/3h/6h with graduated response | ❌ Manual follow-up only | ❌ No tracking at all |
| **Role-specific views** | ✅ Staff, Supervisor, Manager each see exactly what they need | ⚠️ One-size-fits-all boards | ❌ Everyone sees everything |
| **Built for field operations** | ✅ Mobile-first PWA, touch-optimised, no training needed | ⚠️ Desktop-first, complex setup | ✅ Familiar but unstructured |
| **SLA compliance tracking** | ✅ On-time rate, completion trends, exportable evidence logs | ⚠️ Basic time tracking | ❌ No data |
| **Real-time push alerts** | ✅ Web Push to lock screen, even when app is closed | ⚠️ In-app only | ✅ But mixed with personal chats |
| **Database-level security** | ✅ Row-Level Security (no data leakage between users) | ⚠️ Application-level only | ❌ None |
| **Multi-language support** | ✅ English + Chinese with auto-detection | ⚠️ Varies | ❌ N/A |
| **Zero installation** | ✅ PWA — works from browser, add to home screen | ❌ Requires app install | ✅ Already installed |
| **Industry-specific design** | ✅ Hospitality, FM, aged care workflows built in | ❌ Generic project management | ❌ N/A |

### 14.2 Return on Investment (ROI)

| Metric | Before TaskMe | After TaskMe | Impact |
|---|---|---|---|
| **Task completion tracking** | Manual (estimated 60% captured) | 100% digital capture | +40% task visibility |
| **Time to detect overdue tasks** | 4–8 hours (next site walk / shift handover) | 1 hour (automatic Tier 1 alert) | 75–87% faster detection |
| **Supervisor reporting time** | 2–3 hours/week compiling from memory | 5 minutes (one-click export) | 90% time savings |
| **Evidence disputes with clients** | Frequent (no proof) | Near-zero (timestamped photos) | Significant risk reduction |
| **Staff accountability** | Subjective ("I did it") | Objective (photo + timestamp + review) | Measurable performance data |
| **Escalation response time** | Hours to days | Minutes (push notification to manager) | 95% faster response |
| **Onboarding time for new staff** | 1–2 hours (paper/app training) | < 15 minutes (role-specific simple UI) | 85% faster onboarding |
| **Compliance audit preparation** | Days of manual compilation | Minutes (CSV export + evidence log) | 95% reduction in audit prep |

### 14.3 Pricing Recommendation

| Plan | Target | Price Point | Includes |
|---|---|---|---|
| **Starter** | Small teams (≤ 20 users) | S$3/user/month | All core features, 1 site, email support |
| **Professional** | Mid-size operations (21–100 users) | S$5/user/month | All features, unlimited sites, priority support, custom branding |
| **Enterprise** | Large organisations (100+ users) | Custom pricing | SSO/SAML, API access, dedicated support, SLA guarantee, on-premise option |

---

## Document Control

| Field | Value |
|---|---|
| Document Title | TaskMe — Project Feature Document |
| Version | 2.0 |
| Author | TaskMe Product Team |
| Status | Final |
| Date | May 2026 |
| Classification | Confidential — Client Proposal |

---

*This document describes the current production capabilities and planned roadmap of the TaskMe platform. All features listed under Core Features (Section 4) and Functional Requirements (Section 5) are fully implemented and operational. Features listed under Future Enhancements (Section 13) represent planned development and are subject to prioritisation based on client requirements.*
