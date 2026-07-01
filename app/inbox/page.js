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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single();
    setProfile(prof);

    if (prof.role === 'performer') {
      // Pending representation requests
      const { data: reqs } = await supabase
        .from('agent_clients')
        .select('*, agent:agent_id(*)')
        .eq('performer_id', session.user.id)
        .eq('status', 'pending');
      setRepRequests(reqs || []);

      // All callbacks, newest first
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

  const unconfirmed = callbacks.filter(cb => !cb.performer_confirmed);
  const confirmed = callbacks.filter(cb => cb.performer_confirmed);
  const badgeCount = repRequests.length + unconfirmed.length;

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

  const CallbackRow = ({ cb, needsAction }) => (
    <div onClick={() => router.push(`/callbacks/${cb.id}`)}
      className={`rounded-lg p-3 mb-2 border cursor-pointer active:opacity-80
        ${needsAction
          ? cb.type === 'final'
            ? 'bg-amber-50 border-amber-300'
            : 'bg-blue-50 border-blue-200'
          : 'bg-white border-stc-border'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider">
              {cb.type === 'final' ? '⭐ Final Callback' : '↩ Callback'}
            </p>
            {needsAction && (
              <span className="text-[9px] bg-stc-accent text-white font-bold px-1.5 py-0.5 rounded-full">
                Action needed
              </span>
            )}
          </div>
          <p className="text-sm font-bold">{cb.breakdown?.role_name} — {cb.breakdown?.show_name}</p>
          <p className="text-[11px] text-stc-muted">from {cb.casting?.name}</p>
          <p className="text-[11px] text-stc-muted mt-1 truncate">"{cb.note}"</p>
        </div>
        <div className="flex-shrink-0 ml-3 text-right">
          <p className="text-[10px] text-stc-muted">{new Date(cb.created_at).toLocaleDateString()}</p>
          <p className="text-stc-muted text-lg mt-1">›</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-1">Inbox</h1>
        <p className="text-xs text-stc-muted mb-4">Tap any callback to see the full details and respond.</p>

        {/* Rep requests */}
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

        {/* Unconfirmed callbacks */}
        {unconfirmed.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2 mt-2">
              Needs your response — {unconfirmed.length}
            </p>
            {unconfirmed.map(cb => <CallbackRow key={cb.id} cb={cb} needsAction={true} />)}
          </>
        )}

        {/* Confirmed callbacks */}
        {confirmed.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2 mt-3">Confirmed</p>
            {confirmed.map(cb => <CallbackRow key={cb.id} cb={cb} needsAction={false} />)}
          </>
        )}

        {repRequests.length === 0 && callbacks.length === 0 && (
          <div className="bg-white border border-stc-border rounded-lg p-8 text-center">
            <div className="text-3xl mb-3">✉</div>
            <p className="text-sm font-bold mb-2">Nothing here yet</p>
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
