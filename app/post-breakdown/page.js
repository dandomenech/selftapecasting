'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

const TABS = [
  { id: 'browse', label: 'Browse', icon: '🔍' },
  { id: 'post', label: 'Post Role', icon: '+' },
  { id: 'breakdowns', label: 'My Posts', icon: '📋' },
];

const PAY_UNIT_LABELS = {
  week: '/ week',
  performance: '/ performance',
  day: '/ day',
  flat: 'flat / total run',
};

export default function PostBreakdownPage() {
  const router = useRouter();
  const [step, setStep] = useState('form'); // form | preview
  const [showName, setShowName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payUnit, setPayUnit] = useState('');
  const [unionStatus, setUnionStatus] = useState('Either');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
    });
  }, [router]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (s) => setSkills(skills.filter(x => x !== s));

  const formattedPayRate = () => {
    if (payUnit === 'unpaid') return payAmount.trim() ? `Unpaid — ${payAmount.trim()}` : 'Unpaid';
    if (!payUnit) return '';
    return `$${payAmount.trim()} ${PAY_UNIT_LABELS[payUnit]}`;
  };

  const handleContinueToPreview = () => {
    setError('');

    if (!showName.trim() || !roleName.trim()) {
      setError('Show name and role name are required.');
      return;
    }
    if (!payUnit) {
      setError('Select how the pay is structured (per week, per performance, etc.) \u2014 a bare number isn\u2019t enough.');
      return;
    }
    if (payUnit !== 'unpaid' && !payAmount.trim()) {
      setError('Enter the pay amount, or select "Unpaid / Stipend" if there is no pay.');
      return;
    }

    // Sweep in any skill text left in the box but never explicitly added
    const leftover = skillInput.trim();
    if (leftover && !skills.includes(leftover)) {
      setSkills([...skills, leftover]);
    }

    setStep('preview');
  };

  const handlePublish = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();

    const { error: insertError } = await supabase.from('breakdowns').insert({
      posted_by: session.user.id,
      show_name: showName.trim(),
      role_name: roleName.trim(),
      description: description.trim(),
      pay_rate: formattedPayRate(),
      union_status: unionStatus,
      location: location.trim(),
      required_skills: skills,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      status: 'open',
    });

    setSaving(false);

    if (insertError) {
      setError('Could not post the breakdown. Please try again.');
      setStep('form');
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/breakdowns'), 1500);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-stc-bg">
        <TopNav />
        <main className="max-w-md mx-auto px-4 py-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center mt-8">
            <p className="text-lg font-bold text-stc-success">✓ Published</p>
            <p className="text-xs text-stc-muted mt-1">Your breakdown is live. Performers can now submit.</p>
          </div>
        </main>
      </div>
    );
  }

  // ── PREVIEW STEP ──
  if (step === 'preview') {
    return (
      <div className="min-h-screen bg-stc-bg">
        <TopNav />
        <main className="max-w-md mx-auto px-4 py-4 pb-24">
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-4">
            <p className="text-sm font-bold text-stc-warning mb-1">⚠ This is about to go public</p>
            <p className="text-xs text-stc-dark leading-relaxed">
              Check every detail below \u2014 spelling, pay rate, skills. This is exactly what performers will see. You can still go back and fix anything before publishing.
            </p>
          </div>

          {/* Exactly what a performer sees on /apply/[id] */}
          <div className="bg-white border-2 border-stc-dark rounded-lg p-4 mb-4">
            <p className="text-[10px] uppercase tracking-wider text-stc-muted mb-2">Performer preview</p>
            <h2 className="text-2xl font-bold font-serif mb-1">{roleName || '(no role name)'}</h2>
            <p className="text-xs text-stc-muted mb-1">{showName || '(no show name)'}</p>
            <p className="text-[11px] text-stc-muted mb-3">
              {[formattedPayRate(), unionStatus, location].filter(Boolean).join(' · ')}
            </p>
            {description && (
              <p className="text-sm bg-stc-bg border border-stc-border rounded-lg p-3 mb-3">{description}</p>
            )}
            {skills.length > 0 && (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Skills performers will be asked about</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(s => (
                    <span key={s} className="text-xs bg-stc-bg border border-stc-border rounded-full px-3 py-1">{s}</span>
                  ))}
                </div>
              </>
            )}
            {closesAt && (
              <p className="text-[11px] text-stc-muted mt-3 pt-3 border-t border-gray-100">
                Submissions close: <strong>{new Date(closesAt).toLocaleDateString()}</strong>
              </p>
            )}
          </div>

          <p className="text-[11px] text-stc-muted text-center mb-3">
            After publishing, you can mark this role as cast — but the details above are locked.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
              <p className="text-sm text-stc-accent">{error}</p>
            </div>
          )}

          <button onClick={() => setStep('form')}
            className="w-full py-3 mb-2 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
            ← Edit Before Publishing
          </button>
          <button onClick={handlePublish} disabled={saving}
            className="w-full py-3.5 bg-stc-accent text-white font-bold rounded-md text-base disabled:opacity-50 shadow-lg">
            {saving ? 'Publishing...' : 'Publish to Performers'}
          </button>
        </main>
      </div>
    );
  }

  // ── FORM STEP ──
  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-1">Post a Role</h1>
        <p className="text-xs text-stc-muted mb-4">
          Name the skills that actually matter for this role. Performers will check off only what you ask for \u2014 not a 300-item list.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Show Name</label>
            <input type="text" value={showName} onChange={e => setShowName(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder="e.g. Evita — National Tour" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Role Name</label>
            <input type="text" value={roleName} onChange={e => setRoleName(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder="e.g. Che" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white min-h-[80px]"
              placeholder="Brief notes on the role, rehearsal dates, etc." />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Pay Rate <span className="text-stc-accent">*</span></label>
            <p className="text-[11px] text-stc-muted mb-1.5">A number alone isn't enough — select how it's paid out.</p>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stc-muted text-sm">$</span>
                <input type="text" inputMode="numeric" value={payAmount}
                  onChange={e => setPayAmount(e.target.value.replace(/[^0-9,]/g, ''))}
                  disabled={payUnit === 'unpaid'}
                  className="w-full pl-6 pr-3 py-2.5 border border-stc-border rounded-md text-base bg-white disabled:bg-gray-100 disabled:text-stc-muted"
                  placeholder="1,800" />
              </div>
              <select value={payUnit} onChange={e => setPayUnit(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-stc-border rounded-md text-base bg-white">
                <option value="">Rate...</option>
                <option value="week">Per week</option>
                <option value="performance">Per performance</option>
                <option value="day">Per day</option>
                <option value="flat">Flat / total run</option>
                <option value="unpaid">Unpaid / Stipend</option>
              </select>
            </div>
            {payUnit === 'unpaid' && (
              <input type="text" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
                placeholder="Optional: stipend amount or note" />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder="NYC" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Union Status</label>
            <div className="flex gap-2">
              {['AEA', 'Non-Union', 'Either'].map(u => (
                <button key={u} type="button" onClick={() => setUnionStatus(u)}
                  className={`flex-1 py-2.5 rounded-md text-xs font-semibold border
                    ${unionStatus === u ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Skill requirements */}
          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Skills Required for This Role</label>
            <p className="text-[11px] text-stc-muted mb-2">
              Only add skills that actually matter. Performers will see exactly these as yes/no checkmarks — nothing more.
            </p>
            <div className="flex gap-2 mb-2">
              <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                className="flex-1 px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
                placeholder="Type a skill, then tap Add" />
              <button type="button" onClick={addSkill}
                className="px-4 py-2.5 bg-stc-dark text-white rounded-md text-sm font-semibold">
                Add
              </button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 bg-stc-bg border border-stc-border rounded-full px-3 py-1 text-xs">
                    {s}
                    <button onClick={() => removeSkill(s)} className="text-stc-accent font-bold ml-1">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Submissions Close (optional)</label>
            <p className="text-[11px] text-stc-muted mb-2">
              Once published, this can't be changed. After this date, performers will see the role as expired.
            </p>
            <input type="date" value={closesAt} onChange={e => setClosesAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-stc-accent">{error}</p>
            </div>
          )}

          <button onClick={handleContinueToPreview}
            className="w-full py-3 bg-stc-dark text-white font-semibold rounded-md text-sm">
            Continue to Preview →
          </button>
        </div>
      </main>

      <BottomNav tabs={TABS} active="post" onSelect={(id) => {
        if (id === 'browse') router.push('/browse');
        if (id === 'breakdowns') router.push('/breakdowns');
      }} />
    </div>
  );
}
