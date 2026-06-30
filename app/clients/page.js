'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

const TABS = [
  { id: 'browse', label: 'Browse', icon: '🔍' },
  { id: 'clients', label: 'My Clients', icon: '👥' },
  { id: 'help', label: 'Help', icon: '✉' },
];

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]); // active
  const [pending, setPending] = useState([]); // pending requests sent
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: links } = await supabase
      .from('agent_clients')
      .select('*, performer:performer_id(*)')
      .eq('agent_id', session.user.id)
      .order('requested_at', { ascending: false });

    setClients((links || []).filter(l => l.status === 'active'));
    setPending((links || []).filter(l => l.status === 'pending'));
    setLoading(false);
  };

  const handleSearch = async () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) { setSearchResults([]); return; }
    setSearching(true);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'performer')
      .ilike('name', `%${q}%`)
      .limit(10);

    setSearchResults(data || []);
    setSearching(false);
  };

  const requestRepresentation = async (performerId) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('agent_clients').insert({
      agent_id: session.user.id,
      performer_id: performerId,
      status: 'pending',
    });
    if (error) {
      if (error.code === '23505') alert('You\u2019ve already requested this performer, or they\u2019re already a client.');
      else alert('Could not send request.');
      return;
    }
    setSearchResults([]);
    setSearchQuery('');
    loadData();
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-1">My Clients</h1>
        <p className="text-xs text-stc-muted mb-4">
          Performers must approve before you can act on their behalf.
        </p>

        {/* Find & request */}
        <div className="bg-white border border-stc-border rounded-lg p-3 mb-4">
          <p className="text-xs font-bold uppercase text-stc-muted mb-2">Find a performer</p>
          <div className="flex gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              className="flex-1 px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder="Search by name" />
            <button onClick={handleSearch}
              className="px-4 py-2.5 bg-stc-dark text-white rounded-md text-sm font-semibold">
              Find
            </button>
          </div>

          {searching && <p className="text-xs text-stc-muted mt-2">Searching...</p>}

          {searchResults.length > 0 && (
            <div className="mt-2">
              {searchResults.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-[10px] text-stc-muted">{[p.location, p.vocal_range].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button onClick={() => requestRepresentation(p.id)}
                    className="text-xs font-semibold px-3 py-1.5 bg-stc-accent text-white rounded-md">
                    Request
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending requests */}
        {pending.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Pending approval</p>
            {pending.map(link => (
              <div key={link.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                <p className="text-sm font-bold">{link.performer?.name}</p>
                <p className="text-[11px] text-stc-muted">Waiting for them to approve representation.</p>
              </div>
            ))}
          </>
        )}

        {/* Active clients */}
        <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2 mt-2">Active clients</p>
        {clients.length === 0 ? (
          <div className="bg-white border border-stc-border rounded-lg p-6 text-center">
            <p className="text-sm text-stc-muted">No active clients yet. Search above to request representation.</p>
          </div>
        ) : (
          clients.map(link => (
            <div key={link.id}
              className="bg-white border border-stc-border rounded-lg p-3 mb-2 cursor-pointer"
              onClick={() => router.push(`/profile/${link.performer_id}`)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{link.performer?.name}</p>
                  <p className="text-[10px] text-stc-muted">
                    {[link.performer?.location, link.performer?.vocal_range].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </div>
            </div>
          ))
        )}
      </main>

      <BottomNav tabs={TABS} active="clients" onSelect={(id) => {
        if (id === 'browse') router.push('/browse');
        if (id === 'help') router.push('/help');
      }} />
    </div>
  );
}
