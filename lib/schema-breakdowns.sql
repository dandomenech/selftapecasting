-- ══════════════════════════════════════════
-- ADD-ON: Breakdowns, Submissions, Agent/Manager System
-- ══════════════════════════════════════════
-- Run this in Supabase SQL Editor after the main schema and resume schema.
-- Safe to re-run.

-- ────────────────────────────────────
-- 1. UNIVERSAL SKILL CORE (on profiles)
-- ────────────────────────────────────
-- vocal_range already exists. Add dance_level alongside it.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dance_level TEXT DEFAULT '';
-- Suggested values for dance_level: 'Non-dancer', 'Mover', 'Trained', 'Strong/Advanced'
-- (Enforced in the UI as a select, not a DB constraint, so it's easy to adjust later.)

-- ────────────────────────────────────
-- 2. BREAKDOWNS TABLE
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  show_name TEXT NOT NULL,
  role_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  pay_rate TEXT NOT NULL,              -- required on every post, per platform policy
  union_status TEXT DEFAULT '',         -- e.g. 'AEA', 'Non-Union', 'Either'
  location TEXT DEFAULT '',

  -- Role-specific skills, defined by casting at post time.
  -- Array of strings, e.g. ["Stage Combat", "Tap", "Plays Guitar"]
  required_skills JSONB DEFAULT '[]'::JSONB,

  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE breakdowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open breakdowns are viewable by everyone" ON breakdowns;
CREATE POLICY "Open breakdowns are viewable by everyone"
  ON breakdowns FOR SELECT USING (status = 'open' OR posted_by = auth.uid());

DROP POLICY IF EXISTS "Casting can insert breakdowns" ON breakdowns;
CREATE POLICY "Casting can insert breakdowns"
  ON breakdowns FOR INSERT WITH CHECK (posted_by = auth.uid());

DROP POLICY IF EXISTS "Casting can update own breakdowns" ON breakdowns;
CREATE POLICY "Casting can update own breakdowns"
  ON breakdowns FOR UPDATE USING (posted_by = auth.uid());

DROP POLICY IF EXISTS "Casting can delete own breakdowns" ON breakdowns;
CREATE POLICY "Casting can delete own breakdowns"
  ON breakdowns FOR DELETE USING (posted_by = auth.uid());

-- ────────────────────────────────────
-- 3. AGENT / CLIENT RELATIONSHIP
-- ────────────────────────────────────
-- Mutual relationship: an agent requests representation,
-- the performer must approve before the agent gets any access.
CREATE TABLE IF NOT EXISTS agent_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  performer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'ended')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(agent_id, performer_id)
);

ALTER TABLE agent_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents and performers see their own links" ON agent_clients;
CREATE POLICY "Agents and performers see their own links"
  ON agent_clients FOR SELECT
  USING (agent_id = auth.uid() OR performer_id = auth.uid());

DROP POLICY IF EXISTS "Agents can request representation" ON agent_clients;
CREATE POLICY "Agents can request representation"
  ON agent_clients FOR INSERT WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Performers can respond, agents can end" ON agent_clients;
CREATE POLICY "Performers can respond, agents can end"
  ON agent_clients FOR UPDATE
  USING (agent_id = auth.uid() OR performer_id = auth.uid());

-- ────────────────────────────────────
-- 4. SUBMISSIONS TABLE
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakdown_id UUID NOT NULL REFERENCES breakdowns(id) ON DELETE CASCADE,
  performer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Who actually performed this submission action — the performer themself,
  -- or an agent acting on their behalf. Drives the notification system.
  submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Which of the performer's videos were included
  video_ids JSONB DEFAULT '[]'::JSONB,

  -- Performer's yes/no against the breakdown's required_skills at time of submission.
  -- Shape: { "Stage Combat": true, "Tap": false }
  skill_check_answers JSONB DEFAULT '{}'::JSONB,

  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'callback', 'booked', 'passed')),
  notes TEXT DEFAULT '',               -- casting's feedback, shown to performer

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(breakdown_id, performer_id)
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Performers, their agents, and the posting casting see submissions" ON submissions;
CREATE POLICY "Performers, their agents, and the posting casting see submissions"
  ON submissions FOR SELECT
  USING (
    performer_id = auth.uid()
    OR submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM breakdowns WHERE breakdowns.id = submissions.breakdown_id AND breakdowns.posted_by = auth.uid())
    OR EXISTS (SELECT 1 FROM agent_clients WHERE agent_clients.performer_id = submissions.performer_id AND agent_clients.agent_id = auth.uid() AND agent_clients.status = 'active')
  );

DROP POLICY IF EXISTS "Performers and active agents can submit" ON submissions;
CREATE POLICY "Performers and active agents can submit"
  ON submissions FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND (
      performer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM agent_clients WHERE agent_clients.performer_id = submissions.performer_id AND agent_clients.agent_id = auth.uid() AND agent_clients.status = 'active')
    )
  );

DROP POLICY IF EXISTS "Performers, active agents, and posting casting can update" ON submissions;
CREATE POLICY "Performers, active agents, and posting casting can update"
  ON submissions FOR UPDATE
  USING (
    performer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM agent_clients WHERE agent_clients.performer_id = submissions.performer_id AND agent_clients.agent_id = auth.uid() AND agent_clients.status = 'active')
    OR EXISTS (SELECT 1 FROM breakdowns WHERE breakdowns.id = submissions.breakdown_id AND breakdowns.posted_by = auth.uid())
  );

-- ────────────────────────────────────
-- 5. SUBMISSION CHANGE LOG (powers actor notifications)
-- ────────────────────────────────────
CREATE TABLE IF NOT EXISTS submission_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,    -- 'created' | 'videos_updated' | 'skills_updated' | 'withdrawn'
  change_summary TEXT DEFAULT '',
  seen_by_performer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE submission_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Performer and the changer can see change log" ON submission_changes;
CREATE POLICY "Performer and the changer can see change log"
  ON submission_changes FOR SELECT
  USING (
    changed_by = auth.uid()
    OR EXISTS (SELECT 1 FROM submissions WHERE submissions.id = submission_changes.submission_id AND submissions.performer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone with submission access can log a change" ON submission_changes;
CREATE POLICY "Anyone with submission access can log a change"
  ON submission_changes FOR INSERT WITH CHECK (changed_by = auth.uid());

DROP POLICY IF EXISTS "Performer can mark changes as seen" ON submission_changes;
CREATE POLICY "Performer can mark changes as seen"
  ON submission_changes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM submissions WHERE submissions.id = submission_changes.submission_id AND submissions.performer_id = auth.uid()));

-- DONE
