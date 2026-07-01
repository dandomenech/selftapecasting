-- ══════════════════════════════════════════
-- ADD-ON: Pro Tier flag (storage cap system)
-- ══════════════════════════════════════════
-- Run in Supabase SQL Editor.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_tier BOOLEAN DEFAULT FALSE;

-- All existing Founding Members stay on free tier by default.
-- To manually grant Pro to a specific account later (e.g. once
-- payment exists), run:
-- UPDATE profiles SET pro_tier = TRUE WHERE email = 'someone@example.com';

-- DONE
