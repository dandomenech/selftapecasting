-- ══════════════════════════════════════════
-- ADD-ON: Pro Tier flag (storage cap system)
-- ══════════════════════════════════════════
-- Run in Supabase SQL Editor.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_tier BOOLEAN DEFAULT FALSE;

-- All existing Founding Members stay on free tier by default.
-- To manually grant Pro to a specific account later (e.g. once
-- payment exists), run:
-- UPDATE profiles SET pro_tier = TRUE WHERE email = 'someone@example.com';

-- ────────────────────────────────────
-- DATABASE-LEVEL ENFORCEMENT (the real backstop)
-- Client-side checks can race or be bypassed. This trigger is the
-- final authority — it rejects the insert outright if a non-Pro
-- user already has 6 live videos, no matter what path led here.
-- ────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_tape_cap()
RETURNS TRIGGER AS $$
DECLARE
  is_pro BOOLEAN;
  current_count INTEGER;
  tape_limit INTEGER := 6;
BEGIN
  IF NEW.status = 'live' THEN
    SELECT pro_tier INTO is_pro FROM profiles WHERE id = NEW.user_id;

    IF is_pro IS NOT TRUE THEN
      SELECT COUNT(*) INTO current_count
        FROM videos
        WHERE user_id = NEW.user_id AND status = 'live';

      IF current_count >= tape_limit THEN
        RAISE EXCEPTION 'FREE_TAPE_LIMIT_REACHED: You have reached the free limit of % tapes.', tape_limit;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_tape_cap ON videos;
CREATE TRIGGER check_tape_cap
  BEFORE INSERT ON videos
  FOR EACH ROW EXECUTE FUNCTION enforce_tape_cap();

-- DONE
