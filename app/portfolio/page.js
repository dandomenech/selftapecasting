'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

export default function PortfolioPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [roles, setRoles] = useState({});
  const [view, setView] = useState('videos');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    // Delete the video file from storage if possible
    try {
      // Extract storage path from the public URL
      const url = deleteTarget.video_url;
      const marker = '/videos/';
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const path = url.substring(idx + marker.length);
        await supabase.storage.from('videos').remove([path]);
      }
    } catch (e) {
      console.error('Storage delete error (continuing):', e);
    }

    // Delete the database record
    const { error } = await supabase.from('videos').delete().eq('id', deleteTarget.id);
    if (error) {
      console.error('Delete error:', error);
      alert('Could not delete the video. Please try again.');
      setDeleting(false);
      return;
    }

    // Remove from local state
    setVideos(prev => prev.filter(v => v.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  };

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    // Load profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    setProfile(prof);

    // Load user's videos with role info
    const { data: vids } = await supabase
      .from('videos')
      .select('*, roles(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setVideos(vids || []);

    // Load all roles for reference
    const { data: allRoles } = await supabase.from('roles').select('*');
    const rolesMap = {};
    (allRoles || []).forEach(r => { rolesMap[r.id] = r; });
    setRoles(rolesMap);

    // Inbox badge count — unconfirmed callbacks + pending rep requests
    const { count: callbackCount } = await supabase
      .from('callbacks')
      .select('*', { count: 'exact', head: true })
      .eq('performer_id', session.user.id)
      .eq('performer_confirmed', false);
    const { count: repCount } = await supabase
      .from('agent_clients')
      .select('*', { count: 'exact', head: true })
      .eq('performer_id', session.user.id)
      .eq('status', 'pending');
    setInboxCount((callbackCount || 0) + (repCount || 0));

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

  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);

  const tabs = [
    { id: 'portfolio', label: 'Portfolio', icon: '👤' },
    { id: 'record', label: 'Record', icon: '⏺' },
    { id: 'inbox', label: 'Inbox', icon: '✉', badge: inboxCount },
  ];

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />

      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        {/* Profile card */}
        <div className="bg-white border border-stc-border rounded-lg p-4 mb-3">
          <div className="flex gap-3 items-center">
            <div className="w-16 h-20 bg-gray-200 border border-stc-border rounded flex items-center
                          justify-center text-stc-muted text-sm font-bold flex-shrink-0">
              {profile?.name?.split(' ').map(n => n[0]).join('') || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{profile?.name || 'Your Name'}</h1>
              <p className="text-xs text-stc-muted">
                {[profile?.vocal_range, profile?.union_status, profile?.location].filter(Boolean).join(' · ') || 'Complete your profile'}
              </p>
              <div className="mt-1.5">
                <span className="inline-block bg-stc-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">
                  Founding Member
                </span>
                {profile?.union_status && (
                  <span className="inline-block bg-gray-100 border border-gray-200 text-[10px] px-2 py-0.5 rounded">
                    {profile.union_status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-2 mt-3">
            <div className="flex-1 text-center py-1.5 bg-stc-bg rounded">
              <div className="text-lg font-bold">{Object.keys(grouped).length}</div>
              <div className="text-[10px] text-stc-muted">Roles</div>
            </div>
            <div className="flex-1 text-center py-1.5 bg-stc-bg rounded">
              <div className="text-lg font-bold">{videos.length}</div>
              <div className="text-[10px] text-stc-muted">Videos</div>
            </div>
            <div className="flex-1 text-center py-1.5 bg-stc-bg rounded">
              <div className="text-lg font-bold">{totalViews}</div>
              <div className="text-[10px] text-stc-muted">Views</div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => router.push('/profile/edit')}
              className="text-xs text-stc-link underline">
              Edit Profile
            </button>
            <span className="text-stc-border">·</span>
            <button onClick={() => router.push('/resume')}
              className="text-xs text-stc-link underline">
              Resume
            </button>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex bg-[#eee5db] rounded-lg p-0.5 mb-3">
          {['videos', 'stats'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md
                ${view === v ? 'bg-white text-stc-dark shadow-sm' : 'text-stc-muted'}`}>
              {v === 'videos' ? 'Videos' : 'Stats'}
            </button>
          ))}
        </div>

        {/* Videos view */}
        {view === 'videos' && (
          <>
            {videos.length === 0 ? (
              <div className="bg-white border border-stc-border rounded-lg p-6 text-center">
                <p className="text-sm font-bold mb-2">No videos yet</p>
                <p className="text-xs text-stc-muted mb-4">Record your first self tape to get started.</p>
                <button onClick={() => router.push('/record')}
                  className="py-3 px-6 bg-stc-accent text-white font-semibold rounded-md text-sm">
                  Record Now
                </button>
              </div>
            ) : (
              <>
                {Object.entries(grouped).map(([key, vids]) => (
                  <div key={key} className="bg-white border border-stc-border rounded-lg p-3 mb-3">
                    <h2 className="text-base font-bold mb-2">{key}</h2>
                    {vids.map(v => (
                      <div key={v.id} className="flex items-center gap-2 py-2 border-t border-gray-100">
                        <div className="w-11 h-14 bg-gray-900 rounded flex items-center justify-center
                                      text-white text-sm flex-shrink-0 cursor-pointer"
                             onClick={() => window.open(v.video_url, '_blank')}>
                          ▶
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">
                            {v.video_type === 'song_1' ? v.roles?.song_1_title :
                             v.video_type === 'song_2' ? v.roles?.song_2_title :
                             v.roles?.scene_title}
                          </p>
                          <p className="text-[10px] text-stc-muted">
                            {v.video_type === 'scene' ? 'Scene' : 'Song'} · {new Date(v.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-stc-muted mt-0.5">
                            👁 {v.views} · ⊕ {v.unique_viewers}
                          </p>
                        </div>
                        {v.status === 'processing' && (
                          <span className="text-[10px] text-stc-warning font-bold">Processing...</span>
                        )}
                        <button onClick={() => setDeleteTarget(v)}
                          className="text-stc-muted hover:text-stc-accent text-lg px-2 flex-shrink-0">
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

                <button onClick={() => router.push('/record')}
                  className="w-full py-3 bg-stc-dark text-white font-semibold rounded-md text-sm">
                  + Record New Role
                </button>
              </>
            )}
          </>
        )}

        {/* Stats view */}
        {view === 'stats' && (
          <div className="bg-white border border-stc-border rounded-lg p-3">
            <h2 className="text-base font-bold mb-2">All-time views</h2>
            {videos.map(v => (
              <div key={v.id} className="flex justify-between items-center py-2 border-t border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {v.video_type === 'song_1' ? v.roles?.song_1_title :
                     v.video_type === 'song_2' ? v.roles?.song_2_title :
                     v.roles?.scene_title}
                  </p>
                  <p className="text-[10px] text-stc-muted">{v.roles?.show_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{v.views}</p>
                  <p className="text-[10px] text-stc-muted">{v.unique_viewers} unique</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white w-full rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-bold font-serif mb-2">Delete this tape?</h2>
            <p className="text-sm text-stc-muted mb-1">
              {deleteTarget.video_type === 'song_1' ? deleteTarget.roles?.song_1_title :
               deleteTarget.video_type === 'song_2' ? deleteTarget.roles?.song_2_title :
               deleteTarget.roles?.scene_title}
            </p>
            <p className="text-xs text-stc-muted mb-4">
              This permanently removes the video. This can't be undone.
            </p>
            <button onClick={handleDelete} disabled={deleting}
              className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
            <button onClick={() => setDeleteTarget(null)} disabled={deleting}
              className="w-full py-3 mt-2 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomNav
        tabs={tabs}
        active="portfolio"
        onSelect={(id) => {
          if (id === 'record') router.push('/record');
          if (id === 'inbox') router.push('/inbox');
        }}
      />
    </div>
  );
}
