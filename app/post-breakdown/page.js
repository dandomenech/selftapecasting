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
  const [showName, setShowName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payUnit, setPayUnit] = useState('');
  const [unionStatus, setUnionStatus] = useState('Either');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
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

  const handlePost = async () => {
    setError('');

    if (!showName.trim() || !roleName.trim()) {
      setError('Show name and role name are required.');
      return;
    }
    if (!payUnit) {
      setError('Select how the pay is structured (per week, per performance, etc.) — a bare number isn\u2019t enough. Performers deserve to know the actual rate before they audition.');
      return;
    }
    if (payUnit !== 'unpaid' && !payAmount.trim()) {
      setError('Enter the pay amount, or select "Unpaid / Stipend" if there is no pay.');
      return;
    }

    const payRate = payUnit === 'unpaid'
      ? (payAmount.trim() ? `Unpaid — ${payAmount.trim()}` : 'Unpaid')
      : `$${payAmount.trim()} ${PAY_UNIT_LABELS[payUnit]}`;

    // Safety net: if there's text sitting in the skill input that was never
    // explicitly added, sweep it in now rather than silently losing it.
    let finalSkills = skills;
    const leftover = skillInput.trim();
    if (leftover && !finalSkills.includes(leftover)) {
      finalSkills = [...finalSkills, leftover];
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();

    const { error: insertError } = await supabase.from('breakdowns').insert({
      posted_by: session.user.id,
      show_name: showName.trim(),
      role_name: roleName.trim(),
      description: description.trim(),
      pay_rate: payRate.trim(),
      union_status: unionStatus,
      location: location.trim(),
      required_skills: finalSkills,
      status: 'open',
    });

    setSaving(false);

    if (insertError) {
      setError('Could not post the breakdown. Please try again.');
      return;
    }

    setSuccess(true);
    setShowName(''); setRoleName(''); setDescription(''); setPayAmount(''); setPayUnit('');
    setUnionStatus('Either'); setLocation(''); setSkills([]);

    setTimeout(() => {
      setSuccess(false);
      router.push('/breakdowns');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold font-serif mb-1">Post a Role</h1>
        <p className="text-xs text-stc-muted mb-4">
          Name the skills that actually matter for this role. Performers will check off only what you ask for — not a 300-item list.
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-sm font-bold text-stc-success">✓ Posted</p>
            <p className="text-xs text-stc-muted mt-1">Performers can now submit.</p>
          </div>
        ) : (
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-stc-accent">{error}</p>
              </div>
            )}

            <button onClick={handlePost} disabled={saving}
              className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50">
              {saving ? 'Posting...' : 'Post Breakdown'}
            </button>
          </div>
        )}
      </main>

      <BottomNav tabs={TABS} active="post" onSelect={(id) => {
        if (id === 'browse') router.push('/browse');
        if (id === 'breakdowns') router.push('/breakdowns');
      }} />
    </div>
  );
}
