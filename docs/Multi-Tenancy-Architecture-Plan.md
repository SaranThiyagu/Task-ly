# TaskMe — Multi-Tenancy (Organization) Architecture Plan

> **Prepared by:** Senior Product Analyst  
> **Date:** May 1, 2026  
> **Scope:** Database + Application changes to support Organization → Manager → Supervisor → Staff hierarchy

---

## 1. Current State (The Problem)

```
TODAY: Flat, Single-Tenant Architecture
┌─────────────────────────────────────────────┐
│                  DATABASE                    │
│                                              │
│  Manager ──sees──▶ ALL supervisors globally  │
│  Supervisor ─sees─▶ ALL staff globally       │
│  Tasks ──────────▶ NO org boundary           │
│  Escalations ────▶ Routed to ANY manager     │
│  Reports ────────▶ Mix ALL orgs' data        │
│                                              │
│  ❌ No `org_id` on any table                 │
│  ❌ No `organizations` table                 │
│  ❌ No explicit team/hierarchy mapping       │
│  ❌ RLS scoped by role only, not org         │
│  ❌ site_location is just TEXT, not FK       │
└─────────────────────────────────────────────┘
```

**Impact if you onboard 2 customers today:**
- Customer A's manager sees Customer B's tasks, staff, and escalations
- Customer A's supervisor can assign tasks to Customer B's staff
- Escalation engine picks random manager from either org
- Reports mix data from both customers
- **Complete data leak between organizations**

---

## 2. Target State

```
TARGET: Organization-Scoped Multi-Tenant Architecture

┌─ Org: CleanPro ──────────────────┐   ┌─ Org: BrightCare ──────────────┐
│                                   │   │                                 │
│  Manager: David Wong              │   │  Manager: Lisa Chen             │
│    ├─ Supervisor: Michael Lim     │   │    ├─ Supervisor: James Ong     │
│    │    ├─ Staff: Sarah Tan       │   │    │    ├─ Staff: Mei Lin       │
│    │    ├─ Staff: Ahmad Yusof     │   │    │    └─ Staff: Ravi Kumar    │
│    │    └─ Staff: Priya Nair      │   │    └─ Supervisor: Amy Teo       │
│    └─ Supervisor: Rachel Lee      │   │         └─ Staff: John Doe      │
│         └─ Staff: Tom Koh         │   │                                 │
│                                   │   │  Sites: Bishan Care, AMK Care   │
│  Sites: MBS Level 3, Raffles      │   │                                 │
│  Tasks: 150 (org-scoped)          │   │  Tasks: 89 (org-scoped)         │
│  Escalations: org-internal only   │   │  Escalations: org-internal only │
│                                   │   │                                 │
│  🔒 ZERO visibility into ──────────X────── BrightCare's data           │
└───────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 3. Recommended Approach: `org_id` Column Strategy

### Why This Approach (vs. Alternatives)

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **A. `org_id` column on every table** | Simple, single DB, shared infrastructure, easy queries | Requires careful RLS | ✅ **RECOMMENDED** |
| B. Separate Supabase project per org | Perfect isolation | Expensive, complex deployment, no cross-org admin view | ❌ Over-engineered |
| C. Schema-per-org (PostgreSQL schemas) | Good isolation | Complex migrations, Supabase doesn't support well | ❌ Not compatible |
| D. Application-level filtering only | Quick to build | Insecure — one bug = data leak, no DB-level guarantee | ❌ Dangerous |

**Approach A wins** because:
- Single deployment, single database, single codebase
- RLS at PostgreSQL level = bulletproof data isolation
- Supabase supports this pattern natively
- Easy to add orgs without infrastructure changes
- Can still build a super-admin view across orgs later

---

## 4. Database Changes (Migration 003)

### 4.1 New Tables

```sql
-- ============================================================
-- MIGRATION 003: Multi-Tenancy (Organizations)
-- ============================================================

-- ── 1. ORGANIZATIONS TABLE ──────────────────────────────────
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,                    -- "CleanPro Services"
  slug        TEXT NOT NULL UNIQUE,             -- "cleanpro" (URL-safe)
  logo_url    TEXT,                             -- Organization logo
  is_active   BOOLEAN NOT NULL DEFAULT true,    -- Soft disable org
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. SITES TABLE (replaces TEXT site_location) ────────────
CREATE TABLE sites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                    -- "Marina Bay Sands - Level 3"
  address     TEXT,                             -- Physical address
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)                         -- No duplicate site names within org
);

CREATE INDEX idx_sites_org_id ON sites(org_id);
```

### 4.2 Alter Existing Tables

```sql
-- ── 3. ADD org_id TO PROFILES ───────────────────────────────
ALTER TABLE profiles
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- For supervisor → staff mapping (who manages whom)
ALTER TABLE profiles
  ADD COLUMN reports_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_profiles_reports_to ON profiles(reports_to);

-- ── 4. ADD org_id TO TASKS ──────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Replace TEXT site_location with FK to sites table
ALTER TABLE tasks
  ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_org_id ON tasks(org_id);
CREATE INDEX idx_tasks_site_id ON tasks(site_id);

-- ── 5. ADD org_id TO ESCALATIONS ────────────────────────────
ALTER TABLE escalations
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_escalations_org_id ON escalations(org_id);

-- ── 6. ADD org_id TO TASK_EVIDENCE (optional but good) ──────
ALTER TABLE task_evidence
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_task_evidence_org_id ON task_evidence(org_id);

-- ── 7. ADD org_id TO TASK_REVIEWS (optional but good) ───────
ALTER TABLE task_reviews
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_task_reviews_org_id ON task_reviews(org_id);
```

### 4.3 Helper Function (Get User's Org)

```sql
-- ── 8. HELPER: Get current user's org_id ────────────────────
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$;
```

### 4.4 Updated RLS Policies

```sql
-- ── 9. DROP OLD POLICIES & CREATE ORG-SCOPED ONES ───────────

-- ─── PROFILES ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Supervisors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can view task creator profiles" ON profiles;

-- Users see own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Users see profiles in SAME org only
CREATE POLICY "Users can view org profiles"
  ON profiles FOR SELECT
  USING (org_id = get_user_org_id());

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ─── ORGANIZATIONS ─────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = get_user_org_id());

-- ─── SITES ──────────────────────────────────────────────────
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org sites"
  ON sites FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Managers can manage org sites"
  ON sites FOR ALL
  USING (org_id = get_user_org_id() AND get_user_role() = 'manager');

-- ─── TASKS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff can view own assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Supervisors can view team tasks" ON tasks;
DROP POLICY IF EXISTS "Supervisors can create tasks" ON tasks;
DROP POLICY IF EXISTS "Supervisors can update tasks" ON tasks;
DROP POLICY IF EXISTS "Staff can update assigned tasks" ON tasks;

-- Staff see own tasks (within org)
CREATE POLICY "Staff can view own tasks"
  ON tasks FOR SELECT
  USING (
    org_id = get_user_org_id()
    AND (assigned_to = auth.uid() OR created_by = auth.uid())
  );

-- Supervisors/Managers see all tasks in their org
CREATE POLICY "Supervisors view org tasks"
  ON tasks FOR SELECT
  USING (
    org_id = get_user_org_id()
    AND get_user_role() IN ('supervisor', 'manager')
  );

-- Supervisors/Managers create tasks in their org
CREATE POLICY "Supervisors create org tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id()
    AND get_user_role() IN ('supervisor', 'manager')
  );

-- Task updates scoped to org
CREATE POLICY "Update tasks within org"
  ON tasks FOR UPDATE
  USING (
    org_id = get_user_org_id()
    AND (
      assigned_to = auth.uid()
      OR get_user_role() IN ('supervisor', 'manager')
    )
  );

-- ─── ESCALATIONS ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own escalations" ON escalations;
DROP POLICY IF EXISTS "Supervisors can create escalations" ON escalations;
DROP POLICY IF EXISTS "Managers can update escalations" ON escalations;

CREATE POLICY "View org escalations"
  ON escalations FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Create org escalations"
  ON escalations FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Managers resolve org escalations"
  ON escalations FOR UPDATE
  USING (
    org_id = get_user_org_id()
    AND get_user_role() = 'manager'
  );

-- ─── TASK_EVIDENCE ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view evidence" ON task_evidence;
DROP POLICY IF EXISTS "Users can submit evidence" ON task_evidence;

CREATE POLICY "View org evidence"
  ON task_evidence FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Submit org evidence"
  ON task_evidence FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

-- ─── TASK_REVIEWS ───────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view reviews" ON task_reviews;
DROP POLICY IF EXISTS "Supervisors can create reviews" ON task_reviews;

CREATE POLICY "View org reviews"
  ON task_reviews FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Create org reviews"
  ON task_reviews FOR INSERT
  WITH CHECK (org_id = get_user_org_id());
```

### 4.5 Data Migration (Backfill Existing Data)

```sql
-- ── 10. BACKFILL EXISTING DATA ──────────────────────────────

-- Create default org for existing data
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'CleanPro Demo', 'cleanpro-demo');

-- Assign all existing profiles to default org
UPDATE profiles
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

-- Assign all existing tasks
UPDATE tasks
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

-- Assign all existing escalations
UPDATE escalations
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

-- Assign all existing evidence
UPDATE task_evidence
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

-- Assign all existing reviews
UPDATE task_reviews
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

-- Create sites from existing TEXT values
INSERT INTO sites (org_id, name)
SELECT DISTINCT
  '00000000-0000-0000-0000-000000000001',
  site_location
FROM tasks
WHERE site_location IS NOT NULL AND site_location != '';

-- Link tasks to site records
UPDATE tasks t
SET site_id = s.id
FROM sites s
WHERE s.name = t.site_location
  AND s.org_id = '00000000-0000-0000-0000-000000000001';

-- Set reports_to for existing hierarchy
-- (David Wong → Manager, Michael Lim → reports to David)
-- Run manually or via seed script update

-- ── 11. MAKE org_id NOT NULL (after backfill) ───────────────
ALTER TABLE profiles ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE escalations ALTER COLUMN org_id SET NOT NULL;
```

### 4.6 Final Schema Diagram

```
┌─────────────────────┐
│   ORGANIZATIONS     │
│─────────────────────│
│ id (PK)             │
│ name                │
│ slug (UNIQUE)       │
│ logo_url            │
│ is_active           │
│ created_at          │
└──────┬──────────────┘
       │ 1
       │
       ├──────────────────────────────────────────────┐
       │ N                                            │ N
┌──────▼──────────────┐                     ┌─────────▼───────────┐
│     PROFILES        │                     │       SITES         │
│─────────────────────│                     │─────────────────────│
│ id (PK, FK users)   │                     │ id (PK)             │
│ org_id (FK) ★ NEW   │                     │ org_id (FK) ★ NEW   │
│ full_name           │                     │ name                │
│ email               │◄─── reports_to ──┐  │ address             │
│ role                │     ★ NEW        │  │ is_active           │
│ reports_to (FK) ★   │─────────────────-┘  └─────────┬───────────┘
│ avatar_url          │                               │
│ created_at          │                               │
└──┬──────┬───────────┘                               │
   │      │                                           │
   │      │ assigned_to / created_by                  │ site_id
   │      │                                           │
   │  ┌───▼───────────────────────────────────────────▼──┐
   │  │                 TASKS                             │
   │  │──────────────────────────────────────────────────-│
   │  │ id (PK)                                           │
   │  │ org_id (FK) ★ NEW                                 │
   │  │ site_id (FK) ★ NEW                                │
   │  │ title, description                                │
   │  │ assigned_to (FK profiles)                         │
   │  │ created_by (FK profiles)                          │
   │  │ site_location (TEXT — DEPRECATED, keep for compat)│
   │  │ priority, status, due_date, completed_at          │
   │  └──┬──────────┬──────────┬──────────────────────────┘
   │     │          │          │
   │     │          │          │
   │  ┌──▼──────┐ ┌▼────────┐ ┌▼────────────┐
   │  │EVIDENCE │ │REVIEWS  │ │ESCALATIONS  │
   │  │─────────│ │─────────│ │─────────────│
   │  │org_id ★ │ │org_id ★ │ │org_id ★ NEW │
   │  │task_id  │ │task_id  │ │task_id      │
   │  │photo_url│ │action   │ │reason       │
   │  │notes    │ │comment  │ │is_resolved  │
   │  └─────────┘ └─────────┘ └─────────────┘
```

---

## 5. `reports_to` — Hierarchy Mapping

### How It Works

```
Organization: CleanPro
│
├── David Wong (Manager, reports_to: NULL)          ← top of hierarchy
│   ├── Michael Lim (Supervisor, reports_to: David) ← reports to manager
│   │   ├── Sarah Tan (Staff, reports_to: Michael)  ← reports to supervisor
│   │   ├── Ahmad (Staff, reports_to: Michael)
│   │   └── Priya (Staff, reports_to: Michael)
│   └── Rachel Lee (Supervisor, reports_to: David)
│       └── Tom Koh (Staff, reports_to: Rachel)
```

### Query: "Get my team" (Supervisor)

```sql
-- Supervisor Michael Lim wants to see his staff
SELECT * FROM profiles
WHERE reports_to = 'michael-lim-uuid'
  AND org_id = get_user_org_id();

-- Returns: Sarah, Ahmad, Priya (only his staff)
```

### Query: "Get all my people" (Manager)

```sql
-- Manager David Wong wants to see supervisors + their staff
SELECT * FROM profiles
WHERE org_id = get_user_org_id()
  AND role IN ('supervisor', 'staff');

-- For supervisor breakdown:
SELECT 
  sup.full_name AS supervisor,
  COUNT(staff.id) AS team_size
FROM profiles sup
LEFT JOIN profiles staff ON staff.reports_to = sup.id
WHERE sup.org_id = get_user_org_id()
  AND sup.role = 'supervisor'
GROUP BY sup.id;
```

### When Supervisor Views Tasks — Scoped to Their Team

```sql
-- Supervisor sees ONLY tasks assigned to their direct reports
SELECT t.* FROM tasks t
JOIN profiles p ON p.id = t.assigned_to
WHERE p.reports_to = auth.uid()        -- staff who report to me
  AND t.org_id = get_user_org_id();    -- within my org
```

### Decision: Should Supervisors See Only Their Team's Tasks?

| Option | Behavior | When to Use |
|--------|----------|-------------|
| **A. Supervisor sees ALL org tasks** | Any supervisor sees all tasks in org | Small orgs (< 20 staff), flat structure |
| **B. Supervisor sees only direct reports' tasks** | Supervisor sees only tasks for staff in `reports_to = supervisor.id` | Large orgs, multiple supervisors, strict hierarchy |
| **C. Configurable per-org** | `organizations.supervisor_scope = 'org' \| 'team'` | Enterprise flexibility |

**Recommendation:** Start with **Option A** (all org tasks visible to supervisors) — simpler to implement, matches current behavior within an org. Add Option B later as a setting if customers request it.

---

## 6. Application-Side Changes

### 6.1 Type Updates (`lib/types/index.ts`)

```typescript
// NEW types to add

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Site {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

// MODIFIED: Add org_id and reports_to to Profile
export interface Profile {
  id: string;
  org_id: string;          // ★ NEW
  full_name: string;
  email: string;
  role: 'staff' | 'supervisor' | 'manager';
  reports_to: string | null;  // ★ NEW
  avatar_url: string | null;
  created_at: string;
}

// MODIFIED: Add org_id and site_id to Task
export interface Task {
  id: string;
  org_id: string;          // ★ NEW
  site_id: string | null;  // ★ NEW
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string;
  site_location: string | null;  // DEPRECATED — keep for compat
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'overdue';
  due_date: string;
  completed_at: string | null;
  created_at: string;
}
```

### 6.2 Files That Need Changes (Impact Map)

Every file that queries `profiles`, `tasks`, `escalations`, `task_evidence`, or `task_reviews` needs `org_id` awareness. Here's the **complete list**:

```
PRIORITY 1 — Core Data Flow (Breaking without changes)
──────────────────────────────────────────────────────
├── lib/types/index.ts                          → Add org_id to types
├── lib/escalation/escalationEngine.ts          → Scope to per-org processing
├── app/api/tasks/route.ts                      → Set org_id on insert, validate assignee is same org
├── app/api/escalation/route.ts                 → Loop through all orgs (or pass org context)
├── middleware.ts                               → Fetch org_id with profile, store in cookie/header
├── scripts/seedDemoData.ts                     → Create org, assign org_id to all seed data

PRIORITY 2 — Dashboard Pages (Data would be cross-org without changes)
──────────────────────────────────────────────────────
├── app/(manager)/manager/dashboard/page.tsx    → All queries: add .eq("org_id", orgId)
├── app/(manager)/manager/team/page.tsx         → Filter profiles + tasks by org_id
├── app/(manager)/manager/tasks/page.tsx        → Filter tasks by org_id
├── app/(manager)/manager/escalations/page.tsx  → Filter escalations by org_id
├── app/(manager)/manager/reports/page.tsx      → Filter reports by org_id
├── app/(supervisor)/supervisor/dashboard/...   → All queries: add .eq("org_id", orgId)
├── app/(supervisor)/supervisor/team/page.tsx   → Filter profiles by org_id (+ reports_to)
├── app/(supervisor)/supervisor/tasks/page.tsx  → Filter tasks by org_id
├── app/(supervisor)/supervisor/reviews/...     → Filter reviews by org_id
├── app/(supervisor)/supervisor/reports/...     → Filter reports by org_id
├── app/(staff)/staff/dashboard/page.tsx        → Tasks already user-scoped, but add org_id
├── app/(staff)/staff/tasks/page.tsx            → Add org_id filter
├── app/(staff)/staff/completed/page.tsx        → Add org_id filter

PRIORITY 3 — Components (Receive data from pages)
──────────────────────────────────────────────────────
├── components/supervisor/CreateTaskModal.tsx    → staffList already passed (no change if pages are fixed)
├── components/supervisor/ReassignModal.tsx      → Same — staffList passed from parent
├── components/supervisor/EscalateModal.tsx      → Manager target must be same-org
├── components/staff/CompleteTaskModal.tsx       → org_id included in evidence insert
├── components/reports/ExportButton.tsx          → Data already filtered by page

PRIORITY 4 — Supporting Systems
──────────────────────────────────────────────────────
├── lib/export/exportReport.ts                  → No change (receives pre-filtered data)
├── lib/push/sendPush.ts                        → No change (sends to user_id, not org)
├── hooks/use-realtime-tasks.ts                 → Add org_id filter to realtime subscription
├── app/(auth)/login/page.tsx                   → Show org name after login
├── app/(auth)/login/actions.ts                 → Include org_id in profile fetch
├── app/layout.tsx                              → Pass org context to children
├── app/api/auto-login/route.ts                 → Needs org context for demo
```

### 6.3 Key Code Changes (Patterns)

#### Pattern 1: Get org_id from current user (reusable helper)

```typescript
// lib/supabase/get-org.ts (NEW FILE)

import { createClient } from "@/lib/supabase/server";

export async function getCurrentOrg() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role, reports_to")
    .eq("id", user.id)
    .single();

  return profile ? { 
    orgId: profile.org_id, 
    role: profile.role, 
    reportsTo: profile.reports_to,
    userId: user.id 
  } : null;
}
```

#### Pattern 2: Dashboard query — Before vs After

```typescript
// BEFORE (manager dashboard):
const { data: tasks } = await supabase
  .from("tasks")
  .select("*");  // ❌ ALL tasks globally

// AFTER:
const org = await getCurrentOrg();
const { data: tasks } = await supabase
  .from("tasks")
  .select("*")
  .eq("org_id", org.orgId);  // ✅ Only this org's tasks
```

#### Pattern 3: Staff list — Before vs After

```typescript
// BEFORE (supervisor team page):
const { data: staffMembers } = await supabase
  .from("profiles")
  .select("*")
  .eq("role", "staff");  // ❌ ALL staff globally

// AFTER:
const org = await getCurrentOrg();
const { data: staffMembers } = await supabase
  .from("profiles")
  .select("*")
  .eq("role", "staff")
  .eq("org_id", org.orgId);  // ✅ Only this org's staff
```

#### Pattern 4: Task creation — Before vs After

```typescript
// BEFORE (api/tasks/route.ts):
const { data: task } = await supabase
  .from("tasks")
  .insert({
    title, assigned_to, created_by: user.id,
    // ❌ No org_id
  });

// AFTER:
const { data: profile } = await supabase
  .from("profiles")
  .select("org_id")
  .eq("id", user.id)
  .single();

// Validate assignee is in same org
const { data: assignee } = await supabase
  .from("profiles")
  .select("org_id")
  .eq("id", assigned_to)
  .single();

if (assignee?.org_id !== profile?.org_id) {
  return NextResponse.json(
    { error: "Cannot assign tasks to users outside your organization" },
    { status: 403 }
  );
}

const { data: task } = await supabase
  .from("tasks")
  .insert({
    title, assigned_to, created_by: user.id,
    org_id: profile.org_id,  // ✅ Set org_id
    site_id: site_id ?? null, // ✅ FK instead of TEXT
  });
```

#### Pattern 5: Escalation engine — Before vs After

```typescript
// BEFORE: Process ALL overdue tasks, pick ANY manager
const { data: overdueTasks } = await supabase
  .from("tasks")
  .select("*")
  .in("status", ["pending", "in_progress", "overdue"])
  .lt("due_date", now.toISOString());

const { data: managers } = await supabase
  .from("profiles")
  .select("id")
  .eq("role", "manager")
  .limit(1);  // ❌ Any random manager

// AFTER: Process per-org, pick org's manager
const { data: orgs } = await supabase
  .from("organizations")
  .select("id")
  .eq("is_active", true);

for (const org of orgs) {
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("org_id", org.id)  // ✅ Per-org
    .in("status", ["pending", "in_progress", "overdue"])
    .lt("due_date", now.toISOString());

  const { data: managers } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "manager")
    .eq("org_id", org.id)  // ✅ This org's manager
    .limit(1);

  // Process escalations within this org...
}
```

#### Pattern 6: Realtime subscription — Before vs After

```typescript
// BEFORE (hooks/use-realtime-tasks.ts):
supabase.channel("tasks")
  .on("postgres_changes", { 
    event: "*", schema: "public", table: "tasks" 
  }, callback);  // ❌ All task changes globally

// AFTER:
supabase.channel(`tasks-${orgId}`)
  .on("postgres_changes", { 
    event: "*", schema: "public", table: "tasks",
    filter: `org_id=eq.${orgId}`  // ✅ Only this org's changes
  }, callback);
```

---

## 7. Onboarding Flow for New Organizations

### 7.1 Process to Add a New Customer

```
Step 1: Create Organization
  INSERT INTO organizations (name, slug) 
  VALUES ('BrightCare Services', 'brightcare');

Step 2: Create Sites
  INSERT INTO sites (org_id, name, address) VALUES
    (org_id, 'Bishan Care Center', '...'),
    (org_id, 'AMK Care Center', '...');

Step 3: Create Manager Account
  → Sign up via Supabase Auth
  → Set profiles.org_id = org_id
  → Set profiles.role = 'manager'

Step 4: Create Supervisor Accounts
  → Set profiles.org_id = org_id
  → Set profiles.role = 'supervisor'
  → Set profiles.reports_to = manager_id

Step 5: Create Staff Accounts
  → Set profiles.org_id = org_id
  → Set profiles.role = 'staff'
  → Set profiles.reports_to = supervisor_id

Step 6: Verify
  → Login as manager → should see only org data
  → Login as supervisor → should see only org staff
  → Login as staff → should see only assigned tasks
```

### 7.2 Future: Self-Service Org Signup

```
Landing Page → "Start Free Trial"
  → Enter org name, admin email, password
  → Auto-create: organization + manager profile
  → Manager invites supervisors (email invite)
  → Supervisors invite staff
  → Hierarchy auto-established via reports_to
```

---

## 8. Implementation Priority & Effort

### Phase 1: Database Foundation (Day 1-2)

| Task | Effort | Risk |
|------|--------|------|
| Write migration 003 (tables, columns, indexes) | 3 hrs | Low |
| Write RLS policies (org-scoped) | 2 hrs | Medium — test carefully |
| Backfill existing data to default org | 1 hr | Low |
| Create `get_user_org_id()` function | 30 min | Low |
| Test RLS isolation between 2 test orgs | 2 hrs | Critical |

### Phase 2: Core Application Changes (Day 3-5)

| Task | Effort | Risk |
|------|--------|------|
| Add types (`Organization`, `Site`, updated `Profile`, `Task`) | 30 min | Low |
| Create `getCurrentOrg()` helper | 30 min | Low |
| Update `api/tasks/route.ts` (org_id insert + validation) | 1 hr | Medium |
| Update `escalationEngine.ts` (per-org loop) | 2 hrs | Medium |
| Update `middleware.ts` (fetch org context) | 1 hr | Low |
| Update seed script for org-aware data | 1 hr | Low |

### Phase 3: Dashboard & Page Updates (Day 5-8)

| Task | Effort | Risk |
|------|--------|------|
| Manager dashboard — add `.eq("org_id", orgId)` to all queries | 2 hrs | Low (repetitive) |
| Manager team/tasks/escalations/reports pages | 2 hrs | Low |
| Supervisor dashboard — add org scoping | 1.5 hrs | Low |
| Supervisor team/tasks/reviews/reports pages | 2 hrs | Low |
| Staff dashboard/tasks/completed pages | 1 hr | Low |
| Realtime hook — add org_id filter | 30 min | Low |

### Phase 4: Testing & Hardening (Day 8-10)

| Task | Effort | Risk |
|------|--------|------|
| Create 2 test orgs with separate hierarchies | 1 hr | — |
| Verify org isolation: login as Org A, confirm zero Org B data | 3 hrs | Critical |
| Test escalation engine routes to correct org's manager | 1 hr | Medium |
| Test cross-org assignment blocked (API + RLS) | 1 hr | Medium |
| Test realtime subscriptions are org-scoped | 1 hr | Low |
| Update seed script, test fresh deploy | 1 hr | Low |

### Total Estimated Effort: ~30 hours (1 developer, ~8-10 working days)

---

## 9. Security Considerations

| Concern | Mitigation |
|---------|------------|
| **Cross-org data leak** | RLS at DB level (not app level). Even if app code has a bug, PostgreSQL blocks cross-org reads. |
| **Cross-org task assignment** | API validates `assignee.org_id === creator.org_id` before insert. RLS blocks insert if org_id doesn't match. |
| **Escalation to wrong manager** | Escalation engine queries managers WHERE `org_id = task.org_id`. |
| **Realtime cross-org events** | Supabase Realtime respects RLS. Channel filter adds `org_id=eq.{orgId}`. |
| **Photo evidence access** | Supabase Storage buckets can be org-scoped (`evidence/{org_id}/{task_id}/`). |
| **Super-admin access** | Future: add `is_super_admin` flag on profiles for cross-org admin view. Service role key used only in server-side escalation engine. |

---

## 10. What NOT to Do Now

| Temptation | Why Not | When |
|------------|---------|------|
| Build a super-admin dashboard | No customer need yet | After 5+ orgs onboarded |
| Add org-level settings (branding, SLA thresholds) | Over-engineering for pilot | After first paying customer |
| Build self-service org signup | Manual onboarding is fine for 1-10 customers | After product-market fit confirmed |
| Remove `site_location` TEXT column | Keep for backward compat, deprecate gradually | After all orgs migrated to `site_id` |
| Per-supervisor task scoping (Option B) | Adds complexity, no customer request yet | When a customer asks for it |

---

*End of Multi-Tenancy Architecture Plan*
