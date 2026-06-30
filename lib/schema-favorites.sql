-- ══════════════════════════════════════════
-- ADD-ON: Favorites / Ranking System
-- ══════════════════════════════════════════
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakdown_id UUID NOT NULL REFERENCES breakdowns(id) ON DELETE CASCADE,
  casting_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  rank INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(breakdown_id, casting_user_id, submission_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Casting users see own favorites" ON favorites;
CREATE POLICY "Casting users see own favorites"
  ON favorites FOR SELECT USING (casting_user_id = auth.uid());

DROP POLICY IF EXISTS "Casting users can add favorites" ON favorites;
CREATE POLICY "Casting users can add favorites"
  ON favorites FOR INSERT WITH CHECK (casting_user_id = auth.uid());

DROP POLICY IF EXISTS "Casting users can update own favorites" ON favorites;
CREATE POLICY "Casting users can update own favorites"
  ON favorites FOR UPDATE USING (casting_user_id = auth.uid());

DROP POLICY IF EXISTS "Casting users can remove favorites" ON favorites;
CREATE POLICY "Casting users can remove favorites"
  ON favorites FOR DELETE USING (casting_user_id = auth.uid());

-- DONE
