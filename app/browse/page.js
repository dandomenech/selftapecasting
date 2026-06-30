'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

export default function BrowsePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [performers, setPerformers] = useState([]);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    setUserRole(myProfile?.role || null);

    // Load all performers with their video counts
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'performer')
      .order('name');

    // Load unique shows from roles table
    const { data: roles } = await supabase
      .from('roles')
      .select('show_name')
      .order('show_name');

    const uniqueShows = [...new Set((roles || []).map(r => r.show_name))];
    setShows(uniqueShows);

    // For each performer, get their video count
    if (profiles) {
      const enriched = await Promise.all(profiles.map(async (p) => {
        const { count } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', p.id)
          .eq('status', 'live');
        return { ...p, videoCount: count || 0 };
      }));
      setPerformers(enriched.filter(p => p.videoCount > 0));
    }

    setLoading(false);
  };

  const q = query.toLowerCase().trim();
  const filtered = q
    ? performers.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.vocal_range?.toLowerCase().includes(q)
      )
    : performers;

  const tabs = userRole === 'casting'
    ? [
        { id: 'browse', label: 'Browse', icon: '🔍' },
        { id: 'post', label: 'Post Role', icon: '+' },
        { id: 'breakdowns', label: 'My Posts', icon: '📋' },
      ]
    : userRole === 'agent'
    ? [
        { id: 'browse', label: 'Browse', icon: '🔍' },
        { id: 'clients', label: 'My Clients', icon: '👥' },
        { id: 'help', label: 'Help', icon: '✉' },
      ]
    : [
        { id: 'browse', label: 'Browse', icon: '🔍' },
        { id: 'help', label: 'Help', icon: '✉' },
      ];

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-3">Browse</h1>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search performers by name, location, range..."
          className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white mb-4"
        />

        {!q && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Browse by show</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {shows.map(show => (
                <button key={show}
                  className="px-3 py-2 bg-white border border-stc-border rounded text-xs font-semibold">
                  {show}
                </button>
              ))}
            </div>
          </>
        )}

        {loading ? (
          <p className="text-sm text-stc-muted">Loading performers...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-stc-border rounded-lg p-6 text-center">
            <p className="text-sm text-stc-muted">
              {q ? `No performers matching "${query}"` : 'No performers with videos yet. Be the first!'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-stc-muted mb-2">{filtered.length} performer{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.map(p => (
              <div key={p.id}
                className="bg-white border border-stc-border rounded-lg p-3 mb-2 active:bg-gray-50"
                onClick={() => router.push(`/profile/${p.id}`)}>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-14 bg-gray-200 border border-stc-border rounded flex items-center
                                justify-center text-stc-muted text-xs font-bold flex-shrink-0">
                    {p.name?.split(' ').map(n => n[0]).join('') || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate">{p.name}</p>
                      {p.founding_member && (
                        <span className="bg-stc-gold text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">FM</span>
                      )}
                    </div>
                    <p className="text-[10px] text-stc-muted">
                      {[p.location, p.vocal_range, p.union_status].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-[10px] text-stc-muted mt-0.5">{p.videoCount} video{p.videoCount !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              </div>
            ))}
          </>
        )}
      </main>

      <BottomNav
        tabs={tabs}
        active="browse"
        onSelect={(id) => {
          if (id === 'help') router.push('/help');
          if (id === 'post') router.push('/post-breakdown');
          if (id === 'breakdowns') router.push('/breakdowns');
          if (id === 'clients') router.push('/clients');
        }}
      />
    </div>
  );
}
