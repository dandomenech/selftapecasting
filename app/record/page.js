'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

export default function RecordPage() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
    });

    supabase.from('roles').select('*').order('show_name').then(({ data }) => {
      setRoles(data || []);
      setLoading(false);
    });
  }, [router]);

  const tabs = [
    { id: 'portfolio', label: 'Portfolio', icon: '👤' },
    { id: 'record', label: 'Record', icon: '⏺' },
    { id: 'inbox', label: 'Inbox', icon: '✉', badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-1">Record</h1>
        <p className="text-xs text-stc-muted mb-4">Choose a role to record material for.</p>

        {loading ? (
          <p className="text-sm text-stc-muted">Loading roles...</p>
        ) : (
          <>
            {roles.map(role => (
              <div key={role.id}
                className="bg-white border border-stc-border rounded-lg p-4 mb-2.5 active:bg-gray-50"
                onClick={() => router.push(`/record/${role.id}`)}>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h2 className="text-base font-bold">{role.role_name}</h2>
                    <p className="text-xs text-stc-muted">{role.show_name}</p>
                    <p className="text-[10px] text-stc-muted mt-1">2 songs · 1 scene</p>
                  </div>
                  <span className="text-gray-300 text-xl">›</span>
                </div>
              </div>
            ))}

            <div className="text-center mt-6">
              <p className="text-xs text-stc-muted mb-1">Don't see your role?</p>
              <button className="text-xs text-stc-link underline">Request it →</button>
            </div>
          </>
        )}
      </main>

      <BottomNav
        tabs={tabs}
        active="record"
        onSelect={(id) => {
          if (id === 'portfolio') router.push('/portfolio');
          if (id === 'inbox') router.push('/inbox');
        }}
      />
    </div>
  );
}
