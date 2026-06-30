-- ══════════════════════════════════════════
-- SELF TAPE CASTING — Database Setup (Safe Re-run Version)
-- ══════════════════════════════════════════
-- This version can be run multiple times without errors.
-- Paste the whole thing into Supabase SQL Editor and click Run.

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'performer' CHECK (role IN ('performer', 'casting', 'agent')),
  location TEXT DEFAULT '',
  vocal_range TEXT DEFAULT '',
  union_status TEXT DEFAULT '',
  headshot_url TEXT DEFAULT '',
  founding_member BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role, founding_member)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'performer'),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    role = COALESCE(NEW.raw_user_meta_data->>'role', profiles.role);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_name TEXT NOT NULL,
  role_name TEXT NOT NULL,
  song_1_title TEXT NOT NULL,
  song_1_track_url TEXT DEFAULT '',
  song_2_title TEXT NOT NULL,
  song_2_track_url TEXT DEFAULT '',
  scene_title TEXT DEFAULT '',
  scene_script JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roles are viewable by everyone" ON roles;
CREATE POLICY "Roles are viewable by everyone"
  ON roles FOR SELECT USING (true);

-- Seed roles (only inserts if the roles table is empty)
INSERT INTO roles (show_name, role_name, song_1_title, song_2_title, scene_title, scene_script)
SELECT * FROM (VALUES
  ('Evita', 'Che', 'Buenos Aires', 'High Flying, Adored', 'Act I - Che confronts Eva',
    '[{"speaker":"EVA","line":"I came from the people, they need to adore me."},{"speaker":"CHE","line":"So Christian Dior me from my head to my toes."},{"speaker":"EVA","line":"I need to be dazzling, I want to be Rainbow High."},{"speaker":"CHE","line":"They need their escape, and so do I."}]'::JSONB),
  ('Jesus Christ Superstar', 'Judas', 'Heaven on Their Minds', 'Superstar', 'Act II - Judas confronts Jesus',
    '[{"speaker":"JESUS","line":"Why don''t you go do it?"},{"speaker":"JUDAS","line":"You want me to do it!"},{"speaker":"JESUS","line":"Hurry, they''re waiting."},{"speaker":"JUDAS","line":"If you knew why I did it..."}]'::JSONB),
  ('RENT', 'Roger', 'One Song Glory', 'Your Eyes', 'Act I - Roger and Mimi meet',
    '[{"speaker":"MIMI","line":"They say I have the best ass below 14th Street. Is it true?"},{"speaker":"ROGER","line":"What?"},{"speaker":"MIMI","line":"You''re staring again."},{"speaker":"ROGER","line":"Oh no, I mean you look familiar."}]'::JSONB),
  ('The Who''s Tommy', 'Tommy', 'See Me, Feel Me', 'I''m Free', 'Act II - Tommy''s awakening',
    '[{"speaker":"MRS. WALKER","line":"Tommy, can you hear me?"},{"speaker":"TOMMY","line":"See me, feel me, touch me, heal me."},{"speaker":"MRS. WALKER","line":"How can he be saved?"}]'::JSONB),
  ('The Rocky Horror Show', 'Frank-N-Furter', 'Sweet Transvestite', 'I''m Going Home', 'Act II - Frank confronts Brad and Janet',
    '[{"speaker":"BRAD","line":"What have you done to Janet?"},{"speaker":"FRANK","line":"Nothing. Why, do you think I should?"},{"speaker":"BRAD","line":"You''re a hot dog, but you better not try to hurt her, Frank Furter."},{"speaker":"FRANK","line":"Do you think I made a mistake splitting his brain between the two of them?"}]'::JSONB),
  ('The 25th Annual Putnam County Spelling Bee', 'Olive Ostrovsky', 'My Friend, the Dictionary', 'The I Love You Song', 'Act II - Olive waits for her parents',
    '[{"speaker":"OLIVE","line":"My mom is on a spiritual journey in an ashram in India. She said she''d try to come."},{"speaker":"RONA","line":"And your father?"},{"speaker":"OLIVE","line":"He''s on his way. He said he would definitely be here."},{"speaker":"RONA","line":"Well, I''m sure he will be, sweetheart."}]'::JSONB),
  ('In the Heights', 'Nina Rosario', 'Breathe', 'Everything I Know', 'Act I - Nina tells her parents',
    '[{"speaker":"KEVIN","line":"Nina, what happened at school?"},{"speaker":"NINA","line":"I lost my scholarship. I''m sorry, I know how hard you worked—"},{"speaker":"KEVIN","line":"You lost it?"},{"speaker":"NINA","line":"I just... I didn''t belong there, Dad. I felt so out of place."}]'::JSONB),
  ('The Rocky Horror Show', 'Magenta', 'Science Fiction Double Feature', 'Time Warp', 'Act I - Magenta greets the guests',
    '[{"speaker":"JANET","line":"Brad, let''s get out of here."},{"speaker":"MAGENTA","line":"You''re wet."},{"speaker":"JANET","line":"Yes, it''s raining."},{"speaker":"MAGENTA","line":"I think you better both come inside."}]'::JSONB),
  ('The Rocky Horror Show', 'Columbia', 'Time Warp', 'Eddie''s Teddy', 'Act II - Columbia confronts Frank',
    '[{"speaker":"COLUMBIA","line":"My God! I can''t stand any more of this! First you spurn me for Eddie, and then you throw him off like an old overcoat for Rocky!"},{"speaker":"FRANK","line":"Columbia, you have to understand—"},{"speaker":"COLUMBIA","line":"You chew people up and then you spit them out again! I loved you, do you hear me? I loved you!"}]'::JSONB)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM roles);

-- 3. VIDEOS TABLE
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  video_type TEXT NOT NULL CHECK (video_type IN ('song_1', 'song_2', 'scene')),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT '',
  duration_seconds INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'live', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Live videos are viewable by everyone" ON videos;
CREATE POLICY "Live videos are viewable by everyone"
  ON videos FOR SELECT USING (status = 'live' OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
CREATE POLICY "Users can insert own videos"
  ON videos FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own videos" ON videos;
CREATE POLICY "Users can update own videos"
  ON videos FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
CREATE POLICY "Users can delete own videos"
  ON videos FOR DELETE USING (user_id = auth.uid());

-- 4. VIDEO VIEWS TABLE
CREATE TABLE IF NOT EXISTS video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  viewer_org TEXT DEFAULT '',
  watched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Video owners can see their view data" ON video_views;
CREATE POLICY "Video owners can see their view data"
  ON video_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos WHERE videos.id = video_views.video_id AND videos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can record a view" ON video_views;
CREATE POLICY "Anyone can record a view"
  ON video_views FOR INSERT WITH CHECK (true);

-- 5. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('headshots', 'headshots', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
CREATE POLICY "Anyone can view videos" ON storage.objects FOR SELECT
  USING (bucket_id IN ('videos', 'headshots'));

DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload videos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('videos', 'headshots') AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE
  USING (bucket_id IN ('videos', 'headshots') AND auth.uid()::text = (storage.foldername(name))[1]);

-- DONE — Your database is ready.
