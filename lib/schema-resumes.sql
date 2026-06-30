-- ══════════════════════════════════════════
-- ADD-ON: Resume System
-- ══════════════════════════════════════════
-- Run this in Supabase SQL Editor after the main schema.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Original uploaded file (kept for reference, never shown to casting)
  original_file_url TEXT DEFAULT '',
  original_file_name TEXT DEFAULT '',

  -- Standardized structured data. Each is an array of objects.
  -- credits:       [{ show, role, company, year }]
  -- collaborators: [{ name, role, project }]   role = "Director" | "Choreographer" | "Music Director" | etc.
  -- training:      [{ institution, program, instructor, note }]
  credits JSONB DEFAULT '[]'::JSONB,
  collaborators JSONB DEFAULT '[]'::JSONB,
  training JSONB DEFAULT '[]'::JSONB,

  -- Workflow status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'needs_review', 'confirmed')),
  ai_processed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Confirmed resumes are viewable by everyone" ON resumes;
CREATE POLICY "Confirmed resumes are viewable by everyone"
  ON resumes FOR SELECT USING (status = 'confirmed' OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own resume" ON resumes;
CREATE POLICY "Users can insert own resume"
  ON resumes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own resume" ON resumes;
CREATE POLICY "Users can update own resume"
  ON resumes FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own resume" ON resumes;
CREATE POLICY "Users can delete own resume"
  ON resumes FOR DELETE USING (user_id = auth.uid());

-- Storage bucket for the original uploaded resume files (PDF/image)
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view resumes" ON storage.objects;
CREATE POLICY "Anyone can view resumes" ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Authenticated users can upload resumes" ON storage.objects;
CREATE POLICY "Authenticated users can upload resumes" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own resume files" ON storage.objects;
CREATE POLICY "Users can delete own resume files" ON storage.objects FOR DELETE
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- DONE
