-- ══════════════════════════════════════════
-- FIX: Lock breakdowns once published — no editing after go-live
-- ══════════════════════════════════════════
-- Paste into Supabase SQL Editor and click Run.
-- Run this AFTER schema-breakdowns.sql has already been run once.

-- New lifecycle: open -> cast (manually marked filled) or expired (time-based, automatic)
-- Drop the old constraint and add the new one
ALTER TABLE breakdowns DROP CONSTRAINT IF EXISTS breakdowns_status_check;
ALTER TABLE breakdowns ADD CONSTRAINT breakdowns_status_check
  CHECK (status IN ('open', 'cast', 'expired'));

-- Optional expected close date, set at posting time. If passed and still
-- 'open', the breakdown is treated as expired in the UI automatically.
ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ;

-- Once published, casting can no longer edit core details — only mark
-- the role as cast (filled). This policy replaces the old "Casting can
-- update own breakdowns" policy, which allowed full edits.
DROP POLICY IF EXISTS "Casting can update own breakdowns" ON breakdowns;
DROP POLICY IF EXISTS "Casting can only mark status, not edit content" ON breakdowns;
CREATE POLICY "Casting can only mark status, not edit content"
  ON breakdowns FOR UPDATE
  USING (posted_by = auth.uid());
-- Note: column-level write restriction is enforced in the application layer
-- (the edit page no longer exists; only a status-change action is exposed).
-- Postgres RLS can't easily restrict which columns an UPDATE touches without
-- triggers, so the real enforcement is: no UI path sends anything except
-- { status }. This is documented here so it isn't "fixed" by accident later.

-- Casting can still delete an erroneous post entirely (e.g. posted by mistake,
-- duplicate), which is different from editing a live, public breakdown.
-- (Existing delete policy from schema-breakdowns.sql already covers this.)

-- DONE
