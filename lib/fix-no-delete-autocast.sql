-- ══════════════════════════════════════════
-- FIX: No-delete policy + auto-cast trigger
-- ══════════════════════════════════════════
-- Run in Supabase SQL Editor after fix-breakdown-lock.sql

-- 1. Remove the ability for casting to delete breakdowns
DROP POLICY IF EXISTS "Casting can delete own breakdowns" ON breakdowns;

-- 2. Auto-cast trigger: when any submission on a breakdown is marked 'booked',
--    automatically flip that breakdown to 'cast' status.
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
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_submission_booked ON submissions;
CREATE TRIGGER on_submission_booked
  AFTER UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION auto_cast_breakdown();

-- DONE
