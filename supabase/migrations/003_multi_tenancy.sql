-- ============================================
-- Migration 003: Multi-Tenancy (Organizations)
-- Adds org-scoped data isolation + hierarchy
-- ============================================

-- ============================================
-- 1. NEW TABLES
-- ============================================

-- Organizations (each customer = one org)
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sites (replaces free-text site_location with structured FK)
CREATE TABLE sites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

CREATE INDEX idx_sites_org_id ON sites(org_id);

-- ============================================
-- 2. ALTER EXISTING TABLES
-- ============================================

-- ── Profiles: add org_id + reports_to ───────
ALTER TABLE profiles
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE profiles
  ADD COLUMN reports_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_profiles_reports_to ON profiles(reports_to);

-- ── Tasks: add org_id + site_id ─────────────
ALTER TABLE tasks
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE tasks
  ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_org_id ON tasks(org_id);
CREATE INDEX idx_tasks_site_id ON tasks(site_id);

-- ── Escalations: add org_id ─────────────────
ALTER TABLE escalations
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_escalations_org_id ON escalations(org_id);

-- ── Task Evidence: add org_id ───────────────
ALTER TABLE task_evidence
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_task_evidence_org_id ON task_evidence(org_id);

-- ── Task Reviews: add org_id ────────────────
ALTER TABLE task_reviews
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_task_reviews_org_id ON task_reviews(org_id);

-- ============================================
-- 3. HELPER FUNCTION: get current user's org
-- ============================================

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$;

-- ============================================
-- 4. BACKFILL: Create default org for existing data
-- ============================================

INSERT INTO organizations (name, slug)
VALUES ('CleanPro Demo', 'cleanpro-demo')
ON CONFLICT (slug) DO NOTHING;

-- Assign all existing profiles to default org
UPDATE profiles
SET org_id = (SELECT id FROM organizations WHERE slug = 'cleanpro-demo')
WHERE org_id IS NULL;

-- Assign all existing tasks
UPDATE tasks
SET org_id = (SELECT id FROM organizations WHERE slug = 'cleanpro-demo')
WHERE org_id IS NULL;

-- Assign all existing escalations
UPDATE escalations
SET org_id = (SELECT id FROM organizations WHERE slug = 'cleanpro-demo')
WHERE org_id IS NULL;

-- Assign all existing evidence
UPDATE task_evidence
SET org_id = (SELECT id FROM organizations WHERE slug = 'cleanpro-demo')
WHERE org_id IS NULL;

-- Assign all existing reviews
UPDATE task_reviews
SET org_id = (SELECT id FROM organizations WHERE slug = 'cleanpro-demo')
WHERE org_id IS NULL;

-- Create sites from existing site_location TEXT values
INSERT INTO sites (org_id, name)
SELECT DISTINCT
  (SELECT id FROM organizations WHERE slug = 'cleanpro-demo'),
  site_location
FROM tasks
WHERE site_location IS NOT NULL
  AND site_location != ''
ON CONFLICT (org_id, name) DO NOTHING;

-- Link tasks to site records
UPDATE tasks t
SET site_id = s.id
FROM sites s
WHERE s.name = t.site_location
  AND s.org_id = (SELECT id FROM organizations WHERE slug = 'cleanpro-demo');

-- ============================================
-- 5. ENFORCE NOT NULL on org_id (after backfill)
-- ============================================

ALTER TABLE profiles ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE escalations ALTER COLUMN org_id SET NOT NULL;
-- task_evidence and task_reviews: keep nullable for now
-- (older rows without org_id may exist if inserted before this migration)

-- ============================================
-- 6. SET reports_to HIERARCHY for existing demo data
--    (runs only if demo users exist)
-- ============================================

-- Supervisor reports to Manager
UPDATE profiles
SET reports_to = (SELECT id FROM profiles WHERE email = 'david.wong@cleanpro-demo.com')
WHERE email = 'michael.lim@cleanpro-demo.com'
  AND EXISTS (SELECT 1 FROM profiles WHERE email = 'david.wong@cleanpro-demo.com');

-- Staff report to Supervisor
UPDATE profiles
SET reports_to = (SELECT id FROM profiles WHERE email = 'michael.lim@cleanpro-demo.com')
WHERE email IN (
  'sarah.tan@cleanpro-demo.com',
  'ahmad.bin@cleanpro-demo.com',
  'priya.nair@cleanpro-demo.com'
)
AND EXISTS (SELECT 1 FROM profiles WHERE email = 'michael.lim@cleanpro-demo.com');

-- ============================================
-- 7. DROP OLD RLS POLICIES & CREATE ORG-SCOPED ONES
-- ============================================

-- ─── PROFILES ───────────────────────────────
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Staff can view profiles of task creators" ON profiles;
DROP POLICY IF EXISTS "Supervisors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for auth trigger" ON profiles;

-- Users always see own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Users see profiles within same org
CREATE POLICY "profiles_select_org"
  ON profiles FOR SELECT
  USING (org_id = get_user_org_id());

-- Users can update own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Auth trigger can insert profiles
CREATE POLICY "profiles_insert_trigger"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ─── ORGANIZATIONS ─────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_own"
  ON organizations FOR SELECT
  USING (id = get_user_org_id());

-- Managers can update their org (e.g. logo)
CREATE POLICY "org_update_manager"
  ON organizations FOR UPDATE
  USING (id = get_user_org_id() AND get_user_role() = 'manager');

-- ─── SITES ──────────────────────────────────
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites_select_org"
  ON sites FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "sites_insert_manager"
  ON sites FOR INSERT
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'manager');

CREATE POLICY "sites_update_manager"
  ON sites FOR UPDATE
  USING (org_id = get_user_org_id() AND get_user_role() = 'manager');

CREATE POLICY "sites_delete_manager"
  ON sites FOR DELETE
  USING (org_id = get_user_org_id() AND get_user_role() = 'manager');

-- ─── TASKS ──────────────────────────────────
DROP POLICY IF EXISTS "Staff can view own assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Supervisors can view team tasks" ON tasks;
DROP POLICY IF EXISTS "Staff can update own assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Supervisors can update tasks" ON tasks;
DROP POLICY IF EXISTS "Supervisors can create tasks" ON tasks;
DROP POLICY IF EXISTS "Managers can delete tasks" ON tasks;

-- Staff see own tasks within org
CREATE POLICY "tasks_select_staff"
  ON tasks FOR SELECT
  USING (
    org_id = get_user_org_id()
    AND (assigned_to = auth.uid() OR created_by = auth.uid())
  );

-- Supervisors/Managers see all org tasks
CREATE POLICY "tasks_select_elevated"
  ON tasks FOR SELECT
  USING (
    org_id = get_user_org_id()
    AND get_user_role() IN ('supervisor', 'manager')
  );

-- Staff can update own assigned tasks within org
CREATE POLICY "tasks_update_staff"
  ON tasks FOR UPDATE
  USING (
    org_id = get_user_org_id()
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    org_id = get_user_org_id()
    AND assigned_to = auth.uid()
  );

-- Supervisors/Managers can update any org task
CREATE POLICY "tasks_update_elevated"
  ON tasks FOR UPDATE
  USING (
    org_id = get_user_org_id()
    AND get_user_role() IN ('supervisor', 'manager')
  );

-- Supervisors/Managers can create tasks within org
CREATE POLICY "tasks_insert_elevated"
  ON tasks FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id()
    AND get_user_role() IN ('supervisor', 'manager')
  );

-- Managers can delete tasks within org
CREATE POLICY "tasks_delete_manager"
  ON tasks FOR DELETE
  USING (
    org_id = get_user_org_id()
    AND get_user_role() = 'manager'
  );

-- ─── TASK_EVIDENCE ──────────────────────────
DROP POLICY IF EXISTS "Users can view evidence for accessible tasks" ON task_evidence;
DROP POLICY IF EXISTS "Staff can submit evidence for assigned tasks" ON task_evidence;

-- View evidence within org
CREATE POLICY "evidence_select_org"
  ON task_evidence FOR SELECT
  USING (
    org_id = get_user_org_id()
    OR (org_id IS NULL AND (
      submitted_by = auth.uid()
      OR get_user_role() IN ('supervisor', 'manager')
    ))
  );

-- Submit evidence within org
CREATE POLICY "evidence_insert_org"
  ON task_evidence FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND (
      org_id = get_user_org_id()
      OR org_id IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_id
        AND tasks.assigned_to = auth.uid()
    )
  );

-- ─── TASK_REVIEWS ───────────────────────────
DROP POLICY IF EXISTS "Users can view reviews for accessible tasks" ON task_reviews;
DROP POLICY IF EXISTS "Supervisors and managers can create reviews" ON task_reviews;

-- View reviews within org
CREATE POLICY "reviews_select_org"
  ON task_reviews FOR SELECT
  USING (
    org_id = get_user_org_id()
    OR (org_id IS NULL AND (
      reviewed_by = auth.uid()
      OR get_user_role() IN ('supervisor', 'manager')
      OR EXISTS (
        SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.assigned_to = auth.uid()
      )
    ))
  );

-- Create reviews within org
CREATE POLICY "reviews_insert_org"
  ON task_reviews FOR INSERT
  WITH CHECK (
    reviewed_by = auth.uid()
    AND get_user_role() IN ('supervisor', 'manager')
    AND (
      org_id = get_user_org_id()
      OR org_id IS NULL
    )
  );

-- ─── ESCALATIONS ────────────────────────────
DROP POLICY IF EXISTS "Users can view their own escalations" ON escalations;
DROP POLICY IF EXISTS "Supervisors and managers can create escalations" ON escalations;
DROP POLICY IF EXISTS "Managers can update escalations" ON escalations;

-- View escalations within org
CREATE POLICY "escalations_select_org"
  ON escalations FOR SELECT
  USING (org_id = get_user_org_id());

-- Create escalations within org
CREATE POLICY "escalations_insert_org"
  ON escalations FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id()
    AND get_user_role() IN ('supervisor', 'manager')
  );

-- Managers can resolve escalations within org
CREATE POLICY "escalations_update_manager"
  ON escalations FOR UPDATE
  USING (
    org_id = get_user_org_id()
    AND get_user_role() = 'manager'
  );

-- ============================================
-- 8. UPDATE handle_new_user() TRIGGER
--    Now accepts org_id from user metadata
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, org_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff'),
    (NEW.raw_user_meta_data->>'org_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
