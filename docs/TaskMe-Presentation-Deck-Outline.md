# TaskMe — Client Presentation Deck Outline

**Deck Type:** Client Proposal Presentation
**Slides:** 12
**Duration:** 20–25 minutes
**Audience:** Operations Directors, Facility Managers, Hospitality GMs

---

## Slide 1 — Title Slide

**Headline:** TaskMe — Accountability-Driven Task Management for Field Operations

- Tagline: *"Stop managing tasks on WhatsApp. Start proving they're done."*
- Logo / product screenshot (dashboard)
- Date, presenter name, "Confidential — Client Proposal"

**Speaker notes:** Open with the WhatsApp pain point — every operations manager recognises it. This positions TaskMe immediately against their current reality, not against competitors.

---

## Slide 2 — The Problem

**Headline:** Your Operations Run on Trust. They Should Run on Proof.

| Today's Reality | The Cost |
|---|---|
| Tasks assigned via WhatsApp, verbal instructions, or paper | 30–40% of instructions forgotten or untracked |
| No proof of completion — "he said / she said" | Client disputes, regulatory risk, SLA penalties |
| Delays discovered hours later during site walks | 4–8 hour delay before overdue tasks are caught |
| Weekly reports compiled manually from memory | 2–3 hours/week of supervisor time wasted |
| No way to compare staff or site performance | Underperformers invisible until incidents occur |

**Visual:** Split-screen — left side: chaotic WhatsApp group screenshot. Right side: clean TaskMe dashboard.

**Speaker notes:** Don't linger. This slide builds urgency. Ask the client: "How many tasks did your team lose last month?" Then move to the solution.

---

## Slide 3 — The Solution

**Headline:** One Platform. Complete Accountability Chain.

**6-step visual flow (horizontal pipeline):**

```
Task Created → Staff Notified → Photo Submitted → Supervisor Reviews → Auto-Escalation → Audit Trail
(Supervisor)    (Push alert)     (Mandatory)       (Approve/Reject)    (1h/3h/6h tiers)  (Exportable)
```

**Key message:** Every task has a creator, an owner, a photo, a reviewer, and a timestamp. Nothing falls through the cracks.

**Speaker notes:** Walk through the chain quickly. Emphasise "mandatory photo evidence" — this is the feature that closes deals. Clients care about proof, not dashboards.

---

## Slide 4 — Role-Based Design

**Headline:** Three Roles. Each Sees Only What They Need.

**Three columns:**

| Staff | Supervisor | Manager |
|---|---|---|
| *"What do I need to do?"* | *"Is my team delivering?"* | *"How's the operation running?"* |
| View assigned tasks | Create & assign tasks | Full operational overview |
| Start task, submit photo evidence | Review completions (Approve/Reject) | Escalation triage (Resolve/Reopen) |
| Track own completion history | Reassign or escalate tasks | Cross-team & cross-site analytics |
| Receive push notifications | Monitor team performance | SLA compliance & trend reports |
| Multi-language interface (EN/ZH) | Generate & export reports | Supervisor performance breakdown |

**Visual:** Three phone/desktop mockups side by side showing each role's dashboard.

**Speaker notes:** Stress simplicity for staff — "Your cleaners open the app, see their tasks, tap to complete. No training needed." Then contrast with the depth available to managers.

---

## Slide 5 — Core Feature: Photo-Verified Completion

**Headline:** Every Task Has Proof. Every Proof Has a Timestamp.

**3-step completion wizard:**
1. **Upload Photo** — Take or select photo of completed work
2. **Add Details** — Notes field for context ("Found damage, reported to supervisor")
3. **Review & Submit** — Confirm before submission

**Key data points:**
- Photos stored in secure cloud storage with CDN delivery
- Server-side URL validation prevents tampering
- Multiple evidence submissions per task (before/after photos)
- Timestamped, attributed, and exportable for audits

**Visual:** Phone mockup showing the 3-step wizard with a real cleaning photo.

**Speaker notes:** This is the killer feature. Ask: "How do you currently prove to a client that Room 405 was cleaned at 2:14 PM on Tuesday?" Pause. Let the silence do the work.

---

## Slide 6 — Core Feature: Automated Escalation Engine

**Headline:** Problems Found in Minutes, Not Hours.

**3-tier escalation diagram:**

| Tier | Trigger | What Happens |
|---|---|---|
| **Tier 1** | 1 hour overdue | Task marked overdue. Staff receives push alert. |
| **Tier 2** | 3 hours overdue | Escalated to manager. Manager receives push alert. |
| **Tier 3** | 6 hours overdue | Priority auto-upgraded to CRITICAL. Both staff + manager alerted. |

**Key data points:**
- Runs automatically every 30 minutes (zero human effort)
- Deduplication prevents repeat alerts
- Manager resolves or reopens from Escalations dashboard
- Full escalation history preserved for post-incident review

**Stat callout:** *"From 4–8 hours to detect a delay → 1 hour. That's 75–87% faster."*

**Speaker notes:** Walk through a real scenario: "Your housekeeper was supposed to finish Room 405 by 2 PM. At 3 PM, no one notices. At 5 PM, the supervisor discovers it during the site walk. The guest complains at 6 PM. With TaskMe, the system flags it at 3 PM. The manager knows at 5 PM. The guest never notices."

---

## Slide 7 — Core Feature: Review Workflow & Quality Gate

**Headline:** Completed ≠ Done. Done = Reviewed and Approved.

**4-action panel:**
- **Approve** — Optional comment ("Looks great, well done")
- **Reject** — Required reason with quick-select options (Photo unclear / Task incomplete / Wrong location / Needs redo)
- **Escalate** — Raise to manager with reason (manager notified immediately)
- **Reassign** — Transfer to different staff with new deadline

**Key message:** Rejected tasks return to the staff member's active list with the rejection reason visible — creating a closed feedback loop.

**Visual:** Desktop mockup of review detail page showing photo evidence + action buttons.

**Speaker notes:** "Your supervisors currently walk the floor and spot-check. With TaskMe, they review every completion from their phone — anywhere, anytime. And if the work isn't good enough, the staff sees exactly why it was rejected and what to fix."

---

## Slide 8 — Dashboards & Real-Time Visibility

**Headline:** Live Data. Not Last Week's Spreadsheet.

**Three dashboard highlights (tabbed or tiled):**

**Manager Dashboard:**
- 4 executive KPIs (Total Tasks, Completion Rate with trend, Overdue, Escalations)
- Site performance table sorted by risk
- Supervisor breakdown table
- 7-day completed vs overdue trend chart

**Supervisor Dashboard:**
- Pending review queue with inline CTAs
- AI-powered insight cards (up to 3 contextual recommendations)
- Real-time activity feed (completions, submissions, escalations)

**Staff Dashboard:**
- Priority-sorted task list with "Start Next Task" CTA
- Overdue alerts with countdown
- Personal SLA compliance percentage

**Key data points:**
- Real-time WebSocket updates — dashboards refresh automatically
- Push notifications to lock screen (even when app is closed)
- Mobile-responsive: sidebar on desktop, bottom tabs on mobile

**Speaker notes:** Demo the manager dashboard live if possible. Show the 7-day trend chart and site performance table — these are the visuals that resonate with operations directors.

---

## Slide 9 — Reporting & Export

**Headline:** From Data to Decision in One Click.

**Report capabilities:**
- **Date range:** Quick pills (Today / 7d / 30d / 90d) or custom range
- **Filters:** Site, Staff, Priority, Status (7 status options including Approved / In Review)
- **Group by:** Per-staff or per-site toggle
- **Sort by:** Any column (Name, Assigned, Completed, Overdue, Rate, Escalations)
- **Pagination:** 10 rows per page for large teams
- **Export:** CSV download (task data, evidence audit log)

**Report types available:**

| Report | Who Uses It | Use Case |
|---|---|---|
| Staff Performance | Supervisor, Manager | Monthly reviews, bonus decisions |
| Site Performance | Manager | Client SLA reporting, resource allocation |
| Escalation Summary | Manager | Incident post-mortems, process improvement |
| Evidence Audit Log | Supervisor, Manager | Regulatory compliance, dispute resolution |

**Stat callout:** *"From 2–3 hours compiling reports → 5 minutes. 90% time saved."*

**Speaker notes:** If the client mentions compliance audits, emphasise the evidence audit log — "Every photo, every timestamp, every reviewer, exportable in one click."

---

## Slide 10 — Security & Compliance

**Headline:** Enterprise-Grade Security. Zero Compromise.

**6 security pillars (icon grid):**

| Pillar | Detail |
|---|---|
| 🔐 **Authentication** | Supabase Auth with bcrypt-hashed passwords and JWT session tokens |
| 🛡️ **Database-Level Access Control** | PostgreSQL Row-Level Security — queries physically cannot return unauthorised data |
| ✅ **Server-Side Validation** | Every mutation re-verifies identity and ownership before executing |
| 📸 **Photo URL Validation** | Evidence URLs verified to originate from application storage (prevents injection) |
| 🔒 **Session Management** | JWT auto-refreshed on every request; expired sessions force re-login |
| 📋 **Complete Audit Trail** | Every task action attributed with who, what, and when — immutable record |

**Compliance readiness:** Exportable evidence logs, timestamped audit trail, role-based data isolation — ready for ISO, BCA, MOM, and client-specific compliance requirements.

**Speaker notes:** For enterprise clients, lead with RLS: "Unlike most apps where security is in the application code, TaskMe enforces access rules at the database level. Even if there were an application bug, a staff member physically cannot query another staff member's data. The database won't allow it."

---

## Slide 11 — Implementation & Roadmap

**Headline:** Live in Days. Evolving for Years.

**Implementation timeline:**

| Phase | Timeline | Deliverable |
|---|---|---|
| **Setup & Configuration** | Day 1–2 | Supabase project, user accounts, site configuration |
| **Staff Onboarding** | Day 3–5 | Role-specific 15-minute training sessions, PWA installation |
| **Pilot (1 site)** | Week 1–2 | Live operation at one site with daily check-ins |
| **Full Rollout** | Week 3–4 | All sites live, reporting configured, escalation rules tuned |

**Future roadmap highlights (4 items):**
- **AI-Powered Assignment** — Optimal assignee suggestions based on workload and historical performance
- **Recurring Tasks & Templates** — Auto-schedule daily/weekly routines (e.g., "Lobby cleaning at 6 AM daily")
- **Native Mobile App** — iOS + Android with offline support and native camera
- **Client Portal** — Read-only dashboard for property owners to view SLA compliance and completion photos

**Speaker notes:** Keep it simple. Clients don't want a 6-month implementation. Emphasise: "PWA means no app store, no IT department involvement, no device provisioning. Your staff open a link and start working."

---

## Slide 12 — ROI & Call to Action

**Headline:** The Numbers That Matter.

**ROI table (before → after):**

| Metric | Before | After | Impact |
|---|---|---|---|
| Task visibility | ~60% captured | 100% digital | **+40%** |
| Delay detection | 4–8 hours | 1 hour (auto) | **75–87% faster** |
| Reporting time | 2–3 hrs/week | 5 minutes | **90% savings** |
| Evidence disputes | Frequent | Near-zero | **Risk eliminated** |
| Staff onboarding | 1–2 hours | 15 minutes | **85% faster** |
| Audit preparation | Days | Minutes | **95% reduction** |

**Pricing summary:**

| Plan | Users | Price |
|---|---|---|
| Starter | ≤ 20 | S$3/user/month |
| Professional | 21–100 | S$5/user/month |
| Enterprise | 100+ | Custom |

**Call to action:**
> *"Let us run a 2-week pilot at one of your sites. No commitment. See the results in your own operation."*

**Speaker notes:** End with the pilot offer. Don't ask for a purchase decision — ask for a pilot. The product sells itself once they see their own data flowing through the system. Close with: "Which site should we start with?"

---

## Appendix — Presentation Delivery Notes

**Before the meeting:**
- Pre-load the live demo (manager dashboard with seed data)
- Have the landing page open on a phone to demo PWA installation
- Prepare a 2-minute live walkthrough: create task → staff completes → supervisor reviews

**During the presentation:**
- Slides 1–3: Problem + Solution (5 min) — build urgency
- Slides 4–8: Feature deep-dive (10 min) — show, don't tell
- Slide 9–10: Reports + Security (3 min) — address enterprise concerns
- Slides 11–12: Implementation + ROI (5 min) — close with the pilot offer

**Key objection responses:**
- *"We already use [Trello/Asana]"* → "Those are project management tools. TaskMe is built for field operations — mandatory photo evidence, auto-escalation, and role-specific views aren't available in generic tools."
- *"Our staff aren't tech-savvy"* → "Staff see 3 buttons: My Tasks, Start, Complete. The interface is in their language. Average training time is under 15 minutes."
- *"What about data security?"* → "Row-Level Security at the database layer. Your staff physically cannot see each other's data — it's enforced by PostgreSQL, not by our application code."
- *"We need to see it work first"* → "That's exactly what the 2-week pilot is for. One site, your real tasks, your real team. Zero commitment."
