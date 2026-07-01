'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import Camera from '@/components/Camera';

export default function CallbackDetailPage() {
  const router = useRouter();
  const params = useParams();
  const callbackId = params.callbackId;

  const [callback, setCallback] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [casting, setCasting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [availability, setAvailability] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Camera / recording state
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => { loadData(); }, [callbackId]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: cb } = await supabase
      .from('callbacks')
      .select('*, breakdown:breakdown_id(*), casting:casting_user_id(*)')
      .eq('id', callbackId)
      .single();

    if (!cb || cb.performer_id !== session.user.id) {
      router.push('/inbox');
      return;
    }

    setCallback(cb);
    setBreakdown(cb.breakdown);
    setCasting(cb.casting);
    setConfirmed(cb.performer_confirmed);
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (callback.format === 'in_person' && !availability.trim()) {
      alert('Please enter your availability or contact info before confirming.');
      return;
    }
    setConfirming(true);
    await supabase.from('callbacks').update({
      performer_confirmed: true,
      confirmed_at: new Date().toISOString(),
      status: 'confirmed',
      ...(availability.trim() ? {
        instructions: (callback.instructions ? callback.instructions + '\n\nPerformer availability: ' : 'Performer availability: ') + availability.trim()
      } : {}),
    }).eq('id', callbackId);

    await supabase.from('submission_changes')
      .update({ seen_by_performer: true })
      .eq('submission_id', callback.submission_id)
      .eq('seen_by_performer', false);

    setConfirmed(true);
    setConfirming(false);
  };

  const handleRecordingComplete = async (blob) => {
    setShowCamera(false);
    setUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session.user.id;
    const fileName = `${userId}/callback_${callbackId}_${Date.now()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, blob, { contentType: 'video/webm', upsert: false });

    if (uploadError) {
      alert('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);

    // Create a new video record linked back to this callback's breakdown role
    const { data: newVideo } = await supabase.from('videos').insert({
      user_id: userId,
      video_url: urlData.publicUrl,
      role_id: callback.breakdown?.role_id || null,
      video_type: 'callback',
      status: 'live',
      file_name: fileName,
    }).select().single();

    // Link the new video to the callback and the original submission
    if (newVideo) {
      await supabase.from('callbacks').update({
        new_submission_id: callback.submission_id,
        footage_submitted_at: new Date().toISOString(),
        status: confirmed ? 'footage_submitted' : callback.status,
      }).eq('id', callbackId);

      // Also append the new video to the original submission's video_ids
      const { data: sub } = await supabase
        .from('submissions')
        .select('video_ids')
        .eq('id', callback.submission_id)
        .single();

      if (sub) {
        const updatedIds = [...(sub.video_ids || []), newVideo.id];
        await supabase.from('submissions')
          .update({ video_ids: updatedIds, updated_at: new Date().toISOString() })
          .eq('id', callback.submission_id);
      }

      // Log the change so casting gets notified
      await supabase.from('submission_changes').insert({
        submission_id: callback.submission_id,
        changed_by: userId,
        change_type: 'footage_submitted',
        change_summary: 'New callback footage submitted.',
        seen_by_performer: true,
      });
    }

    setUploading(false);
    setUploadSuccess(true);
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  const isFinal = callback.type === 'final';
  const formatLabel = {
    in_person: 'In Person',
    new_video: 'New Video Submission',
    either: 'Your Choice — In Person or New Video',
  }[callback.format];

  // ── Camera recording view ──
  if (showCamera) {
    return (
      <div className="min-h-screen bg-stc-bg">
        <TopNav />
        <main className="max-w-md mx-auto px-4 py-4 pb-12">
          <button onClick={() => setShowCamera(false)}
            className="text-sm text-stc-link underline mb-3">← Back to callback</button>
          <h2 className="text-base font-bold mb-1">Recording callback footage</h2>
          <p className="text-xs text-stc-muted mb-3">{breakdown?.role_name} — {breakdown?.show_name}</p>
          {callback.instructions && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
              <p className="text-[11px] leading-relaxed"><strong>What they need:</strong> {callback.instructions}</p>
            </div>
          )}
          <Camera
            trackUrl={null}
            onRecordingComplete={handleRecordingComplete}
            onCancel={() => setShowCamera(false)}
          />
        </main>
      </div>
    );
  }

  // ── Uploading state ──
  if (uploading) {
    return (
      <div className="min-h-screen bg-stc-bg flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-3xl mb-3">⏳</div>
          <p className="text-sm font-bold">Uploading your footage...</p>
          <p className="text-xs text-stc-muted mt-1">Sending it directly to casting.</p>
        </div>
      </div>
    );
  }

  // ── Upload success ──
  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-stc-bg">
        <TopNav />
        <main className="max-w-md mx-auto px-4 py-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center mt-8">
            <p className="text-lg font-bold text-stc-success mb-1">✓ Footage submitted</p>
            <p className="text-xs text-stc-muted mb-4">
              Your new tape for {breakdown?.role_name} has been sent. Casting will be notified.
            </p>
            <button onClick={() => router.push('/inbox')}
              className="py-2.5 px-6 bg-stc-dark text-white rounded-md text-sm font-semibold">
              Back to Inbox
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Main callback detail view ──
  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.push('/inbox')} className="text-sm text-stc-link underline mb-3">← Inbox</button>

        {/* Header */}
        <div className="rounded-lg p-4 mb-4 text-white"
          style={{ background: isFinal ? '#c67100' : '#1a1a2e' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1 opacity-80">
            {isFinal ? '⭐ Final Callback' : '↩ Callback'}
          </p>
          <p className="text-xl font-bold font-serif">{breakdown?.role_name}</p>
          <p className="text-sm opacity-80">{breakdown?.show_name}</p>
          <p className="text-[11px] opacity-60 mt-1">from {casting?.name}</p>
        </div>

        {/* What they responded to */}
        <div className="bg-white border border-stc-border rounded-lg p-4 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stc-muted mb-2">What they responded to</p>
          <p className="text-sm leading-relaxed">"{callback.note}"</p>
        </div>

        {/* What they need */}
        {callback.instructions && (
          <div className="bg-white border border-stc-border rounded-lg p-4 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stc-muted mb-2">
              {isFinal ? 'What they need to make their decision' : 'What to prepare'}
            </p>
            <p className="text-sm leading-relaxed">{callback.instructions}</p>
          </div>
        )}

        {/* Format */}
        <div className="bg-white border border-stc-border rounded-lg p-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stc-muted mb-2">Format</p>
          <p className="text-sm font-bold">{formatLabel}</p>
        </div>

        {/* ── Next step ── */}
        {confirmed ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-bold text-stc-success mb-1">✓ Confirmed</p>
            <p className="text-xs text-stc-muted mb-3">
              {callback.format === 'new_video' || callback.format === 'either'
                ? 'Record your new footage below — it goes directly to casting.'
                : 'The casting director has been notified.'}
            </p>
            {(callback.format === 'new_video' || callback.format === 'either') && (
              <>
                {uploadSuccess ? (
                  <p className="text-xs text-stc-success font-bold">✓ New footage submitted</p>
                ) : (
                  <button onClick={() => setShowCamera(true)}
                    className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm">
                    ⏺ Record New Footage
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-white border border-stc-border rounded-lg p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-3">Your next step</p>

            {/* In person */}
            {callback.format === 'in_person' && (
              <>
                <p className="text-xs text-stc-muted mb-2 leading-relaxed">
                  Enter your availability and best contact so casting can schedule you.
                </p>
                <textarea value={availability} onChange={e => setAvailability(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white min-h-[80px] mb-3"
                  placeholder="e.g. Available Mon–Fri after 2pm. Best number: 555-867-5309" />
                <button onClick={handleConfirm} disabled={confirming || !availability.trim()}
                  className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50">
                  {confirming ? 'Confirming...' : 'Confirm Callback'}
                </button>
              </>
            )}

            {/* New video */}
            {callback.format === 'new_video' && (
              <>
                <p className="text-xs text-stc-muted mb-3 leading-relaxed">
                  Confirm you received this, then record and submit your new footage right here.
                </p>
                <button onClick={handleConfirm} disabled={confirming}
                  className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50 mb-2">
                  {confirming ? 'Confirming...' : 'Confirm Callback'}
                </button>
                <button onClick={() => setShowCamera(true)}
                  className="w-full py-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
                  ⏺ Record New Footage
                </button>
              </>
            )}

            {/* Either */}
            {callback.format === 'either' && (
              <>
                <p className="text-xs text-stc-muted mb-3 leading-relaxed">
                  Choose how you'd like to respond.
                </p>
                <div className="flex gap-2 mb-3">
                  {['in_person', 'new_video'].map(f => (
                    <button key={f} onClick={() => setAvailability(f === 'in_person' ? 'in_person' : 'new_video')}
                      className={`flex-1 py-2.5 rounded-md text-xs font-semibold border
                        ${availability === f ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                      {f === 'in_person' ? 'In Person' : 'New Video'}
                    </button>
                  ))}
                </div>

                {availability === 'in_person' && (
                  <textarea onChange={e => setAvailability('in_person: ' + e.target.value)}
                    className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white min-h-[70px] mb-3"
                    placeholder="Enter your availability and contact number" />
                )}

                <button onClick={handleConfirm} disabled={confirming || !availability}
                  className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50 mb-2">
                  {confirming ? 'Confirming...' : 'Confirm Callback'}
                </button>
                {availability === 'new_video' && (
                  <button onClick={() => setShowCamera(true)}
                    className="w-full py-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
                    ⏺ Record New Footage
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
