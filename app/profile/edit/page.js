'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

const DANCE_LEVELS = ['Non-dancer', 'Mover', 'Trained', 'Strong / Advanced'];
const UNION_OPTIONS = ['AEA', 'Non-Union', 'EMC', 'Other'];

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [vocalRange, setVocalRange] = useState('');
  const [danceLevel, setDanceLevel] = useState('');
  const [unionStatus, setUnionStatus] = useState('');
  const [headshotUrl, setHeadshotUrl] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (prof) {
      setName(prof.name || '');
      setLocation(prof.location || '');
      setVocalRange(prof.vocal_range || '');
      setDanceLevel(prof.dance_level || '');
      setUnionStatus(prof.union_status || '');
      setHeadshotUrl(prof.headshot_url || '');
    }
    setLoading(false);
  };

  const handleHeadshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHeadshot(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session.user.id;
    const ext = file.name.split('.').pop();
    const fileName = `${userId}/headshot_${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('headshots')
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (upErr) {
      alert('Could not upload headshot. Please try again.');
      setUploadingHeadshot(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('headshots').getPublicUrl(fileName);
    setHeadshotUrl(urlData.publicUrl);
    setUploadingHeadshot(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Your name is required.');
      return;
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase.from('profiles').update({
      name: name.trim(),
      location: location.trim(),
      vocal_range: vocalRange.trim(),
      dance_level: danceLevel,
      union_status: unionStatus,
      headshot_url: headshotUrl,
    }).eq('id', session.user.id);

    setSaving(false);
    if (error) {
      alert('Could not save. Please try again.');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.push('/portfolio')} className="text-sm text-stc-link underline mb-3">← Back to Portfolio</button>

        <h1 className="text-2xl font-bold font-serif mb-1">Edit Profile</h1>
        <p className="text-xs text-stc-muted mb-4">
          This is how casting sees you. Keep it current — these details help the right people find your work.
        </p>

        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
            <p className="text-sm font-bold text-stc-success">Saved</p>
          </div>
        )}

        {/* Headshot */}
        <div className="bg-white border border-stc-border rounded-lg p-4 mb-3">
          <label className="block text-xs font-bold uppercase text-stc-muted mb-2">Headshot</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-20 bg-gray-100 border border-stc-border rounded flex items-center justify-center overflow-hidden flex-shrink-0">
              {headshotUrl
                ? <img src={headshotUrl} alt="Headshot" className="w-full h-full object-cover" />
                : <span className="text-[10px] text-stc-muted text-center px-1">No photo</span>}
            </div>
            <div className="flex-1">
              <label className="inline-block px-3 py-2 bg-stc-dark text-white rounded-md text-xs font-semibold cursor-pointer">
                {uploadingHeadshot ? 'Uploading...' : (headshotUrl ? 'Change photo' : 'Upload photo')}
                <input type="file" accept="image/*" onChange={handleHeadshotUpload} className="hidden" disabled={uploadingHeadshot} />
              </label>
              <p className="text-[10px] text-stc-muted mt-1.5">A clear, current headshot. The tape is the headline — this is the footnote.</p>
            </div>
          </div>
        </div>

        {/* Core fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Name <span className="text-stc-accent">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder="Your full name" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder="e.g. New York, NY" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Vocal Range</label>
            <input type="text" value={vocalRange} onChange={e => setVocalRange(e.target.value)}
              className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white"
              placeholder="e.g. Tenor (A2–B4), belt to G" />
            <p className="text-[10px] text-stc-muted mt-1">Casting can search by this — be specific.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Dance Level</label>
            <div className="grid grid-cols-2 gap-2">
              {DANCE_LEVELS.map(d => (
                <button key={d} type="button" onClick={() => setDanceLevel(danceLevel === d ? '' : d)}
                  className={`py-2.5 rounded-md text-xs font-semibold border
                    ${danceLevel === d ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Union Status</label>
            <div className="grid grid-cols-2 gap-2">
              {UNION_OPTIONS.map(u => (
                <button key={u} type="button" onClick={() => setUnionStatus(unionStatus === u ? '' : u)}
                  className={`py-2.5 rounded-md text-xs font-semibold border
                    ${unionStatus === u ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </main>
    </div>
  );
}
