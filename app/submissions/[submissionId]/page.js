'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

export default function SubmissionViewerPage() {
  const router = useRouter();
  const params = useParams();
  const submissionId = params.submissionId;

  const [submission, setSubmission] = useState(null);
  const [videos, setVideos] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [performer, setPerformer] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { loadData(); }, [submissionId]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: sub } = await supabase
      .from('submissions')
      .select('*, breakdown:breakdown_id(*), performer:performer_id(*)')
      .eq('id', submissionId)
      .single();

    if (!sub) { router.push('/breakdowns'); return; }
    setSubmission(sub);
    setBreakdown(sub.breakdown);
    setPerformer(sub.performer);

    // Load the specific videos that were submitted
    if (sub.video_ids?.length > 0) {
      const { data: vids } = await supabase
        .from('videos')
        .select('*, roles(*)')
        .in('id', sub.video_ids);
      setVideos(vids || []);
      // Auto-play first video
      if (vids?.length > 0) setPlayingId(vids[0].id);
    }

    // Check if already favorited
    const { data: fav } = await supabase
      .from('favorites')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('casting_user_id', session.user.id)
      .maybeSingle();
    setIsFavorited(!!fav);

    // Record a view
    await supabase.from('video_views').insert({
      video_id: sub.video_ids?.[0],
      viewer_id: session.user.id,
    }).single();

    setLoading(false);
  };

  const toggleFavorite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (isFavorited) {
      await supabase.from('favorites')
        .delete()
        .eq('submission_id', submissionId)
        .eq('casting_user_id', session.user.id);
      setIsFavorited(false);
    } else {
      // Get current max rank for this breakdown to append at end
      const { data: existing } = await supabase
        .from('favorites')
        .select('rank')
        .eq('breakdown_id', submission.breakdown_id)
        .eq('casting_user_id', session.user.id)
        .order('rank', { ascending: false })
        .limit(1);
      const nextRank = (existing?.[0]?.rank ?? -1) + 1;

      await supabase.from('favorites').insert({
        breakdown_id: submission.breakdown_id,
        casting_user_id: session.user.id,
        submission_id: submissionId,
        rank: nextRank,
      });
      setIsFavorited(true);
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    await supabase.from('submissions').update({ status: newStatus }).eq('id', submissionId);
    setSubmission(prev => ({ ...prev, status: newStatus }));
    setUpdating(false);
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  const videoTitle = (v) => {
    if (v.video_type === 'song_1') return v.roles?.song_1_title;
    if (v.video_type === 'song_2') return v.roles?.song_2_title;
    return v.roles?.scene_title;
  };

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.push(`/breakdowns/${submission.breakdown_id}`)}
          className="text-sm text-stc-link underline mb-3">← {breakdown?.role_name} submissions</button>

        {/* Performer header */}
        <div className="bg-white border border-stc-border rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-16 bg-gray-200 border border-stc-border rounded flex items-center justify-center text-sm font-bold text-stc-muted flex-shrink-0">
              {performer?.headshot_url
                ? <img src={performer.headshot_url} alt={performer.name} className="w-full h-full object-cover rounded" />
                : performer?.name?.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold">{performer?.name}</p>
              <p className="text-[11px] text-stc-muted">
                {[performer?.vocal_range, performer?.union_status, performer?.location].filter(Boolean).join(' · ')}
              </p>
              <p className="text-[10px] text-stc-link underline mt-1 cursor-pointer"
                onClick={() => router.push(`/profile/${submission.performer_id}`)}>
                Full portfolio →
              </p>
            </div>

            {/* Favorite star */}
            <button onClick={toggleFavorite}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl border
                ${isFavorited ? 'bg-stc-gold border-stc-gold text-white' : 'bg-white border-stc-border text-gray-400'}`}>
              ★
            </button>
          </div>
        </div>

        {/* Skill check answers — what they said they can do */}
        {submission.skill_check_answers && Object.keys(submission.skill_check_answers).length > 0 && (
          <div className="bg-white border border-stc-border rounded-lg p-3 mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(submission.skill_check_answers).map(([skill, canDo]) => (
                <span key={skill} className={`text-xs px-2.5 py-1 rounded-full font-semibold
                  ${canDo ? 'bg-green-100 text-stc-success' : 'bg-red-50 text-stc-accent'}`}>
                  {canDo ? '✓' : '✗'} {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Video tabs */}
        {videos.length > 1 && (
          <div className="flex gap-2 mb-2 overflow-x-auto">
            {videos.map(v => (
              <button key={v.id} onClick={() => setPlayingId(v.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-md text-xs font-semibold border
                  ${playingId === v.id ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                {videoTitle(v)}
              </button>
            ))}
          </div>
        )}

        {/* Video player */}
        {videos.length === 0 ? (
          <div className="bg-white border border-stc-border rounded-lg p-6 text-center mb-3">
            <p className="text-sm text-stc-muted">No videos submitted.</p>
          </div>
        ) : (
          <div className="bg-black rounded-lg overflow-hidden mb-3">
            {videos.map(v => (
              <div key={v.id} className={playingId === v.id ? '' : 'hidden'}>
                <video
                  src={v.video_url}
                  controls
                  autoPlay={playingId === v.id}
                  playsInline
                  className="w-full"
                  style={{ maxHeight: '55vh' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Status + actions */}
        <div className="bg-white border border-stc-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase text-stc-muted">Status</p>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              submission.status === 'booked' ? 'bg-green-100 text-stc-success' :
              submission.status === 'callback' ? 'bg-amber-100 text-stc-warning' :
              submission.status === 'passed' ? 'bg-gray-100 text-stc-muted' :
              'bg-blue-50 text-blue-600'
            }`}>
              {submission.status.toUpperCase()}
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {submission.status !== 'callback' && submission.status !== 'booked' && (
              <button onClick={() => updateStatus('callback')} disabled={updating}
                className="flex-1 py-2.5 bg-amber-50 border border-amber-200 text-stc-warning rounded-md text-xs font-semibold disabled:opacity-50">
                ↩ Callback
              </button>
            )}
            {submission.status !== 'booked' && (
              <button onClick={() => updateStatus('booked')} disabled={updating}
                className="flex-1 py-2.5 bg-green-50 border border-green-200 text-stc-success rounded-md text-xs font-semibold disabled:opacity-50">
                ★ Book
              </button>
            )}
            {submission.status !== 'passed' && submission.status !== 'booked' && (
              <button onClick={() => updateStatus('passed')} disabled={updating}
                className="flex-1 py-2.5 bg-gray-50 border border-gray-200 text-stc-muted rounded-md text-xs font-semibold disabled:opacity-50">
                Pass
              </button>
            )}
            {submission.status === 'booked' && (
              <p className="text-xs text-stc-success font-bold text-center w-full py-2">
                ★ This performer is booked.
              </p>
            )}
          </div>

          {isFavorited && (
            <p className="text-[11px] text-stc-gold text-center mt-2">
              ★ In your shortlist for {breakdown?.role_name}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
