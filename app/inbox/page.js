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
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setProfile(prof);

    if (prof.role === 'performer') {
      const { data: reqs } = await supabase
        .from('agent_clients')
        .select('*, agent:agent_id(*)')
        .eq('performer_id', session.user.id)
        .eq('status', 'pending');
      setRepRequests(reqs || []);

      const { data: subs } = await supabase
        .from('submissions')
        .select('id, breakdown:breakdown_id(show_name, role_name)')
        .eq('performer_id', session.user.id);

      const subIds = (subs || []).map(s => s.id);
      if (subIds.length > 0) {
        const { data: changeLog } = await supabase
          .from('submission_changes')
          .select('*, changer:changed_by(name, role)')
          .in('submission_id', subIds)
          .neq('changed_by', session.user.id)
          .order('created_at', { ascending: false });

        const withBreakdown = (changeLog || []).map(c => {
          const sub = subs.find(s => s.id === c.submission_id);
          return { ...c, breakdown: sub?.breakdown };
        });
        setChanges(withBreakdown);
      }
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

  const markSeen = async (changeId) => {
    await supabase.from('submission_changes').update({ seen_by_performer: true }).eq('id', changeId);
    setChanges(prev => prev.filter(c => c.id !== changeId));
  };

  const isPerformer = profile?.role === 'performer';
  const badgeCount = repRequests.length + changes.filter(c => !c.seen_by_performer).length;

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

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-1">Inbox</h1>
        <p className="text-xs text-stc-muted mb-6">Callbacks, notes, bookings, and representation.</p>

        {repRequests.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Representation requests</p>
            {repRequests.map(req => (
              <div key={req.id} className="bg-white border border-stc-border rounded-lg p-3 mb-2">
                <p className="text-sm font-bold">{req.agent?.name}</p>
                <p className="text-[11px] text-stc-muted mb-2">wants to represent you and submit on your behalf.</p>
                <div className="flex gap-2">
                  <button onClick={() => respondToRequest(req.id, true)}
                    className="flex-1 py-2 bg-stc-success text-white rounded-md text-xs font-semibold">
                    Approve
                  </button>
                  <button onClick={() => respondToRequest(req.id, false)}
                    className="flex-1 py-2 bg-white border border-stc-border text-stc-dark rounded-md text-xs font-semibold">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {changes.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2 mt-2">Changes by your reps</p>
            {changes.map(c => (
              <div key={c.id} className={`rounded-lg p-3 mb-2 border ${c.seen_by_performer ? 'bg-white border-stc-border' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-bold">{c.changer?.name}</p>
                    <p className="text-[11px] text-stc-muted">
                      {c.change_summary || c.change_type} — {c.breakdown?.show_name} ({c.breakdown?.role_name})
                    </p>
                    <p className="text-[10px] text-stc-muted mt-1">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                  {!c.seen_by_performer && (
                    <button onClick={() => markSeen(c.id)} className="text-[10px] text-stc-link underline ml-2 flex-shrink-0">
                      Mark seen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {repRequests.length === 0 && changes.length === 0 && (
          <div className="bg-white border border-stc-border rounded-lg p-8 text-center">
            <div className="text-3xl mb-3">✉</div>
            <p className="text-sm font-bold mb-2">No notifications yet</p>
            <p className="text-xs text-stc-muted leading-relaxed">
              When casting directors review your tapes and send callbacks, or when a rep wants to represent you, you'll see it here.
            </p>
          </div>
        )}
      </main>

      <BottomNav
        tabs={tabs}
        active="inbox"
        onSelect={(id) => {
          if (id === 'portfolio') router.push('/portfolio');
          if (id === 'record') router.push('/record');
          if (id === 'browse') router.push('/browse');
          if (id === 'help') router.push('/help');
        }}
      />
    </div>
  );
}
