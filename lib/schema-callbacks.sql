-- ══════════════════════════════════════════
-- ADD-ON: Structured Callbacks
-- ══════════════════════════════════════════
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  breakdown_id UUID NOT NULL REFERENCES breakdowns(id) ON DELETE CASCADE,
  performer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  casting_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type of callback
  type TEXT NOT NULL CHECK (type IN ('initial', 'final')),

  -- What casting responded to — REQUIRED for both types
  note TEXT NOT NULL,

  -- What the callback requires — in-person, new video, or performer's choice
  format TEXT NOT NULL CHECK (format IN ('in_person', 'new_video', 'either')),

  -- Specific instructions for what to prepare (required for final)
  instructions TEXT DEFAULT '',

  -- Performer response
  performer_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,

  -- If new footage is requested and submitted
  new_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  footage_submitted_at TIMESTAMPTZ,

  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'confirmed', 'footage_submitted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE callbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Performers and casting see relevant callbacks" ON callbacks;
CREATE POLICY "Performers and casting see relevant callbacks"
  ON callbacks FOR SELECT
  USING (performer_id = auth.uid() OR casting_user_id = auth.uid());

DROP POLICY IF EXISTS "Casting can send callbacks" ON callbacks;
CREATE POLICY "Casting can send callbacks"
  ON callbacks FOR INSERT
  WITH CHECK (casting_user_id = auth.uid());

DROP POLICY IF EXISTS "Casting and performers can update callbacks" ON callbacks;
CREATE POLICY "Casting and performers can update callbacks"
  ON callbacks FOR UPDATE
  USING (performer_id = auth.uid() OR casting_user_id = auth.uid());

-- DONE
