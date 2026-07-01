'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Wrap sensitive casting/agent pages. Shows a pending/rejected state
// for unverified professional accounts, otherwise renders children.
export default function VerificationGate({ children }) {
  const [status, setStatus] = useState('loading');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    check();
  }, []);

  const check = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStatus('ok'); return; } // let page handle auth redirect

    const { data: prof } = await supabase
      .from('profiles')
      .select('role, verified, verification_status, company, title')
      .eq('id', session.user.id)
      .single();

    setProfile(prof);

    // Performers always pass
    if (!prof || prof.role === 'performer') { setStatus('ok'); return; }

    // Casting/agent must be verified
    if (prof.verified) { setStatus('ok'); return; }

    if (prof.verification_status === 'rejected') { setStatus('rejected'); return; }
    setStatus('pending');
  };

  if (status === 'loading') {
    return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-stc-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stc-border rounded-lg p-6 text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h2 className="text-lg font-bold font-serif mb-2">Verification pending</h2>
          <p className="text-sm text-stc-muted leading-relaxed mb-4">
            Your account is being reviewed. Casting and agent accounts are manually verified before accessing performer submissions — this protects performers' privacy and keeps the platform trustworthy.
          </p>
          {profile?.company && (
            <div className="bg-stc-bg rounded-md p-3 mb-4 text-left">
              <p className="text-[11px] text-stc-muted">Submitted as:</p>
              <p className="text-sm font-bold">{profile.title} · {profile.company}</p>
            </div>
          )}
          <p className="text-xs text-stc-muted">
            You'll get access as soon as you're approved. Thanks for your patience.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-stc-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stc-border rounded-lg p-6 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold font-serif mb-2">Account not verified</h2>
          <p className="text-sm text-stc-muted leading-relaxed mb-4">
            We weren't able to verify this account for casting/agent access. If you believe this is an error, please reach out through the help page with more details about your role.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
