-- ══════════════════════════════════════════
-- ADD-ON: Performer decline / withdraw
-- ══════════════════════════════════════════
-- Gives performers a graceful, respectful way to step back from a
-- callback they can't make, or withdraw a submission (including one
-- an agent made on their behalf). The actor stays in control of
-- their own time and where their work goes.
-- Run in Supabase SQL Editor after all previous schemas.

-- ────────────────────────────────────
-- 1. CALLBACKS: allow a 'declined' status
-- ────────────────────────────────────
ALTER TABLE callbacks DROP CONSTRAINT IF EXISTS callbacks_status_check;
ALTER TABLE callbacks ADD CONSTRAINT callbacks_status_check
  CHECK (status IN ('sent', 'confirmed', 'footage_submitted', 'declined'));

-- Store an optional short reason the performer gives when declining
ALTER TABLE callbacks ADD COLUMN IF NOT EXISTS decline_reason TEXT DEFAULT '';
ALTER TABLE callbacks ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

-- ────────────────────────────────────
-- 2. SUBMISSIONS: allow a 'withdrawn' status
-- ────────────────────────────────────
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('submitted', 'callback', 'booked', 'passed', 'withdrawn'));

-- ────────────────────────────────────
-- 3. Performers can update their OWN submissions (to withdraw them),
--    even if an agent originally created the submission on their behalf.
-- ────────────────────────────────────
DROP POLICY IF EXISTS "Performers can update own submissions" ON submissions;
CREATE POLICY "Performers can update own submissions"
  ON submissions FOR UPDATE
  USING (performer_id = auth.uid());

-- DONE
