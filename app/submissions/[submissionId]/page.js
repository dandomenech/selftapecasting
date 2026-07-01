'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import VerificationGate from '@/components/VerificationGate';

function SubmissionViewerInner() {
  const router = useRouter();
  const params = useParams();
  const submissionId = params.submissionId;

  const [submission, setSubmission] = useState(null);
  const [videos, setVideos] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [performer, setPerformer] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [existingCallback, setExistingCallback] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Callback sheet state
  const [showCallbackSheet, setShowCallbackSheet] = useState(false);
  const [cbType, setCbType] = useState('initial');
  const [cbNote, setCbNote] = useState('');
  const [cbFormat, setCbFormat] = useState('');
  const [cbInstructions, setCbInstructions] = useState('');
  const [cbSaving, setCbSaving] = useState(false);
  const [cbError, setCbError] = useState('');

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

    if (sub.video_ids?.length > 0) {
      const { data: vids } = await supabase
        .from('videos').select('*, roles(*)')
        .in('id', sub.video_ids);
      setVideos(vids || []);
      if (vids?.length > 0) setPlayingId(vids[0].id);
    }

    const { data: fav } = await supabase
      .from('favorites').select('id')
      .eq('submission_id', submissionId)
      .eq('casting_user_id', session.user.id)
      .maybeSingle();
    setIsFavorited(!!fav);

    // Load most recent callback for this submission
    const { data: cb } = await supabase
      .from('callbacks')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setExistingCallback(cb);

    // Record a view
    if (sub.video_ids?.[0]) {
      await supabase.from('video_views').insert({
        video_id: sub.video_ids[0],
        viewer_id: session.user.id,
      }).single();
    }

    setLoading(false);
  };

  const toggleFavorite = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (isFavorited) {
      await supabase.from('favorites').delete()
        .eq('submission_id', submissionId)
        .eq('casting_user_id', session.user.id);
      setIsFavorited(false);
    } else {
      const { data: existing } = await supabase
        .from('favorites').select('rank')
        .eq('breakdown_id', submission.breakdown_id)
        .eq('casting_user_id', session.user.id)
        .order('rank', { ascending: false }).limit(1);
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

  const sendCallback = async () => {
    setCbError('');

    if (!cbNote.trim()) {
      setCbError('You must tell the performer what you responded to. No blank callbacks.');
      return;
    }

    // Client-side minimum — catch obvious non-feedback immediately
    if (cbNote.trim().length < 30) {
      setCbError('That\'s not enough feedback. Tell the performer specifically what you responded to — a moment, a quality, a choice they made. At least a sentence.');
      return;
    }

    if (!cbFormat) {
      setCbError('Specify whether this is in-person, new video, or their choice.');
      return;
    }
    if (cbType === 'final' && !cbInstructions.trim()) {
      setCbError('Final callbacks require specific instructions — what exactly do you need to see?');
      return;
    }

    setCbSaving(true);
    setCbError('');

    // AI quality check — validate the note is genuinely useful
    try {
      const validationRes = await fetch('/api/validate-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: cbNote.trim(),
          type: cbType,
          roleName: breakdown?.role_name,
          showName: breakdown?.show_name,
        }),
      });
      const validation = await validationRes.json();

      if (!validation.valid) {
        setCbError(
          `${validation.reason || 'That feedback is too generic.'} The performer needs to know specifically what you responded to so they can prepare. Please be more specific.`
        );
        setCbSaving(false);
        return;
      }
    } catch {
      // API error — don't block, continue
    }

    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase.from('callbacks').insert({
      submission_id: submissionId,
      breakdown_id: submission.breakdown_id,
      performer_id: submission.performer_id,
      casting_user_id: session.user.id,
      type: cbType,
      note: cbNote.trim(),
      format: cbFormat,
      instructions: cbInstructions.trim(),
      status: 'sent',
    });

    if (error) {
      setCbError('Could not send callback. Please try again.');
      setCbSaving(false);
      return;
    }

    // Update submission status
    await supabase.from('submissions').update({ status: 'callback' }).eq('id', submissionId);

    // Log for performer's notification audit trail
    await supabase.from('submission_changes').insert({
      submission_id: submissionId,
      changed_by: session.user.id,
      change_type: cbType === 'final' ? 'final_callback' : 'callback',
      change_summary: `${cbType === 'final' ? 'Final callback' : 'Callback'} sent: ${cbNote.trim().substring(0, 80)}`,
      seen_by_performer: false,
    });

    setCbSaving(false);
    setShowCallbackSheet(false);
    loadData();
  };

  const updateStatus = async (newStatus) => {
    if (newStatus === 'callback') {
      setShowCallbackSheet(true);
      return;
    }
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
            <button onClick={toggleFavorite}
              className={`flex-shrink-0 flex flex-col items-center justify-center px-2 py-2 rounded-lg border min-w-[56px]
                ${isFavorited ? 'bg-stc-gold border-stc-gold text-white' : 'bg-white border-stc-border text-stc-muted'}`}>
              <span className="text-lg leading-none">★</span>
              <span className="text-[9px] font-bold mt-0.5">{isFavorited ? 'Shortlisted' : 'Shortlist'}</span>
            </button>
          </div>
        </div>

        {/* Skill check answers */}
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
                <video src={v.video_url} controls autoPlay={playingId === v.id} playsInline
                  className="w-full" style={{ maxHeight: '55vh' }} />
              </div>
            ))}
          </div>
        )}

        {/* Existing callback display */}
        {existingCallback && (
          <div className={`rounded-lg p-3 mb-3 border ${existingCallback.type === 'final' ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1">
              {existingCallback.type === 'final' ? '⭐ Final Callback Sent' : '↩ Callback Sent'}
            </p>
            <p className="text-sm italic mb-2">"{existingCallback.note}"</p>
            {existingCallback.instructions && (
              <p className="text-xs text-stc-muted mb-1"><strong>Instructions:</strong> {existingCallback.instructions}</p>
            )}
            <p className="text-xs text-stc-muted">
              Format: {existingCallback.format === 'in_person' ? 'In person' : existingCallback.format === 'new_video' ? 'New video' : 'Performer\'s choice'} ·
              {existingCallback.performer_confirmed ? ' ✓ Performer confirmed' : ' Awaiting confirmation'}
            </p>
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
            {submission.status === 'callback' && (
              <button onClick={() => setShowCallbackSheet(true)}
                className="flex-1 py-2.5 bg-amber-50 border border-amber-300 text-stc-warning rounded-md text-xs font-semibold">
                ↩ Send Another Callback
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
              <p className="text-xs text-stc-success font-bold text-center w-full py-2">★ This performer is booked.</p>
            )}
          </div>
        </div>
      </main>

      {/* ── Callback Sheet ── */}
      {showCallbackSheet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => !cbSaving && setShowCallbackSheet(false)}>
          <div className="bg-white w-full max-h-[90vh] overflow-auto rounded-t-2xl p-4"
            onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-bold font-serif mb-1">Send a Callback</h2>
            <p className="text-xs text-stc-muted mb-4 leading-relaxed">
              Every callback requires real feedback. No blind callbacks — the performer must know what you responded to and what you need from them.
            </p>

            {/* Callback type */}
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Callback Type</label>
            <div className="flex gap-2 mb-4">
              {[
                { id: 'initial', label: 'Initial Callback', desc: 'You want to see more' },
                { id: 'final', label: 'Final Callback', desc: 'Making your decision' },
              ].map(t => (
                <button key={t.id} onClick={() => setCbType(t.id)}
                  className={`flex-1 py-2.5 px-2 rounded-md border text-left
                    ${cbType === t.id ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className={`text-[10px] ${cbType === t.id ? 'text-gray-300' : 'text-stc-muted'}`}>{t.desc}</p>
                </button>
              ))}
            </div>

            {/* Note — required for BOTH types */}
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">
              What did you respond to? <span className="text-stc-accent">*</span>
            </label>
            <p className="text-[11px] text-stc-muted mb-1.5 leading-relaxed">
              Be specific. A moment, a quality, a choice they made. Generic compliments don't count — the performer needs to know what to bring to the callback.
            </p>
            <textarea value={cbNote} onChange={e => setCbNote(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white min-h-[90px] mb-1"
              placeholder={cbType === 'initial'
                ? 'e.g. "Strong in the ballad. Want to hear how you handle the uptempo."'
                : 'e.g. "Came down to you and one other person. Need to see the scene again to decide."'} />
            <p className={`text-[10px] mb-3 text-right ${cbNote.trim().length < 30 ? 'text-stc-accent' : 'text-stc-success'}`}>
              {cbNote.trim().length} characters {cbNote.trim().length < 30 ? `(need at least 30)` : '✓'}
            </p>

            {/* Format */}
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">
              Callback Format <span className="text-stc-accent">*</span>
            </label>
            <div className="flex gap-2 mb-3">
              {[
                { id: 'in_person', label: 'In Person' },
                { id: 'new_video', label: 'New Video' },
                { id: 'either', label: 'Either' },
              ].map(f => (
                <button key={f.id} onClick={() => setCbFormat(f.id)}
                  className={`flex-1 py-2.5 rounded-md text-xs font-semibold border
                    ${cbFormat === f.id ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Instructions — required for Final */}
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">
              Specific Instructions {cbType === 'final' && <span className="text-stc-accent">*</span>}
              {cbType === 'initial' && <span className="text-stc-muted font-normal"> (optional for initial)</span>}
            </label>
            <textarea value={cbInstructions} onChange={e => setCbInstructions(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white min-h-[70px] mb-3"
              placeholder={cbType === 'final'
                ? "Required: exactly what you need to see. Song, scene, adjustment, what to prepare."
                : "Optional: any specific adjustments, material to prepare, or things to bring."} />

            {cbError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                <p className="text-sm text-stc-accent">{cbError}</p>
              </div>
            )}

            <button onClick={sendCallback} disabled={cbSaving}
              className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50 mb-2">
              {cbSaving ? 'Sending...' : `Send ${cbType === 'final' ? 'Final ' : ''}Callback`}
            </button>
            <button onClick={() => setShowCallbackSheet(false)} disabled={cbSaving}
              className="w-full py-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubmissionViewerPage() {
  return (
    <VerificationGate>
      <SubmissionViewerInner />
    </VerificationGate>
  );
}
