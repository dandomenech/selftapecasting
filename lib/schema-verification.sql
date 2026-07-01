-- ══════════════════════════════════════════
-- ADD-ON: Casting/Agent Verification System
-- ══════════════════════════════════════════
-- Run in Supabase SQL Editor after all previous schemas.

-- ────────────────────────────────────
-- 1. VERIFICATION FIELDS ON PROFILES
-- ────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professional_email TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_required'
  CHECK (verification_status IN ('not_required', 'pending', 'approved', 'rejected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_note TEXT DEFAULT '';

-- ────────────────────────────────────
-- 2. AUTO-VERIFY PERFORMERS, FLAG OTHERS
-- Performers are not a trust risk (they can't see others' private data).
-- Casting/agent accounts start unverified and pending.
-- ────────────────────────────────────
-- Update the signup trigger to set verification state based on role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'performer');

  INSERT INTO profiles (id, email, name, role, founding_member, verified, verification_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    user_role,
    TRUE,
    -- Performers auto-verified; casting/agent must be approved
    CASE WHEN user_role = 'performer' THEN TRUE ELSE FALSE END,
    CASE WHEN user_role = 'performer' THEN 'not_required' ELSE 'pending' END
  )
  ON CONFLICT (id) DO UPDATE SET
    role = COALESCE(NEW.raw_user_meta_data->>'role', profiles.role);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: existing performers verified, existing casting/agents set pending
UPDATE profiles SET verified = TRUE, verification_status = 'not_required'
  WHERE role = 'performer' AND verification_status IS NULL;
UPDATE profiles SET verification_status = 'pending'
  WHERE role IN ('casting', 'agent') AND verified = FALSE AND (verification_status IS NULL OR verification_status = 'not_required');

-- ────────────────────────────────────
-- 3. RESTRICT SUBMISSION VIEWING TO VERIFIED CASTING
-- Replace the submissions SELECT policy so unverified casting
-- accounts cannot view performer submissions.
-- ────────────────────────────────────
DROP POLICY IF EXISTS "Performers, their agents, and the posting casting see submissions" ON submissions;
CREATE POLICY "Verified casting, performers, and active agents see submissions"
  ON submissions FOR SELECT
  USING (
    performer_id = auth.uid()
    OR submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM breakdowns b
      JOIN profiles p ON p.id = auth.uid()
      WHERE b.id = submissions.breakdown_id
        AND b.posted_by = auth.uid()
        AND p.verified = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM agent_clients ac
      JOIN profiles p ON p.id = auth.uid()
      WHERE ac.performer_id = submissions.performer_id
        AND ac.agent_id = auth.uid()
        AND ac.status = 'active'
        AND p.verified = TRUE
    )
  );

-- ────────────────────────────────────
-- 4. RESTRICT BREAKDOWN POSTING TO VERIFIED CASTING
-- ────────────────────────────────────
DROP POLICY IF EXISTS "Casting can insert breakdowns" ON breakdowns;
CREATE POLICY "Verified casting can insert breakdowns"
  ON breakdowns FOR INSERT
  WITH CHECK (
    posted_by = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND verified = TRUE)
  );

-- ────────────────────────────────────
-- 5. RESTRICT AGENT REP REQUESTS TO VERIFIED AGENTS
-- ────────────────────────────────────
DROP POLICY IF EXISTS "Agents can request representation" ON agent_clients;
CREATE POLICY "Verified agents can request representation"
  ON agent_clients FOR INSERT
  WITH CHECK (
    agent_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND verified = TRUE)
  );

-- ────────────────────────────────────
-- 6. ADMIN APPROVAL FUNCTION + SELF-VERIFY PROTECTION
-- A SECURITY DEFINER function flips verification, gated to your admin email.
-- A trigger prevents anyone from self-editing their verified flag.
-- ────────────────────────────────────

-- Trigger that blocks self-changes to the verified flag from normal updates
CREATE OR REPLACE FUNCTION protect_verified_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.verified IS DISTINCT FROM NEW.verified THEN
    IF current_setting('app.approving', TRUE) IS DISTINCT FROM 'true' THEN
      NEW.verified := OLD.verified;
      NEW.verification_status := OLD.verification_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the approval function to set the guard flag
CREATE OR REPLACE FUNCTION approve_verification(target_user_id UUID, decision TEXT, admin_email TEXT)
RETURNS TEXT AS $$
DECLARE
  caller_email TEXT;
  authorized_admin TEXT := 'CHANGE_ME@youremail.com';  -- ⚠ SET THIS to your admin account email
BEGIN
  SELECT email INTO caller_email FROM profiles WHERE id = auth.uid();

  -- Caller must be logged in AND be the authorized admin
  IF caller_email IS NULL OR caller_email != authorized_admin THEN
    RETURN 'unauthorized';
  END IF;

  PERFORM set_config('app.approving', 'true', TRUE);

  IF decision = 'approve' THEN
    UPDATE profiles SET verified = TRUE, verification_status = 'approved' WHERE id = target_user_id;
    RETURN 'approved';
  ELSIF decision = 'reject' THEN
    UPDATE profiles SET verified = FALSE, verification_status = 'rejected' WHERE id = target_user_id;
    RETURN 'rejected';
  END IF;

  RETURN 'invalid_decision';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_verified ON profiles;
CREATE TRIGGER protect_verified
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_verified_flag();

-- DONE
