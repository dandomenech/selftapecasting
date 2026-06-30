'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // If already logged in, redirect based on account type
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role === 'casting') {
          router.push('/breakdowns');
        } else if (profile?.role === 'agent') {
          router.push('/clients');
        } else {
          router.push('/portfolio');
        }
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) return <div className="min-h-screen bg-stc-bg" />;

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav showLogout={false} />

      <main className="max-w-md mx-auto px-4 py-6 pb-20">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold font-serif mb-2">
            Your audition room. Open 24/7.
          </h1>
          <p className="text-sm text-stc-muted leading-relaxed">
            The musical theater audition platform. Standardized tapes.
            Equal playing field. Real feedback.
          </p>
        </div>

        {/* Performer — FREE */}
        <div className="bg-white border border-stc-border rounded-lg p-4 mb-3 border-l-4 border-l-stc-gold">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-base font-bold">Performer</h2>
            <span className="bg-stc-gold text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              Founding Member
            </span>
          </div>
          <div className="text-3xl font-bold text-stc-success mb-1">Free</div>
          <p className="text-xs text-stc-muted mb-3">No trial. No credit card. No catch.</p>
          <div className="text-sm leading-7 mb-4">
            <div>✓ &nbsp;Record & store your audition tapes</div>
            <div>✓ &nbsp;Bring your own track or sing live</div>
            <div>✓ &nbsp;Get seen by casting & producers</div>
            <div>✓ &nbsp;See who's watching your work</div>
            <div>✓ &nbsp;Callbacks & booking notifications</div>
          </div>
          <button
            onClick={() => router.push('/signup?role=performer')}
            className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm"
          >
            Join as Founding Member
          </button>
          <p className="text-[10px] text-stc-muted text-center mt-3 leading-relaxed">
            Founding Members get every feature free permanently.
          </p>
        </div>

        {/* Content ownership */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
          <p className="text-sm font-bold text-stc-success mb-1">You own your tapes. Period.</p>
          <p className="text-xs leading-relaxed">
            Every recording belongs to you. We display it — you control it. Delete anytime.
          </p>
        </div>

        {/* Casting */}
        <div className="bg-white border border-stc-border rounded-lg p-4 mb-3">
          <h2 className="text-base font-bold mb-1">Casting / Producers</h2>
          <p className="text-xs text-stc-muted mb-2">Find and book talent directly.</p>
          <div className="text-xl font-bold text-stc-accent mb-1">$9.99/mo <span className="text-xs text-stc-muted font-normal">or $79.99/yr</span></div>
          <p className="text-xs text-stc-muted mb-3">First 3 breakdowns free.</p>
          <button
            onClick={() => router.push('/signup?role=casting')}
            className="w-full py-3 bg-stc-dark text-white font-semibold rounded-md text-sm"
          >
            Start with 3 Free Breakdowns
          </button>
        </div>

        {/* Agents & Managers — FREE */}
        <div className="bg-white border border-stc-border rounded-lg p-4 mb-3 border-l-4 border-l-stc-success">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-base font-bold">Agents & Managers</h2>
            <span className="bg-stc-success text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              Free
            </span>
          </div>
          <p className="text-xs text-stc-muted mb-3">
            Submit your clients. Manage their tapes. No per-seat fees, no monthly bill.
          </p>
          <div className="text-sm leading-7 mb-4">
            <div>✓ &nbsp;Represent unlimited clients</div>
            <div>✓ &nbsp;Submit them to roles directly</div>
            <div>✓ &nbsp;Manage their audition tapes</div>
          </div>
          <button
            onClick={() => router.push('/signup?role=agent')}
            className="w-full py-3 bg-stc-dark text-white font-semibold rounded-md text-sm"
          >
            Join Free
          </button>
          <p className="text-[10px] text-stc-muted text-center mt-3 leading-relaxed">
            Reps shouldn't have to pay hundreds a month to do their job. Here you don't.
          </p>
        </div>

        {/* Already have an account */}
        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/login')}
            className="text-stc-link text-sm underline"
          >
            Already have an account? Log in
          </button>
        </div>

        {/* Old way vs new */}
        <div className="mt-6 mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Why this exists</p>
          <div className="bg-white border border-stc-border rounded-lg overflow-hidden">
            {[
              ['Waiting in line for 16 bars', 'Record on your time'],
              ['$2/submission + $22/min', 'Free. Unlimited.'],
              ['No feedback. Ever.', 'Written notes + callbacks'],
              ['Lost after one audition', 'Your work lives on, always seen'],
              ['Pay hidden', 'Pay required on every post'],
            ].map(([old, nw], i) => (
              <div key={i} className={`px-3 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <p className="text-xs text-stc-muted line-through">✗ {old}</p>
                <p className="text-sm font-bold text-stc-success">✓ {nw}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] text-stc-muted mt-6">
          Self Tape Casting © 2026 · NYC-based · Built for musical theater
        </p>
      </main>
    </div>
  );
}
