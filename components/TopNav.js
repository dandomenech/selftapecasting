'use client';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function TopNav({ showLogout = true }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="bg-stc-dark text-white px-4 py-2.5 flex items-center justify-between border-b-2 border-stc-accent">
      <div className="text-[15px] font-bold tracking-wider font-serif">
        SELF TAPE<span className="text-stc-gold"> CASTING</span>
      </div>
      {showLogout && (
        <button onClick={handleLogout} className="text-gray-400 text-xs">
          Log Out
        </button>
      )}
    </header>
  );
}
