-- ══════════════════════════════════════════
-- UPGRADE: Auto-cast trigger + no-delete policy
-- ══════════════════════════════════════════
-- Run in Supabase SQL Editor after all previous schemas.

-- ────────────────────────────────────
-- 1. AUTO-CAST TRIGGER
-- When any submission on a breakdown is marked 'booked',
-- the breakdown automatically flips to 'cast'.
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_cast_breakdown()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'booked' AND OLD.status != 'booked' THEN
    UPDATE breakdowns
    SET status = 'cast'
    WHERE id = NEW.breakdown_id
      AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_submission_booked ON submissions;
CREATE TRIGGER on_submission_booked
  AFTER UPDATE OF status ON submissions
  FOR EACH ROW EXECUTE FUNCTION auto_cast_breakdown();

-- ────────────────────────────────────
-- 2. REMOVE DELETE FROM CASTING
-- Once a breakdown is published, casting cannot delete it.
-- The breakdown is a public record of what was offered.
-- Only a platform admin (service_role) can remove records.
-- ────────────────────────────────────
DROP POLICY IF EXISTS "Casting can delete own breakdowns" ON breakdowns;
-- No replacement — delete is gone entirely for casting users.
-- The only remaining write a casting user can do is UPDATE status.

-- ────────────────────────────────────
-- 3. ENSURE STATUS INCLUDES EXPIRED
-- (already applied in fix-breakdown-lock.sql, but safe to re-run)
-- ────────────────────────────────────
ALTER TABLE breakdowns DROP CONSTRAINT IF EXISTS breakdowns_status_check;
ALTER TABLE breakdowns ADD CONSTRAINT breakdowns_status_check
  CHECK (status IN ('open', 'cast', 'expired'));

ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ;

-- ────────────────────────────────────
-- 4. CASTING CAN MARK EXPIRED MANUALLY
-- Casting can still move open -> expired (role cancelled, not filled).
-- The UPDATE policy already allows this since it only restricts
-- which columns can change, enforced at the app layer.
-- ────────────────────────────────────

-- DONE
