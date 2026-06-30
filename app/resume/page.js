'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

// ──────────────────────────────────────────
// AI STANDARDIZATION CALL
// ──────────────────────────────────────────
// This is the one function that needs a real AI API wired in.
// For now it returns a clear "not yet connected" result so the
// rest of the flow (editor, confirmation) is fully testable.
// To wire it up: call your backend route, which calls the
// Anthropic API with the resume file/text and a prompt that
// extracts credits / collaborators / training as JSON.
async function standardizeResumeWithAI(fileUrl, fileName) {
  // PLACEHOLDER — replace with a real API call, e.g.:
  // const res = await fetch('/api/resume/standardize', {
  //   method: 'POST',
  //   body: JSON.stringify({ fileUrl }),
  // });
  // return await res.json();

  await new Promise(r => setTimeout(r, 1200)); // simulate processing time

  return {
    credits: [
      { show: '', role: '', company: '', year: '' },
    ],
    collaborators: [
      { name: '', role: 'Director', project: '' },
    ],
    training: [
      { institution: '', program: '', instructor: '', note: '' },
    ],
    _notice: 'AI standardization isn\u2019t connected yet. Starter rows added below \u2014 fill them in manually for now.',
  };
}

const COLLAB_ROLES = ['Director', 'Choreographer', 'Music Director', 'Producer', 'Casting Director', 'Other'];

export default function ResumePage() {
  const router = useRouter();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const [credits, setCredits] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [training, setTraining] = useState([]);

  useEffect(() => {
    loadResume();
  }, []);

  const loadResume = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (data) {
      setResume(data);
      setCredits(data.credits?.length ? data.credits : []);
      setCollaborators(data.collaborators?.length ? data.collaborators : []);
      setTraining(data.training?.length ? data.training : []);
    }
    setLoading(false);
  };

  // ── Upload + AI standardize ──
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session.user.id;
    const fileName = `${userId}/resume_${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, file, { upsert: false });

    if (uploadError) {
      alert('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(fileName);

    // Create or update the resume record
    const { data: saved, error: saveError } = await supabase
      .from('resumes')
      .upsert({
        user_id: userId,
        original_file_url: urlData.publicUrl,
        original_file_name: file.name,
        status: 'processing',
      }, { onConflict: 'user_id' })
      .select()
      .single();

    setUploading(false);

    if (saveError) {
      alert('Could not save the resume record.');
      return;
    }

    setResume(saved);
    setProcessing(true);

    // Run AI standardization
    const result = await standardizeResumeWithAI(urlData.publicUrl, file.name);

    setCredits(result.credits);
    setCollaborators(result.collaborators);
    setTraining(result.training);
    if (result._notice) setNotice(result._notice);

    await supabase.from('resumes').update({
      status: 'needs_review',
      ai_processed_at: new Date().toISOString(),
      credits: result.credits,
      collaborators: result.collaborators,
      training: result.training,
    }).eq('user_id', userId);

    setProcessing(false);
  };

  const handleStartManually = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session.user.id;

    const { data: saved } = await supabase
      .from('resumes')
      .upsert({ user_id: userId, status: 'needs_review' }, { onConflict: 'user_id' })
      .select()
      .single();

    setResume(saved);
    setCredits([{ show: '', role: '', company: '', year: '' }]);
    setCollaborators([{ name: '', role: 'Director', project: '' }]);
    setTraining([{ institution: '', program: '', instructor: '', note: '' }]);
  };

  // ── Editor row helpers ──
  const updateRow = (list, setList, idx, field, value) => {
    const next = [...list];
    next[idx] = { ...next[idx], [field]: value };
    setList(next);
  };
  const addRow = (list, setList, emptyRow) => setList([...list, emptyRow]);
  const removeRow = (list, setList, idx) => setList(list.filter((_, i) => i !== idx));

  // ── Save (draft, doesn't go live) ──
  const handleSaveDraft = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('resumes').update({
      credits, collaborators, training,
      updated_at: new Date().toISOString(),
    }).eq('user_id', session.user.id);
    setSaving(false);
  };

  // ── Confirm (goes live on profile) ──
  const handleConfirm = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data: updated } = await supabase.from('resumes').update({
      credits, collaborators, training,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', session.user.id).select().single();
    setResume(updated);
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.push('/portfolio')} className="text-sm text-stc-link underline mb-3">← Back to Portfolio</button>

        <h1 className="text-2xl font-bold font-serif mb-1">Resume</h1>
        <p className="text-xs text-stc-muted mb-4 leading-relaxed">
          Your tapes are the headline — this is the footnote. Just credits, collaborators, and training, in one clean format.
        </p>

        {/* No resume yet — upload or start manually */}
        {!resume && (
          <div className="bg-white border border-stc-border rounded-lg p-4">
            <p className="text-sm font-bold mb-1">Upload your resume</p>
            <p className="text-xs text-stc-muted mb-3">
              PDF or image. We'll pull out your credits, collaborators, and training and put them in a clean, standard format.
            </p>

            <input type="file" accept=".pdf,image/*" id="resume-input" className="hidden" onChange={handleFileUpload} />
            <label htmlFor="resume-input"
              className={`block w-full text-center py-3 rounded-md text-sm font-semibold cursor-pointer
                ${uploading ? 'bg-gray-200 text-stc-muted' : 'bg-stc-accent text-white'}`}>
              {uploading ? 'Uploading...' : 'Choose File'}
            </label>

            <div className="text-center my-3 text-xs text-stc-muted">— or —</div>

            <button onClick={handleStartManually}
              className="w-full py-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
              Start from scratch
            </button>
          </div>
        )}

        {/* Processing */}
        {processing && (
          <div className="bg-white border border-stc-border rounded-lg p-6 text-center mt-3">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-sm font-bold">Standardizing your resume...</p>
            <p className="text-xs text-stc-muted mt-1">Pulling out credits, collaborators, and training.</p>
          </div>
        )}

        {/* Editor — shown once resume exists and isn't mid-processing */}
        {resume && !processing && (
          <>
            {notice && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
                <p className="text-xs leading-relaxed">{notice}</p>
              </div>
            )}

            {resume.status === 'confirmed' && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
                <p className="text-xs font-bold text-stc-success">✓ Live on your profile</p>
                <p className="text-[11px] text-stc-muted mt-0.5">Make changes anytime — you'll confirm again before they go live.</p>
              </div>
            )}

            {/* CREDITS */}
            <SectionHeader title="Credits" subtitle="What you've done" />
            {credits.map((row, i) => (
              <div key={i} className="bg-white border border-stc-border rounded-lg p-3 mb-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <LabeledInput label="Show" value={row.show} onChange={v => updateRow(credits, setCredits, i, 'show', v)} />
                  <LabeledInput label="Role" value={row.role} onChange={v => updateRow(credits, setCredits, i, 'role', v)} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <LabeledInput label="Company / Venue" value={row.company} onChange={v => updateRow(credits, setCredits, i, 'company', v)} />
                  <LabeledInput label="Year" value={row.year} onChange={v => updateRow(credits, setCredits, i, 'year', v)} />
                </div>
                <button onClick={() => removeRow(credits, setCredits, i)} className="text-[11px] text-stc-accent">Remove</button>
              </div>
            ))}
            <AddRowButton label="+ Add credit" onClick={() => addRow(credits, setCredits, { show: '', role: '', company: '', year: '' })} />

            {/* COLLABORATORS */}
            <SectionHeader title="Collaborators" subtitle="Who you've worked with" />
            {collaborators.map((row, i) => (
              <div key={i} className="bg-white border border-stc-border rounded-lg p-3 mb-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <LabeledInput label="Name" value={row.name} onChange={v => updateRow(collaborators, setCollaborators, i, 'name', v)} />
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-stc-muted mb-0.5">Role</label>
                    <select value={row.role} onChange={e => updateRow(collaborators, setCollaborators, i, 'role', e.target.value)}
                      className="w-full px-2 py-2 border border-stc-border rounded-md text-sm bg-white">
                      {COLLAB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <LabeledInput label="Project" value={row.project} onChange={v => updateRow(collaborators, setCollaborators, i, 'project', v)} />
                <button onClick={() => removeRow(collaborators, setCollaborators, i)} className="text-[11px] text-stc-accent mt-2">Remove</button>
              </div>
            ))}
            <AddRowButton label="+ Add collaborator" onClick={() => addRow(collaborators, setCollaborators, { name: '', role: 'Director', project: '' })} />

            {/* TRAINING */}
            <SectionHeader title="Training" subtitle="The mind for the work" />
            {training.map((row, i) => (
              <div key={i} className="bg-white border border-stc-border rounded-lg p-3 mb-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <LabeledInput label="Institution" value={row.institution} onChange={v => updateRow(training, setTraining, i, 'institution', v)} />
                  <LabeledInput label="Program" value={row.program} onChange={v => updateRow(training, setTraining, i, 'program', v)} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <LabeledInput label="Instructor" value={row.instructor} onChange={v => updateRow(training, setTraining, i, 'instructor', v)} />
                  <LabeledInput label="Note" value={row.note} onChange={v => updateRow(training, setTraining, i, 'note', v)} />
                </div>
                <button onClick={() => removeRow(training, setTraining, i)} className="text-[11px] text-stc-accent">Remove</button>
              </div>
            ))}
            <AddRowButton label="+ Add training" onClick={() => addRow(training, setTraining, { institution: '', program: '', instructor: '', note: '' })} />

            {/* Actions */}
            <div className="mt-5 space-y-2">
              <button onClick={handleConfirm} disabled={saving}
                className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50">
                {saving ? 'Saving...' : resume.status === 'confirmed' ? 'Confirm Changes' : 'Confirm & Publish to Profile'}
              </button>
              <button onClick={handleSaveDraft} disabled={saving}
                className="w-full py-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
                Save as Draft
              </button>
            </div>

            <p className="text-[10px] text-stc-muted text-center mt-3 leading-relaxed">
              Your resume only goes live on your profile after you confirm it. It will always sit below your videos.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mt-5 mb-2">
      <p className="text-sm font-bold">{title}</p>
      <p className="text-[11px] text-stc-muted">{subtitle}</p>
    </div>
  );
}

function LabeledInput({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase text-stc-muted mb-0.5">{label}</label>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-2 border border-stc-border rounded-md text-sm bg-white" />
    </div>
  );
}

function AddRowButton({ label, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full py-2.5 mb-1 bg-stc-bg border border-dashed border-stc-border rounded-md text-xs font-semibold text-stc-muted">
      {label}
    </button>
  );
}
