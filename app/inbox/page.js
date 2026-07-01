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
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single();
    setProfile(prof);

    if (prof.role === 'performer') {
      const { data: reqs } = await supabase
        .from('agent_clients')
        .select('*, agent:agent_id(*)')
        .eq('performer_id', session.user.id)
        .eq('status', 'pending');
      setRepRequests(reqs || []);

      const { data: cbs } = await supabase
        .from('callbacks')
        .select('*, breakdown:breakdown_id(show_name, role_name), casting:casting_user_id(name)')
        .eq('performer_id', session.user.id)
        .order('created_at', { ascending: false });
      setCallbacks(cbs || []);

      // Active submissions — so the performer can see where their work is out,
      // and withdraw any of them (including ones an agent submitted for them).
      const { data: subs } = await supabase
        .from('submissions')
        .select('*, breakdown:breakdown_id(show_name, role_name, status), submitter:submitted_by(name)')
        .eq('performer_id', session.user.id)
        .in('status', ['submitted', 'callback'])
        .order('created_at', { ascending: false });
      setSubmissions(subs || []);
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

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    setWithdrawing(true);
    const { data: { session } } = await supabase.auth.getSession();

    await supabase.from('submissions')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', withdrawTarget.id);

    await supabase.from('submission_changes').insert({
      submission_id: withdrawTarget.id,
      changed_by: session.user.id,
      change_type: 'withdrawn',
      change_summary: 'Performer withdrew this submission.',
      seen_by_performer: true,
    });

    setWithdrawing(false);
    setWithdrawTarget(null);
    loadData();
  };

  // Buckets — a declined callback is neither "needs action" nor "confirmed"
  const needsResponse = callbacks.filter(cb => !cb.performer_confirmed && cb.status !== 'declined');
  const confirmed = callbacks.filter(cb => cb.performer_confirmed && cb.status !== 'declined');
  const declined = callbacks.filter(cb => cb.status === 'declined');
  const badgeCount = repRequests.length + needsResponse.length;

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

  const CallbackRow = ({ cb, needsAction, muted }) => (
    <div onClick={() => router.push(`/callbacks/${cb.id}`)}
      className={`rounded-lg p-3 mb-2 border cursor-pointer active:opacity-80
        ${needsAction
          ? cb.type === 'final' ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200'
          : 'bg-white border-stc-border'} ${muted ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider">
              {cb.type === 'final' ? 'Final Callback' : 'Callback'}
            </p>
            {needsAction && (
              <span className="text-[9px] bg-stc-accent text-white font-bold px-1.5 py-0.5 rounded-full">
                Action needed
              </span>
            )}
            {cb.status === 'declined' && (
              <span className="text-[9px] bg-gray-200 text-stc-muted font-bold px-1.5 py-0.5 rounded-full">
                Declined
              </span>
            )}
          </div>
          <p className="text-sm font-bold">{cb.breakdown?.role_name} - {cb.breakdown?.show_name}</p>
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

  const nothingAtAll = repRequests.length === 0 && callbacks.length === 0 && submissions.length === 0;

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-1">Inbox</h1>
        <p className="text-xs text-stc-muted mb-4">Your callbacks, submissions, and representation requests.</p>

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

        {/* Callbacks needing response */}
        {needsResponse.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2 mt-2">
              Needs your response - {needsResponse.length}
            </p>
            {needsResponse.map(cb => <CallbackRow key={cb.id} cb={cb} needsAction={true} />)}
          </>
        )}

        {/* Active submissions — with withdraw */}
        {submissions.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2 mt-3">Your submissions</p>
            {submissions.map(sub => {
              const agentSubmitted = sub.submitted_by && sub.submitted_by !== sub.performer_id;
              return (
                <div key={sub.id} className="bg-white border border-stc-border rounded-lg p-3 mb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{sub.breakdown?.role_name} - {sub.breakdown?.show_name}</p>
                      <p className="text-[11px] text-stc-muted">
                        {sub.status === 'callback' ? 'Callback received' : 'Submitted'}
                        {agentSubmitted && sub.submitter?.name ? ` · by ${sub.submitter.name}` : ''}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                      sub.status === 'callback' ? 'bg-amber-100 text-stc-warning' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {sub.status === 'callback' ? 'CALLBACK' : 'SUBMITTED'}
                    </span>
                  </div>
                  <button onClick={() => setWithdrawTarget(sub)}
                    className="text-[11px] text-stc-muted underline mt-2">
                    Withdraw this submission
                  </button>
                </div>
              );
            })}
          </>
        )}

        {/* Confirmed callbacks */}
        {confirmed.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2 mt-3">Confirmed</p>
            {confirmed.map(cb => <CallbackRow key={cb.id} cb={cb} needsAction={false} />)}
          </>
        )}

        {/* Declined callbacks */}
        {declined.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2 mt-3">Declined</p>
            {declined.map(cb => <CallbackRow key={cb.id} cb={cb} needsAction={false} muted={true} />)}
          </>
        )}

        {nothingAtAll && (
          <div className="bg-white border border-stc-border rounded-lg p-8 text-center">
            <div className="text-3xl mb-3">✉</div>
            <p className="text-sm font-bold mb-2">Nothing here yet</p>
            <p className="text-xs text-stc-muted leading-relaxed">
              When casting sends you a callback or a rep requests to represent you, it appears here.
            </p>
          </div>
        )}
      </main>

      {/* Withdraw confirmation */}
      {withdrawTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => !withdrawing && setWithdrawTarget(null)}>
          <div className="bg-white w-full rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-bold font-serif mb-1">Withdraw submission?</h2>
            <p className="text-xs text-stc-muted mb-4 leading-relaxed">
              This removes your submission for <strong>{withdrawTarget.breakdown?.role_name}</strong> ({withdrawTarget.breakdown?.show_name}). Casting will no longer see it. You can always submit again later while the role is open.
            </p>
            <button onClick={confirmWithdraw} disabled={withdrawing}
              className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50 mb-2">
              {withdrawing ? 'Withdrawing...' : 'Yes, withdraw it'}
            </button>
            <button onClick={() => setWithdrawTarget(null)} disabled={withdrawing}
              className="w-full py-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
              Keep it
            </button>
          </div>
        </div>
      )}

      <BottomNav tabs={tabs} active="inbox" onSelect={(id) => {
        if (id === 'portfolio') router.push('/portfolio');
        if (id === 'record') router.push('/record');
        if (id === 'browse') router.push('/browse');
        if (id === 'help') router.push('/help');
      }} />
    </div>
  );
}
