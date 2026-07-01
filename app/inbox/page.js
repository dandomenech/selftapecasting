'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

export default function InboxPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [repRequests, setRepRequests] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setProfile(prof);

    if (prof.role === 'performer') {
      // Pending representation requests
      const { data: reqs } = await supabase
        .from('agent_clients')
        .select('*, agent:agent_id(*)')
        .eq('performer_id', session.user.id)
        .eq('status', 'pending');
      setRepRequests(reqs || []);

      // Callbacks for this performer — sorted newest first
      const { data: cbs } = await supabase
        .from('callbacks')
        .select('*, breakdown:breakdown_id(show_name, role_name), casting:casting_user_id(name)')
        .eq('performer_id', session.user.id)
        .order('created_at', { ascending: false });
      setCallbacks(cbs || []);
    }

    setLoading(false);
  };

  const respondToRequest = async (linkId, accept) => {
    await supabase.from('agent_clients').update({
      status: accept ? 'active' : 'declined',
      responded_at: new Date().toISOString(),
    }).eq('id', linkId);
    loadData();
  };

  const confirmCallback = async (cb) => {
    setConfirming(cb.id);
    await supabase.from('callbacks').update({
      performer_confirmed: true,
      confirmed_at: new Date().toISOString(),
      status: 'confirmed',
    }).eq('id', cb.id);
    setConfirming(null);
    loadData();
  };

  const unconfirmedCallbacks = callbacks.filter(cb => !cb.performer_confirmed);
  const confirmedCallbacks = callbacks.filter(cb => cb.performer_confirmed);
  const badgeCount = repRequests.length + unconfirmedCallbacks.length;

  const isPerformer = profile?.role === 'performer';
  const tabs = isPerformer
    ? [
        { id: 'portfolio', label: 'Portfolio', icon: '👤' },
        { id: 'record', label: 'Record', icon: '⏺' },
        { id: 'inbox', label: 'Inbox', icon: '✉', badge: badgeCount },
      ]
    : [
        { id: 'browse', label: 'Browse', icon: '🔍' },
        { id: 'help', label: 'Help', icon: '✉' },
      ];

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  const CallbackCard = ({ cb, unconfirmed }) => (
    <div className={`rounded-lg p-3 mb-2 border ${
      cb.type === 'final'
        ? unconfirmed ? 'bg-amber-50 border-amber-300' : 'bg-white border-stc-border'
        : unconfirmed ? 'bg-blue-50 border-blue-200' : 'bg-white border-stc-border'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider">
            {cb.type === 'final' ? '⭐ Final Callback' : '↩ Callback'}
          </p>
          <p className="text-sm font-bold mt-0.5">{cb.breakdown?.role_name} — {cb.breakdown?.show_name}</p>
          <p className="text-[11px] text-stc-muted">from {cb.casting?.name}</p>
        </div>
        <p className="text-[10px] text-stc-muted flex-shrink-0 ml-2">
          {new Date(cb.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* The note — what casting responded to */}
      <div className="bg-white rounded-md p-2.5 mb-2 border border-gray-100">
        <p className="text-[10px] font-bold uppercase text-stc-muted mb-1">What they responded to</p>
        <p className="text-sm leading-relaxed italic">"{cb.note}"</p>
      </div>

      {/* Instructions if any */}
      {cb.instructions && (
        <div className="bg-white rounded-md p-2.5 mb-2 border border-gray-100">
          <p className="text-[10px] font-bold uppercase text-stc-muted mb-1">What they need from you</p>
          <p className="text-sm leading-relaxed">{cb.instructions}</p>
        </div>
      )}

      {/* Format */}
      <p className="text-[11px] text-stc-muted mb-2">
        Format: <strong>
          {cb.format === 'in_person' ? 'In person' :
           cb.format === 'new_video' ? 'New video submission' :
           'Your choice — in person or new video'}
        </strong>
      </p>

      {/* Confirm button */}
      {unconfirmed ? (
        <button onClick={() => confirmCallback(cb)} disabled={confirming === cb.id}
          className="w-full py-2.5 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50">
          {confirming === cb.id ? 'Confirming...' : 'Confirm Callback'}
        </button>
      ) : (
        <p className="text-[11px] text-stc-success font-bold">✓ Confirmed {cb.confirmed_at ? new Date(cb.confirmed_at).toLocaleDateString() : ''}</p>
      )}

      {/* New video link */}
      {unconfirmed && (cb.format === 'new_video' || cb.format === 'either') && (
        <button onClick={() => router.push('/record')}
          className="w-full py-2.5 mt-2 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
          Record New Footage →
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-1">Inbox</h1>
        <p className="text-xs text-stc-muted mb-4">Callbacks, notes, and representation requests.</p>

        {/* Representation requests */}
        {repRequests.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Representation requests</p>
            {repRequests.map(req => (
              <div key={req.id} className="bg-white border border-stc-border rounded-lg p-3 mb-2">
                <p className="text-sm font-bold">{req.agent?.name}</p>
                <p className="text-[11px] text-stc-muted mb-2">wants to represent you and submit on your behalf.</p>
                <div className="flex gap-2">
                  <button onClick={() => respondToRequest(req.id, true)}
                    className="flex-1 py-2 bg-stc-success text-white rounded-md text-xs font-semibold">Approve</button>
                  <button onClick={() => respondToRequest(req.id, false)}
                    className="flex-1 py-2 bg-white border border-stc-border text-stc-dark rounded-md text-xs font-semibold">Decline</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Unconfirmed callbacks — action needed */}
        {unconfirmedCallbacks.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2 mt-2">
              Action needed — {unconfirmedCallbacks.length} callback{unconfirmedCallbacks.length !== 1 ? 's' : ''}
            </p>
            {unconfirmedCallbacks.map(cb => <CallbackCard key={cb.id} cb={cb} unconfirmed={true} />)}
          </>
        )}

        {/* Confirmed callbacks — history */}
        {confirmedCallbacks.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2 mt-3">Previous callbacks</p>
            {confirmedCallbacks.map(cb => <CallbackCard key={cb.id} cb={cb} unconfirmed={false} />)}
          </>
        )}

        {repRequests.length === 0 && callbacks.length === 0 && (
          <div className="bg-white border border-stc-border rounded-lg p-8 text-center">
            <div className="text-3xl mb-3">✉</div>
            <p className="text-sm font-bold mb-2">No notifications yet</p>
            <p className="text-xs text-stc-muted leading-relaxed">
              When casting sends you a callback or a rep requests to represent you, it appears here.
            </p>
          </div>
        )}
      </main>

      <BottomNav tabs={tabs} active="inbox" onSelect={(id) => {
        if (id === 'portfolio') router.push('/portfolio');
        if (id === 'record') router.push('/record');
        if (id === 'browse') router.push('/browse');
        if (id === 'help') router.push('/help');
      }} />
    </div>
  );
}
