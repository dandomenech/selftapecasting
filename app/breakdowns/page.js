'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

export default function BreakdownsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [breakdowns, setBreakdowns] = useState([]);
  const [submissionCounts, setSubmissionCounts] = useState({});
  const [mySubmissions, setMySubmissions] = useState({}); // breakdown_id -> submission, for performers
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setProfile(prof);

    if (prof.role === 'casting') {
      // Casting: show their own posted breakdowns with submission counts
      const { data: posts } = await supabase
        .from('breakdowns')
        .select('*')
        .eq('posted_by', session.user.id)
        .order('created_at', { ascending: false });
      setBreakdowns(posts || []);

      const counts = {};
      for (const b of posts || []) {
        const { count } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('breakdown_id', b.id);
        counts[b.id] = count || 0;
      }
      setSubmissionCounts(counts);
    } else {
      // Performer/agent: show all open breakdowns
      const { data: open } = await supabase
        .from('breakdowns')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      setBreakdowns(open || []);

      if (prof.role === 'performer') {
        const { data: subs } = await supabase
          .from('submissions')
          .select('*')
          .eq('performer_id', session.user.id);
        const map = {};
        (subs || []).forEach(s => { map[s.breakdown_id] = s; });
        setMySubmissions(map);
      }
    }

    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  const isCasting = profile?.role === 'casting';
  const tabs = isCasting
    ? [
        { id: 'browse', label: 'Browse', icon: '🔍' },
        { id: 'post', label: 'Post Role', icon: '+' },
        { id: 'breakdowns', label: 'My Posts', icon: '📋' },
      ]
    : [
        { id: 'portfolio', label: 'Portfolio', icon: '👤' },
        { id: 'breakdowns', label: 'Open Roles', icon: '📋' },
        { id: 'inbox', label: 'Inbox', icon: '✉' },
      ];

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-1">{isCasting ? 'My Posts' : 'Open Roles'}</h1>
        <p className="text-xs text-stc-muted mb-4">
          {isCasting ? 'Breakdowns you\u2019ve posted.' : 'Submit your tapes directly to a role.'}
        </p>

        {breakdowns.length === 0 ? (
          <div className="bg-white border border-stc-border rounded-lg p-6 text-center">
            <p className="text-sm text-stc-muted">
              {isCasting ? 'No breakdowns posted yet.' : 'No open roles right now. Check back soon.'}
            </p>
            {isCasting && (
              <button onClick={() => router.push('/post-breakdown')}
                className="mt-3 py-2.5 px-5 bg-stc-accent text-white rounded-md text-sm font-semibold">
                Post Your First Role
              </button>
            )}
          </div>
        ) : (
          breakdowns.map(b => {
            const mySub = mySubmissions[b.id];
            return (
              <div key={b.id}
                className="bg-white border border-stc-border rounded-lg p-4 mb-3 cursor-pointer"
                onClick={() => router.push(isCasting ? `/breakdowns/${b.id}` : `/apply/${b.id}`)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold">{b.role_name}</p>
                    <p className="text-xs text-stc-muted">{b.show_name}</p>
                    <p className="text-[11px] text-stc-muted mt-1">
                      {[b.pay_rate, b.union_status, b.location].filter(Boolean).join(' · ')}
                    </p>
                    {b.required_skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {b.required_skills.map(s => (
                          <span key={s} className="text-[10px] bg-stc-bg border border-stc-border rounded-full px-2 py-0.5">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-gray-300 text-xl flex-shrink-0">›</span>
                </div>

                {isCasting && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-stc-accent">{submissionCounts[b.id] || 0} submission{submissionCounts[b.id] === 1 ? '' : 's'}</span>
                    <span className="text-[10px] text-stc-muted">{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                )}

                {!isCasting && mySub && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <span className={`text-[11px] font-bold ${
                      mySub.status === 'booked' ? 'text-stc-success' :
                      mySub.status === 'callback' ? 'text-stc-warning' :
                      mySub.status === 'passed' ? 'text-stc-muted' : 'text-stc-link'
                    }`}>
                      {mySub.status === 'submitted' ? '✓ Submitted' :
                       mySub.status === 'callback' ? '↩ Callback' :
                       mySub.status === 'booked' ? '★ Booked' : 'Not selected'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      <BottomNav tabs={tabs} active="breakdowns" onSelect={(id) => {
        if (id === 'browse') router.push('/browse');
        if (id === 'post') router.push('/post-breakdown');
        if (id === 'portfolio') router.push('/portfolio');
        if (id === 'inbox') router.push('/inbox');
      }} />
    </div>
  );
}
