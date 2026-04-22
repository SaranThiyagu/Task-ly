-- ============================================
-- TaskMe Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('staff', 'supervisor', 'manager');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected', 'overdue');
CREATE TYPE review_action AS ENUM ('approved', 'rejected');

-- ============================================
-- TABLES
-- ============================================

-- 1. Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'staff',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_location TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Task Evidence
CREATE TABLE task_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Task Reviews
CREATE TABLE task_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reviewed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action review_action NOT NULL,
  comment TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Escalations
CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  escalated_from UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  escalated_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_resolved BOOLEAN NOT NULL DEFAULT false
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_task_evidence_task_id ON task_evidence(task_id);
CREATE INDEX idx_task_reviews_task_id ON task_reviews(task_id);
CREATE INDEX idx_escalations_task_id ON escalations(task_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES policies
-- ============================================

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Staff can view profiles of task creators"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.assigned_to = auth.uid()
      AND (tasks.created_by = profiles.id)
    )
  );

CREATE POLICY "Supervisors can view all profiles"
  ON profiles FOR SELECT
  USING (get_user_role() IN ('supervisor', 'manager'));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Enable insert for auth trigger"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================
-- TASKS policies
-- ============================================

-- Staff: only see tasks assigned to them
CREATE POLICY "Staff can view own assigned tasks"
  ON tasks FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- Supervisors: see all tasks created by them or assigned to any staff
CREATE POLICY "Supervisors can view team tasks"
  ON tasks FOR SELECT
  USING (get_user_role() IN ('supervisor', 'manager'));

-- Managers: handled by the supervisor policy (includes 'manager')

-- Staff can update their own assigned tasks (e.g. status changes)
CREATE POLICY "Staff can update own assigned tasks"
  ON tasks FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Supervisors and managers can update any task
CREATE POLICY "Supervisors can update tasks"
  ON tasks FOR UPDATE
  USING (get_user_role() IN ('supervisor', 'manager'));

-- Supervisors and managers can create tasks
CREATE POLICY "Supervisors can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (get_user_role() IN ('supervisor', 'manager'));

-- Managers can delete tasks
CREATE POLICY "Managers can delete tasks"
  ON tasks FOR DELETE
  USING (get_user_role() = 'manager');

-- ============================================
-- TASK_EVIDENCE policies
-- ============================================

CREATE POLICY "Users can view evidence for accessible tasks"
  ON task_evidence FOR SELECT
  USING (
    submitted_by = auth.uid()
    OR get_user_role() IN ('supervisor', 'manager')
  );

CREATE POLICY "Staff can submit evidence for assigned tasks"
  ON task_evidence FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.assigned_to = auth.uid()
    )
  );

-- ============================================
-- TASK_REVIEWS policies
-- ============================================

CREATE POLICY "Users can view reviews for accessible tasks"
  ON task_reviews FOR SELECT
  USING (
    reviewed_by = auth.uid()
    OR get_user_role() IN ('supervisor', 'manager')
    OR EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Supervisors and managers can create reviews"
  ON task_reviews FOR INSERT
  WITH CHECK (
    reviewed_by = auth.uid()
    AND get_user_role() IN ('supervisor', 'manager')
  );

-- ============================================
-- ESCALATIONS policies
-- ============================================

CREATE POLICY "Users can view their own escalations"
  ON escalations FOR SELECT
  USING (
    escalated_from = auth.uid()
    OR escalated_to = auth.uid()
    OR get_user_role() = 'manager'
  );

CREATE POLICY "Supervisors and managers can create escalations"
  ON escalations FOR INSERT
  WITH CHECK (
    escalated_from = auth.uid()
    AND get_user_role() IN ('supervisor', 'manager')
  );

CREATE POLICY "Managers can update escalations"
  ON escalations FOR UPDATE
  USING (get_user_role() = 'manager');

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
