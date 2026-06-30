'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

export default function FavoritesPage() {
  const router = useRouter();
  const params = useParams();
  const breakdownId = params.breakdownId;

  const [breakdown, setBreakdown] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const dragIndex = useRef(null);

  useEffect(() => { loadData(); }, [breakdownId]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: b } = await supabase.from('breakdowns').select('*').eq('id', breakdownId).single();
    setBreakdown(b);

    const { data: favs } = await supabase
      .from('favorites')
      .select('*, submission:submission_id(*, performer:performer_id(*), video_ids)')
      .eq('breakdown_id', breakdownId)
      .eq('casting_user_id', session.user.id)
      .order('rank', { ascending: true });

    // Enrich with actual video records
    const enriched = await Promise.all((favs || []).map(async (fav) => {
      const videoIds = fav.submission?.video_ids || [];
      if (videoIds.length === 0) return { ...fav, videos: [] };
      const { data: vids } = await supabase
        .from('videos')
        .select('*, roles(*)')
        .in('id', videoIds);
      return { ...fav, videos: vids || [] };
    }));

    setFavorites(enriched);
    setLoading(false);
  };

  // ── Drag to reorder ──
  const handleDragStart = (idx) => { dragIndex.current = idx; };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === idx) return;

    const newFavs = [...favorites];
    const dragged = newFavs.splice(dragIndex.current, 1)[0];
    newFavs.splice(idx, 0, dragged);
    dragIndex.current = idx;
    setFavorites(newFavs);
  };

  const handleDragEnd = async () => {
    dragIndex.current = null;
    // Persist new rank order
    const { data: { session } } = await supabase.auth.getSession();
    await Promise.all(favorites.map((fav, idx) =>
      supabase.from('favorites').update({ rank: idx }).eq('id', fav.id)
    ));
  };

  // Touch-based swap (mobile fallback — tap up/down arrows)
  const moveUp = async (idx) => {
    if (idx === 0) return;
    const newFavs = [...favorites];
    [newFavs[idx - 1], newFavs[idx]] = [newFavs[idx], newFavs[idx - 1]];
    setFavorites(newFavs);
    const { data: { session } } = await supabase.auth.getSession();
    await Promise.all(newFavs.map((fav, i) =>
      supabase.from('favorites').update({ rank: i }).eq('id', fav.id)
    ));
  };

  const moveDown = async (idx) => {
    if (idx === favorites.length - 1) return;
    const newFavs = [...favorites];
    [newFavs[idx], newFavs[idx + 1]] = [newFavs[idx + 1], newFavs[idx]];
    setFavorites(newFavs);
    const { data: { session } } = await supabase.auth.getSession();
    await Promise.all(newFavs.map((fav, i) =>
      supabase.from('favorites').update({ rank: i }).eq('id', fav.id)
    ));
  };

  const removeFavorite = async (fav) => {
    await supabase.from('favorites').delete().eq('id', fav.id);
    setFavorites(prev => prev.filter(f => f.id !== fav.id));
  };

  const videoTitle = (v) => {
    if (v.video_type === 'song_1') return v.roles?.song_1_title;
    if (v.video_type === 'song_2') return v.roles?.song_2_title;
    return v.roles?.scene_title;
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.push(`/breakdowns/${breakdownId}`)}
          className="text-sm text-stc-link underline mb-3">← {breakdown?.role_name}</button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold font-serif">Shortlist</h1>
          <button onClick={() => router.push(`/breakdowns/${breakdownId}/cast`)}
            className="text-xs font-semibold px-3 py-2 bg-stc-dark text-white rounded-md">
            View Cast →
          </button>
        </div>
        <p className="text-xs text-stc-muted mb-4">
          {breakdown?.role_name} — {breakdown?.show_name}. Drag or use arrows to rank your top picks.
        </p>

        {favorites.length === 0 ? (
          <div className="bg-white border border-stc-border rounded-lg p-6 text-center">
            <p className="text-sm font-bold mb-2">No one shortlisted yet</p>
            <p className="text-xs text-stc-muted leading-relaxed">
              Tap the ★ on a performer's submission to add them here. Then rank them in order before making callbacks or bookings.
            </p>
            <button onClick={() => router.push(`/breakdowns/${breakdownId}`)}
              className="mt-3 text-xs text-stc-link underline">Review submissions →</button>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-stc-muted mb-3">
              {favorites.length} performer{favorites.length !== 1 ? 's' : ''} shortlisted · drag to reorder
            </p>

            {favorites.map((fav, idx) => {
              const performer = fav.submission?.performer;
              const sub = fav.submission;

              return (
                <div key={fav.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className="bg-white border border-stc-border rounded-lg mb-3 overflow-hidden">

                  {/* Performer header row */}
                  <div className="flex items-center gap-3 p-3">
                    {/* Rank number */}
                    <div className="w-7 h-7 rounded-full bg-stc-dark flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>

                    {/* Headshot */}
                    <div className="w-10 h-12 bg-gray-200 border border-stc-border rounded flex items-center justify-center text-xs font-bold text-stc-muted flex-shrink-0">
                      {performer?.headshot_url
                        ? <img src={performer.headshot_url} alt={performer.name} className="w-full h-full object-cover rounded" />
                        : performer?.name?.split(' ').map(n => n[0]).join('')}
                    </div>

                    <div className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => router.push(`/submissions/${fav.submission_id}`)}>
                      <p className="text-sm font-bold truncate">{performer?.name}</p>
                      <p className="text-[10px] text-stc-muted">
                        {[performer?.vocal_range, performer?.location].filter(Boolean).join(' · ')}
                      </p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                        sub?.status === 'booked' ? 'bg-green-100 text-stc-success' :
                        sub?.status === 'callback' ? 'bg-amber-100 text-stc-warning' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {sub?.status?.toUpperCase()}
                      </span>
                    </div>

                    {/* Reorder arrows (mobile-friendly) */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => moveUp(idx)} disabled={idx === 0}
                        className="w-7 h-7 rounded border border-stc-border flex items-center justify-center text-xs disabled:opacity-30">
                        ▲
                      </button>
                      <button onClick={() => moveDown(idx)} disabled={idx === favorites.length - 1}
                        className="w-7 h-7 rounded border border-stc-border flex items-center justify-center text-xs disabled:opacity-30">
                        ▼
                      </button>
                    </div>

                    {/* Drag handle */}
                    <div className="text-stc-muted text-lg cursor-grab flex-shrink-0 select-none">⠿</div>
                  </div>

                  {/* Inline videos */}
                  {fav.videos?.length > 0 && (
                    <div className="border-t border-gray-100">
                      {/* Video selector tabs */}
                      {fav.videos.length > 1 && (
                        <div className="flex gap-1 px-3 py-2">
                          {fav.videos.map(v => (
                            <button key={v.id}
                              onClick={() => setPlayingId(playingId === v.id ? null : v.id)}
                              className={`text-[10px] px-2 py-1 rounded border font-semibold
                                ${playingId === v.id ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-muted border-stc-border'}`}>
                              {videoTitle(v)}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Single video — auto-show inline */}
                      {fav.videos.length === 1 && (
                        <div className="px-3 py-2">
                          <button onClick={() => setPlayingId(playingId === fav.videos[0].id ? null : fav.videos[0].id)}
                            className="text-[10px] text-stc-link underline">
                            {playingId === fav.videos[0].id ? '▲ Hide' : '▶ Watch'} {videoTitle(fav.videos[0])}
                          </button>
                        </div>
                      )}

                      {/* Video player */}
                      {fav.videos.map(v => (
                        playingId === v.id && (
                          <div key={v.id} className="bg-black">
                            <video src={v.video_url} controls autoPlay playsInline
                              className="w-full" style={{ maxHeight: '50vh' }} />
                          </div>
                        )
                      ))}
                    </div>
                  )}

                  {/* Remove from shortlist */}
                  <div className="px-3 py-2 border-t border-gray-100 flex justify-between items-center">
                    <button onClick={() => removeFavorite(fav)}
                      className="text-[11px] text-stc-muted underline">Remove from shortlist</button>
                    <button onClick={() => router.push(`/submissions/${fav.submission_id}`)}
                      className="text-[11px] text-stc-link underline">Full view →</button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
