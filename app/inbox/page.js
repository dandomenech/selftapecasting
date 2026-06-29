'use client';

import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

export default function InboxPage() {
  const router = useRouter();

  const tabs = [
    { id: 'portfolio', label: 'Portfolio', icon: '👤' },
    { id: 'record', label: 'Record', icon: '⏺' },
    { id: 'inbox', label: 'Inbox', icon: '✉', badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-1">Inbox</h1>
        <p className="text-xs text-stc-muted mb-6">Callbacks, notes, and bookings.</p>

        <div className="bg-white border border-stc-border rounded-lg p-8 text-center">
          <div className="text-3xl mb-3">✉</div>
          <p className="text-sm font-bold mb-2">No notifications yet</p>
          <p className="text-xs text-stc-muted leading-relaxed">
            When casting directors review your tapes and send callbacks,
            you'll see them here. Keep recording — your portfolio is your audition.
          </p>
        </div>
      </main>

      <BottomNav
        tabs={tabs}
        active="inbox"
        onSelect={(id) => {
          if (id === 'portfolio') router.push('/portfolio');
          if (id === 'record') router.push('/record');
        }}
      />
    </div>
  );
}
