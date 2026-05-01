-- ============================================
-- Push Notification Subscriptions
-- ============================================

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One subscription row per endpoint per user
  UNIQUE (user_id, endpoint)
);

-- RLS: users can only manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can select own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used by escalation engine) needs unrestricted read access
-- Handled via service role key bypassing RLS automatically.
