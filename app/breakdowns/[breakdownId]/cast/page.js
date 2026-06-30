'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

export default function CastPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const breakdownId = params.breakdownId;

  const [breakdown, setBreakdown] = useState(null);
  const [booked, setBooked] = useState([]);
  const [considering, setConsidering] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => { loadData(); }, [breakdownId]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: b } = await supabase.from('breakdowns').select('*').eq('id', breakdownId).single();
    setBreakdown(b);

    const { data: subs } = await supabase
      .from('submissions')
      .select('*, performer:performer_id(*)')
      .eq('breakdown_id', breakdownId)
      .in('status', ['booked', 'callback']);

    const all = subs || [];
    setBooked(all.filter(s => s.status === 'booked'));
    setConsidering(all.filter(s => s.status === 'callback'));
    setLoading(false);
  };

  const promoteToBooked = async (sub) => {
    setUpdating(sub.id);
    await supabase.from('submissions').update({ status: 'booked' }).eq('id', sub.id);
    setUpdating(null);
    loadData();
  };

  const moveToConsidering = async (sub) => {
    setUpdating(sub.id);
    await supabase.from('submissions').update({ status: 'callback' }).eq('id', sub.id);
    setUpdating(null);
    loadData();
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  const totalCount = booked.length + considering.length;

  const PerformerCard = ({ sub, section }) => {
    const p = sub.performer;
    const initials = p?.name?.split(' ').map(n => n[0]).join('') || '?';

    return (
      <div className={`rounded-lg border p-3 mb-2 ${section === 'booked' ? 'bg-white border-stc-success' : 'bg-white border-stc-border'}`}>
        <div className="flex items-center gap-3">
          {/* Headshot */}
          <div className={`w-14 h-16 rounded flex items-center justify-center text-sm font-bold flex-shrink-0
            ${section === 'booked' ? 'bg-green-50 border border-stc-success text-stc-success' : 'bg-gray-100 border border-stc-border text-stc-muted'}`}>
            {p?.headshot_url
              ? <img src={p.headshot_url} alt={p.name} className="w-full h-full object-cover rounded" />
              : initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{p?.name}</p>
            <p className="text-[10px] text-stc-muted">
              {[p?.vocal_range, p?.union_status].filter(Boolean).join(' · ')}
            </p>
            <p className="text-[10px] text-stc-muted">{p?.location}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            {section === 'considering' && (
              <button onClick={() => promoteToBooked(sub)} disabled={updating === sub.id}
                className="text-[10px] px-2.5 py-1.5 bg-green-50 border border-green-200 text-stc-success rounded font-semibold whitespace-nowrap disabled:opacity-50">
                {updating === sub.id ? '...' : '★ Book'}
              </button>
            )}
            {section === 'booked' && (
              <button onClick={() => moveToConsidering(sub)} disabled={updating === sub.id}
                className="text-[10px] px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-stc-warning rounded font-semibold whitespace-nowrap disabled:opacity-50">
                {updating === sub.id ? '...' : '↩ Hold'}
              </button>
            )}
            <button onClick={() => router.push(`/submissions/${sub.id}`)}
              className="text-[10px] px-2.5 py-1.5 bg-stc-bg border border-stc-border text-stc-muted rounded font-semibold">
              Watch
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.push(`/breakdowns/${breakdownId}/favorites`)}
          className="text-sm text-stc-link underline mb-3">← Shortlist</button>

        <h1 className="text-2xl font-bold font-serif mb-1">
          {breakdown?.role_name}
        </h1>
        <p className="text-xs text-stc-muted mb-4">
          {breakdown?.show_name} · {totalCount} performer{totalCount !== 1 ? 's' : ''} in view
        </p>

        {totalCount === 0 ? (
          <div className="bg-white border border-stc-border rounded-lg p-8 text-center">
            <p className="text-sm font-bold mb-2">No one booked or in callbacks yet</p>
            <p className="text-xs text-stc-muted leading-relaxed mb-4">
              Use the submissions list or your shortlist to send callbacks and book performers. They'll appear here once you do.
            </p>
            <button onClick={() => router.push(`/breakdowns/${breakdownId}`)}
              className="text-xs text-stc-link underline">Review submissions →</button>
          </div>
        ) : (
          <>
            {/* BOOKED */}
            {booked.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-stc-success" />
                  <p className="text-xs font-bold uppercase tracking-wider text-stc-success">
                    Cast — {booked.length} confirmed
                  </p>
                </div>
                {booked.map(sub => <PerformerCard key={sub.id} sub={sub} section="booked" />)}
              </div>
            )}

            {/* CONSIDERING */}
            {considering.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-stc-warning" />
                  <p className="text-xs font-bold uppercase tracking-wider text-stc-warning">
                    Considering — {considering.length} in callbacks
                  </p>
                </div>
                <p className="text-[11px] text-stc-muted mb-2 leading-relaxed">
                  These performers are in callbacks. Tap Watch to see their tapes again side by side. Book to confirm, or Hold to move back.
                </p>
                {considering.map(sub => <PerformerCard key={sub.id} sub={sub} section="considering" />)}
              </div>
            )}

            {/* Visual divider between sections if both present */}
            {booked.length > 0 && considering.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-xs text-stc-success font-bold">
                  {booked.length === 1 ? 'This role is cast.' : `All ${booked.length} performers are booked.`}
                </p>
              </div>
            )}

            <button onClick={() => router.push(`/breakdowns/${breakdownId}`)}
              className="w-full py-3 mt-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
              ← Back to all submissions
            </button>
          </>
        )}
      </main>
    </div>
  );
}
