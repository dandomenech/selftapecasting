'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;

  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [resume, setResume] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(prof);

    const { data: vids } = await supabase
      .from('videos')
      .select('*, roles(*)')
      .eq('user_id', userId)
      .eq('status', 'live')
      .order('created_at', { ascending: false });
    setVideos(vids || []);

    // Resume is only shown if the performer confirmed it
    const { data: res } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .maybeSingle();
    setResume(res);

    // Record a view for analytics
    const { data: { session } } = await supabase.auth.getSession();
    if (session && vids?.length > 0) {
      // Record view on first video as a proxy for "profile view"
      await supabase.from('video_views').insert({
        video_id: vids[0].id,
        viewer_id: session.user.id,
      });
    }

    setLoading(false);
  };

  // Group videos by show/role
  const grouped = {};
  videos.forEach(v => {
    const role = v.roles;
    if (!role) return;
    const key = `${role.show_name} — ${role.role_name}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(v);
  });

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;
  if (!profile) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Profile not found</div>;

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.back()} className="text-sm text-stc-link underline mb-3">← Back</button>

        {/* Profile header */}
        <div className="bg-white border border-stc-border rounded-lg p-4 mb-3">
          <div className="flex gap-3 items-center">
            <div className="w-16 h-20 bg-gray-200 border border-stc-border rounded flex items-center
                          justify-center text-stc-muted text-sm font-bold flex-shrink-0">
              {profile.headshot_url ? (
                <img src={profile.headshot_url} alt={profile.name} className="w-full h-full object-cover rounded" />
              ) : (
                profile.name?.split(' ').map(n => n[0]).join('')
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{profile.name}</h1>
                {profile.founding_member && (
                  <span className="bg-stc-gold text-white text-[9px] font-bold px-2 py-0.5 rounded-full">FM</span>
                )}
              </div>
              <p className="text-xs text-stc-muted">
                {[profile.vocal_range, profile.union_status, profile.location].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>

        {/* Videos */}
        {Object.entries(grouped).map(([key, vids]) => (
          <div key={key} className="bg-white border border-stc-border rounded-lg p-3 mb-3">
            <h2 className="text-base font-bold mb-2">{key}</h2>
            {vids.map(v => {
              const title = v.video_type === 'song_1' ? v.roles?.song_1_title :
                           v.video_type === 'song_2' ? v.roles?.song_2_title :
                           v.roles?.scene_title;
              return (
                <div key={v.id} className="border-t border-gray-100">
                  <div className="flex items-center gap-2 py-2.5 cursor-pointer"
                       onClick={() => setPlayingId(playingId === v.id ? null : v.id)}>
                    <div className="w-11 h-14 bg-gray-900 rounded flex items-center justify-center
                                  text-white text-sm flex-shrink-0">
                      {playingId === v.id ? '❚❚' : '▶'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{title}</p>
                      <p className="text-[10px] text-stc-muted">
                        {v.video_type === 'scene' ? 'Scene' : 'Song'} · {new Date(v.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Inline video player */}
                  {playingId === v.id && (
                    <div className="mb-3">
                      <video
                        src={v.video_url}
                        controls
                        autoPlay
                        playsInline
                        className="w-full rounded-lg bg-black"
                        style={{ maxHeight: '60vh' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {videos.length === 0 && (
          <div className="bg-white border border-stc-border rounded-lg p-6 text-center">
            <p className="text-sm text-stc-muted">No videos uploaded yet.</p>
          </div>
        )}

        {/* Resume — secondary, collapsed by default */}
        {resume && (resume.credits?.length > 0 || resume.collaborators?.length > 0 || resume.training?.length > 0) && (
          <div className="mt-4">
            <button onClick={() => setShowResume(!showResume)}
              className="w-full flex items-center justify-between bg-white border border-stc-border rounded-lg px-4 py-3">
              <span className="text-sm font-bold">Resume</span>
              <span className="text-xs text-stc-muted">{showResume ? 'Hide ▲' : 'Show ▼'}</span>
            </button>

            {showResume && (
              <div className="bg-white border border-t-0 border-stc-border rounded-b-lg p-4 -mt-1">
                {resume.credits?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Credits</p>
                    {resume.credits.map((c, i) => (
                      <div key={i} className="py-1.5 border-t border-gray-100 first:border-t-0">
                        <p className="text-sm font-bold">{c.show} {c.role && <span className="font-normal text-stc-muted">— {c.role}</span>}</p>
                        <p className="text-[11px] text-stc-muted">{[c.company, c.year].filter(Boolean).join(' · ')}</p>
                      </div>
                    ))}
                  </div>
                )}

                {resume.collaborators?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Collaborators</p>
                    {resume.collaborators.map((c, i) => (
                      <div key={i} className="py-1.5 border-t border-gray-100 first:border-t-0">
                        <p className="text-sm font-bold">{c.name} <span className="font-normal text-stc-muted">— {c.role}</span></p>
                        {c.project && <p className="text-[11px] text-stc-muted">{c.project}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {resume.training?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Training</p>
                    {resume.training.map((t, i) => (
                      <div key={i} className="py-1.5 border-t border-gray-100 first:border-t-0">
                        <p className="text-sm font-bold">{t.institution} {t.program && <span className="font-normal text-stc-muted">— {t.program}</span>}</p>
                        <p className="text-[11px] text-stc-muted">{[t.instructor, t.note].filter(Boolean).join(' · ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
