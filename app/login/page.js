'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/portfolio');
  };

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav showLogout={false} />
      <main className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold font-serif mb-6">Log In</h1>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder="Your password" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-stc-accent">{error}</p>
            </div>
          )}

          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 bg-stc-dark text-white font-semibold rounded-md text-sm disabled:opacity-50">
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <p className="text-center text-xs text-stc-muted mt-3">
            Don't have an account?{' '}
            <button onClick={() => router.push('/signup?role=performer')} className="text-stc-link underline">
              Join free
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
