'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') || 'performer';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isProfessional = defaultRole === 'casting' || defaultRole === 'agent';

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (isProfessional && (!company.trim() || !title.trim())) {
      setError('Company/organization and your title are required for casting and agent accounts.');
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: defaultRole },
        emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Save professional details for verification review
    if (isProfessional && data.user) {
      await supabase.from('profiles').update({
        company: company.trim(),
        title: title.trim(),
        professional_email: email.trim(),
        verification_requested_at: new Date().toISOString(),
      }).eq('id', data.user.id);
    }

    setSuccess(true);
    setLoading(false);

    if (data.session) {
      if (defaultRole === 'casting') {
        router.push('/breakdowns');
      } else if (defaultRole === 'agent') {
        router.push('/clients');
      } else {
        router.push('/portfolio');
      }
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold font-serif mb-2">
        {defaultRole === 'performer' ? 'Join as Founding Member' : 'Create Account'}
      </h1>
      {defaultRole === 'performer' && (
        <p className="text-xs text-stc-muted mb-4">Free forever. No credit card.</p>
      )}

      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-bold text-stc-success mb-2">Check your email</p>
          <p className="text-sm">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder="Your full name" />
          </div>

          {isProfessional && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-stc-muted mb-1">
                  {defaultRole === 'agent' ? 'Agency / Management Company' : 'Company / Organization'} <span className="text-stc-accent">*</span>
                </label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
                  placeholder={defaultRole === 'agent' ? 'e.g. Buchwald' : 'e.g. Telsey + Company'} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Your Title <span className="text-stc-accent">*</span></label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
                  placeholder={defaultRole === 'agent' ? 'e.g. Talent Agent' : 'e.g. Casting Director'} />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">
              {isProfessional ? 'Professional Email' : 'Email'}
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder={isProfessional ? 'you@yourcompany.com' : 'email@example.com'} />
            {isProfessional && (
              <p className="text-[10px] text-stc-muted mt-1">Use your work email — it helps us verify you faster.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-16 border border-stc-border rounded-md text-base bg-white"
                placeholder="At least 6 characters" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stc-link font-semibold">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-stc-accent">{error}</p>
            </div>
          )}

          {isProfessional && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-[11px] leading-relaxed text-stc-dark">
                Casting and agent accounts are manually verified before you can view performer submissions or post roles. This protects performers' privacy. We'll review your details shortly after signup.
              </p>
            </div>
          )}

          <button onClick={handleSignup} disabled={loading}
            className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-xs text-stc-muted mt-3">
            Already have an account?{' '}
            <button onClick={() => router.push('/login')} className="text-stc-link underline">Log in</button>
          </p>
        </div>
      )}
    </main>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav showLogout={false} />
      <Suspense fallback={<div className="p-8 text-center text-stc-muted">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
