'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

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
    const { data: { session } } = await supabase.auth.getSession();

    await supabase.from('callbacks').update({
      performer_confirmed: true,
      confirmed_at: new Date().toISOString(),
      status: 'confirmed',
      // Store availability note in instructions field if provided
      ...(availability.trim() ? { instructions: (callback.instructions ? callback.instructions + '\n\nPerformer availability: ' : 'Performer availability: ') + availability.trim() } : {}),
    }).eq('id', callbackId);

    // Mark the submission_changes entry as seen
    await supabase.from('submission_changes')
      .update({ seen_by_performer: true })
      .eq('submission_id', callback.submission_id)
      .eq('seen_by_performer', false);

    setConfirmed(true);
    setConfirming(false);
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  const isFinal = callback.type === 'final';
  const formatLabel = {
    in_person: 'In Person',
    new_video: 'New Video Submission',
    either: 'Your Choice — In Person or New Video',
  }[callback.format];

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.push('/inbox')} className="text-sm text-stc-link underline mb-3">← Inbox</button>

        {/* Header */}
        <div className={`rounded-lg p-4 mb-4 text-white ${isFinal ? 'bg-stc-warning' : 'bg-stc-dark'}`}
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

        {/* ── Next step based on format ── */}
        {confirmed ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm font-bold text-stc-success mb-1">✓ Confirmed</p>
            <p className="text-xs text-stc-muted">
              {callback.format === 'new_video'
                ? 'Record your new footage below when you\'re ready.'
                : 'The casting director has been notified.'}
            </p>
            {(callback.format === 'new_video' || callback.format === 'either') && (
              <button onClick={() => router.push('/record')}
                className="w-full py-3 mt-3 bg-stc-accent text-white font-semibold rounded-md text-sm">
                Record New Footage →
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-stc-border rounded-lg p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-3">Your next step</p>

            {/* In person — needs availability */}
            {callback.format === 'in_person' && (
              <>
                <p className="text-xs text-stc-muted mb-2 leading-relaxed">
                  Enter your availability and best contact number so casting can schedule you.
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
                  Confirm you received this callback, then record and submit your new footage.
                </p>
                <button onClick={handleConfirm} disabled={confirming}
                  className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50 mb-2">
                  {confirming ? 'Confirming...' : 'Confirm Callback'}
                </button>
                <button onClick={() => router.push('/record')}
                  className="w-full py-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
                  Record New Footage →
                </button>
              </>
            )}

            {/* Either — performer chooses */}
            {callback.format === 'either' && (
              <>
                <p className="text-xs text-stc-muted mb-3 leading-relaxed">
                  Choose how you'd like to respond — in person or a new video submission.
                </p>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => { setAvailability('Prefer in-person'); }}
                    className={`flex-1 py-2.5 rounded-md text-xs font-semibold border
                      ${availability === 'Prefer in-person' ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                    In Person
                  </button>
                  <button onClick={() => { setAvailability('Prefer new video'); }}
                    className={`flex-1 py-2.5 rounded-md text-xs font-semibold border
                      ${availability === 'Prefer new video' ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                    New Video
                  </button>
                </div>

                {availability === 'Prefer in-person' && (
                  <textarea value={''} onChange={e => setAvailability('Prefer in-person: ' + e.target.value)}
                    className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white min-h-[70px] mb-3"
                    placeholder="Enter your availability and contact number" />
                )}

                <button onClick={handleConfirm} disabled={confirming || !availability}
                  className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50 mb-2">
                  {confirming ? 'Confirming...' : 'Confirm Callback'}
                </button>
                {(availability === 'Prefer new video' || !availability) && (
                  <button onClick={() => router.push('/record')}
                    className="w-full py-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
                    Record New Footage →
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
