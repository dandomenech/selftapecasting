'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

const STATUS_CONFIG = {
  open:    { label: 'Open',    color: '#2e7d32', bg: '#e8f5e9' },
  cast:    { label: 'Cast',    color: '#1a1a2e', bg: '#e8e0d8' },
  expired: { label: 'Expired', color: '#888888', bg: '#f0f0ec' },
};

function effectiveStatus(b) {
  if (!b) return 'open';
  if (b.status === 'open' && b.closes_at && new Date(b.closes_at) < new Date()) return 'expired';
  return b.status;
}

export default function BreakdownDetailPage() {
  const router = useRouter();
  const params = useParams();
  const breakdownId = params.breakdownId;

  const [breakdown, setBreakdown] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => { loadData(); }, [breakdownId]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: b } = await supabase.from('breakdowns').select('*').eq('id', breakdownId).single();
    if (!b || b.posted_by !== session.user.id) { router.push('/breakdowns'); return; }
    setBreakdown(b);

    const { data: subs } = await supabase
      .from('submissions')
      .select('*, performer:performer_id(name, vocal_range, location)')
      .eq('breakdown_id', breakdownId)
      .order('created_at', { ascending: false });
    setSubmissions(subs || []);

    setLoading(false);
  };

  const markAsCast = async () => {
    const confirmed = window.confirm(
      `Mark "${breakdown.role_name}" as cast?\n\nThis means the role is filled. The breakdown moves to your Archive. This is permanent — the role won't be reopened.`
    );
    if (!confirmed) return;
    setUpdating(true);
    await supabase.from('breakdowns').update({ status: 'cast' }).eq('id', breakdownId);
    setUpdated(true);
    setUpdating(false);
    loadData();
  };

  const updateSubmissionStatus = async (subId, newStatus) => {
    await supabase.from('submissions').update({ status: newStatus }).eq('id', subId);
    // Note: if status becomes 'booked', the Postgres trigger auto-casts the breakdown
    loadData();
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  const status = effectiveStatus(breakdown);
  const cfg = STATUS_CONFIG[status];
  const isOpen = status === 'open';

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.push('/breakdowns')} className="text-sm text-stc-link underline mb-3">← My Posts</button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-2xl font-bold font-serif">{breakdown.role_name}</h1>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
            {cfg.label.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-stc-muted mb-1">{breakdown.show_name}</p>
        <p className="text-[11px] text-stc-muted mb-4">
          {[breakdown.pay_rate, breakdown.union_status, breakdown.location].filter(Boolean).join(' · ')}
        </p>

        {/* Locked notice */}
        <div className="bg-stc-bg border border-stc-border rounded-lg p-3 mb-4">
          <p className="text-xs text-stc-muted leading-relaxed">
            This breakdown is a public record. Details are locked as published.
            {isOpen && ' The role moves to your Archive automatically when a performer is booked, or you can mark it as cast below.'}
          </p>
        </div>

        {/* Breakdown details — read-only */}
        <div className="bg-white border border-stc-border rounded-lg p-4 mb-4">
          {breakdown.description && (
            <p className="text-sm mb-3 pb-3 border-b border-gray-100">{breakdown.description}</p>
          )}
          {breakdown.required_skills?.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Skills required</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {breakdown.required_skills.map(s => (
                  <span key={s} className="text-xs bg-stc-bg border border-stc-border rounded-full px-3 py-1">{s}</span>
                ))}
              </div>
            </>
          )}
          {breakdown.closes_at && (
            <p className="text-[11px] text-stc-muted pt-3 border-t border-gray-100">
              Closes: {new Date(breakdown.closes_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Submissions list */}
        <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">
          Submissions ({submissions.length})
        </p>

        {submissions.length === 0 ? (
          <div className="bg-white border border-stc-border rounded-lg p-4 text-center mb-4">
            <p className="text-sm text-stc-muted">No submissions yet.</p>
          </div>
        ) : (
          submissions.map(sub => (
            <div key={sub.id} className="bg-white border border-stc-border rounded-lg p-3 mb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1 cursor-pointer" onClick={() => router.push(`/profile/${sub.performer_id}`)}>
                  <p className="text-sm font-bold">{sub.performer?.name}</p>
                  <p className="text-[10px] text-stc-muted">
                    {[sub.performer?.vocal_range, sub.performer?.location].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-[10px] text-stc-link underline mt-0.5">View portfolio →</p>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    sub.status === 'booked' ? 'bg-green-100 text-stc-success' :
                    sub.status === 'callback' ? 'bg-amber-100 text-stc-warning' :
                    sub.status === 'passed' ? 'bg-gray-100 text-stc-muted' :
                    'bg-blue-50 text-stc-link'
                  }`}>
                    {sub.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Status update — only on open breakdowns */}
              {isOpen && sub.status !== 'booked' && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                  {sub.status !== 'callback' && (
                    <button onClick={() => updateSubmissionStatus(sub.id, 'callback')}
                      className="text-[11px] px-2.5 py-1 bg-amber-50 border border-amber-200 text-stc-warning rounded font-semibold">
                      Callback
                    </button>
                  )}
                  <button onClick={() => updateSubmissionStatus(sub.id, 'booked')}
                    className="text-[11px] px-2.5 py-1 bg-green-50 border border-green-200 text-stc-success rounded font-semibold">
                    Book (auto-casts role)
                  </button>
                  {sub.status !== 'passed' && (
                    <button onClick={() => updateSubmissionStatus(sub.id, 'passed')}
                      className="text-[11px] px-2.5 py-1 bg-gray-50 border border-gray-200 text-stc-muted rounded font-semibold">
                      Pass
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Mark as cast — only if open */}
        {isOpen && (
          <button onClick={markAsCast} disabled={updating}
            className="w-full py-3 mt-2 bg-stc-dark text-white font-semibold rounded-md text-sm disabled:opacity-50">
            {updating ? 'Updating...' : 'Mark as Cast (role filled)'}
          </button>
        )}

        {!isOpen && (
          <div className="bg-stc-bg border border-stc-border rounded-lg p-3 mt-2 text-center">
            <p className="text-xs text-stc-muted">
              {status === 'cast' ? 'This role has been cast.' : 'This posting has expired.'}
              {' '}It is in your Archive.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
