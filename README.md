# Self Tape Casting — MVP

The Musical Theater Audition Platform. Record standardized self-tapes, build your portfolio, get discovered by casting.

## Quick Start (5 minutes)

### 1. Set up Supabase (free)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" — name it `selftapecasting`
3. Wait for the project to provision (~2 minutes)
4. Go to **SQL Editor** → **New Query**
5. Paste the entire contents of `lib/schema.sql` and click **Run**
6. Go to **Settings** → **API** and copy your:
   - Project URL (looks like `https://abc123.supabase.co`)
   - `anon` `public` key (the long one)

### 2. Configure the app

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste your Supabase URL and anon key.

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone (same WiFi network) using your computer's local IP address, e.g. `http://192.168.1.100:3000`.

### 4. Deploy to the internet (free)

1. Push this code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add your environment variables in Vercel's dashboard
4. Deploy — you'll get a URL like `selftapecasting.vercel.app`
5. Share that URL with your test users

## Important: Supabase Auth Settings

For testing, you may want to disable email confirmation:

1. In Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. Toggle OFF "Confirm email"
3. This lets users sign up and immediately start using the app

Re-enable email confirmation before going public.

## Project Structure

```
app/
  page.js              — Landing page (pricing, sign-up)
  login/page.js        — Log in
  signup/page.js       — Sign up (role selection)
  portfolio/page.js    — Performer's video library
  record/page.js       — Role selection
  record/[roleId]/     — Song/scene selection + camera recording
  profile/[userId]/    — Public profile (what casting sees)
  browse/page.js       — Search + browse performers
  inbox/page.js        — Notifications (Phase 2 placeholder)
components/
  Camera.js            — MediaRecorder + framing guide + countdown
  TopNav.js            — Header bar
  BottomNav.js         — Mobile tab bar
  BlueprintSheet.js    — Setup blueprint overlay with SVG diagram
lib/
  supabase.js          — Supabase client
  schema.sql           — Database setup (run in Supabase SQL Editor)
```

## Adding Backing Tracks

1. Export your backing tracks as MP3 files
2. Upload them to Supabase Storage (bucket: `videos`) or host elsewhere
3. Update the `song_1_track_url` and `song_2_track_url` fields in the `roles` table via the Supabase Table Editor
4. The Camera component will automatically play the track when recording starts

## Testing on Your Phone

The camera recording requires HTTPS in production, but `localhost` is exempt.
To test on your phone during development:

**Option A:** Use your local network
- Find your computer's IP: `ifconfig | grep "inet "` (Mac) or `ipconfig` (Windows)
- Open `http://YOUR_IP:3000` on your phone
- Note: Camera may not work over plain HTTP on some browsers

**Option B:** Deploy to Vercel (recommended for phone testing)
- Vercel provides HTTPS automatically
- Deploy takes ~1 minute
- Share the URL with your 3 test friends

## Tech Stack

- **Next.js 14** — React framework
- **Supabase** — Database, auth, file storage (free tier)
- **Tailwind CSS** — Styling
- **Vercel** — Hosting (free tier)
- **MediaRecorder API** — In-browser video recording

## Cost

- **Development:** $0 (you have the code)
- **Hosting:** $0 (Vercel free tier)
- **Database + Auth + Storage:** $0 (Supabase free tier, up to 500MB DB / 1GB storage)
- **Domain (optional):** ~$12/year

Total: **$0/month** for MVP testing with a small group.
