'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justConfirmed = searchParams.get('confirmed') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    // Route based on account type — not everyone lands on the performer portfolio
    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role === 'casting' || profile?.role === 'agent') {
      router.push('/browse');
    } else {
      router.push('/portfolio');
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold font-serif mb-2">Log In</h1>

      {justConfirmed && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
          <p className="text-sm font-bold text-stc-success">✓ Email confirmed</p>
          <p className="text-xs text-stc-muted mt-0.5">You're all set — log in below to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
            placeholder="email@example.com" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 pr-16 border border-stc-border rounded-md text-base bg-white"
              placeholder="Your password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stc-link font-semibold px-2 py-1">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
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
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav showLogout={false} />
      <Suspense fallback={<div className="p-8 text-center text-stc-muted">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
