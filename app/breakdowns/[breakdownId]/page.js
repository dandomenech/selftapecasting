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

export default function BreakdownDetailPage() {
  const router = useRouter();
  const params = useParams();
  const breakdownId = params.breakdownId;

  const [breakdown, setBreakdown] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, [breakdownId]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: b } = await supabase.from('breakdowns').select('*').eq('id', breakdownId).single();

    if (!b || b.posted_by !== session.user.id) {
      router.push('/breakdowns');
      return;
    }
    setBreakdown(b);

    const { count } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('breakdown_id', breakdownId);
    setSubmissions(count || 0);

    setLoading(false);
  };

  const effectiveStatus = () => {
    if (!breakdown) return 'open';
    if (breakdown.status === 'open' && breakdown.closes_at && new Date(breakdown.closes_at) < new Date()) {
      return 'expired';
    }
    return breakdown.status;
  };

  const markAsCast = async () => {
    const confirmed = window.confirm(
      `Mark "${breakdown.role_name}" as cast? This closes the role to new submissions and can't be reopened. Use this once you've made your casting decision.`
    );
    if (!confirmed) return;

    setUpdating(true);
    await supabase.from('breakdowns').update({ status: 'cast' }).eq('id', breakdownId);
    setUpdating(false);
    loadData();
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${breakdown.role_name}" entirely? This removes the posting and all submissions to it. Use this only if it was posted in error \u2014 not to take down a live breakdown. This can't be undone.`
    );
    if (!confirmed) return;
    await supabase.from('breakdowns').delete().eq('id', breakdownId);
    router.push('/breakdowns');
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  const status = effectiveStatus();
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.push('/breakdowns')} className="text-sm text-stc-link underline mb-3">← Back to My Posts</button>

        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold font-serif">{breakdown.role_name}</h1>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
            {cfg.label.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-stc-muted mb-1">{breakdown.show_name}</p>
        <p className="text-[11px] text-stc-muted mb-4">
          {[breakdown.pay_rate, breakdown.union_status, breakdown.location].filter(Boolean).join(' · ')}
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-xs leading-relaxed text-stc-dark">
            Published breakdowns are locked. Editing details after performers have submitted would move the goalposts on people who already invested time. You can mark this role as cast once filled, or delete it entirely if it was posted in error.
          </p>
        </div>

        {/* Read-only display of what was published */}
        <div className="bg-white border border-stc-border rounded-lg p-4 mb-4">
          {breakdown.description && (
            <p className="text-sm mb-3">{breakdown.description}</p>
          )}
          {breakdown.required_skills?.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Skills required</p>
              <div className="flex flex-wrap gap-1.5">
                {breakdown.required_skills.map(s => (
                  <span key={s} className="text-xs bg-stc-bg border border-stc-border rounded-full px-3 py-1">{s}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-stc-border rounded-lg p-4 mb-4 text-center">
          <p className="text-2xl font-bold text-stc-accent">{submissions}</p>
          <p className="text-xs text-stc-muted">submission{submissions === 1 ? '' : 's'} received</p>
        </div>

        {status === 'open' && (
          <button onClick={markAsCast} disabled={updating}
            className="w-full py-3 bg-stc-dark text-white font-semibold rounded-md text-sm disabled:opacity-50 mb-2">
            {updating ? 'Updating...' : 'Mark as Cast (role filled)'}
          </button>
        )}

        {status !== 'open' && (
          <div className="bg-stc-bg border border-stc-border rounded-lg p-3 mb-2 text-center">
            <p className="text-xs text-stc-muted">
              {status === 'cast' ? 'This role has been cast. No longer accepting submissions.' : 'This posting has expired.'}
            </p>
          </div>
        )}

        <button onClick={handleDelete}
          className="w-full py-2.5 text-xs text-stc-accent underline">
          Delete this posting (only if posted in error)
        </button>
      </main>
    </div>
  );
}
