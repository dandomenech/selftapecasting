'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';

export default function ApplyToBreakdownPage() {
  const router = useRouter();
  const params = useParams();
  const breakdownId = params.breakdownId;

  const [breakdown, setBreakdown] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [skillAnswers, setSkillAnswers] = useState({});
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [breakdownId]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: bd } = await supabase.from('breakdowns').select('*').eq('id', breakdownId).single();
    setBreakdown(bd);

    const { data: vids } = await supabase
      .from('videos')
      .select('*, roles(*)')
      .eq('user_id', session.user.id)
      .eq('status', 'live')
      .order('created_at', { ascending: false });
    setVideos(vids || []);

    const { data: existing } = await supabase
      .from('submissions')
      .select('*')
      .eq('breakdown_id', breakdownId)
      .eq('performer_id', session.user.id)
      .maybeSingle();

    if (existing) {
      setExistingSubmission(existing);
      setSelectedVideos(existing.video_ids || []);
      setSkillAnswers(existing.skill_check_answers || {});
    } else {
      // Default all skills to unanswered (false) until the performer checks them
      const defaults = {};
      (bd?.required_skills || []).forEach(s => { defaults[s] = false; });
      setSkillAnswers(defaults);
    }

    setLoading(false);
  };

  const toggleVideo = (id) => {
    setSelectedVideos(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const toggleSkill = (skill) => {
    setSkillAnswers(prev => ({ ...prev, [skill]: !prev[skill] }));
  };

  const handleSubmit = async () => {
    if (selectedVideos.length === 0) {
      alert('Select at least one video to submit.');
      return;
    }
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();

    const payload = {
      breakdown_id: breakdownId,
      performer_id: session.user.id,
      submitted_by: session.user.id,
      video_ids: selectedVideos,
      skill_check_answers: skillAnswers,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from('submissions')
      .upsert(payload, { onConflict: 'breakdown_id,performer_id' })
      .select()
      .single();

    if (error) {
      alert('Could not submit. Please try again.');
      setSaving(false);
      return;
    }

    // Log the change for the audit trail
    await supabase.from('submission_changes').insert({
      submission_id: saved.id,
      changed_by: session.user.id,
      change_type: existingSubmission ? 'videos_updated' : 'created',
      change_summary: existingSubmission ? 'Updated submission' : 'Submitted to breakdown',
    });

    setSaving(false);
    setSuccess(true);
    setTimeout(() => router.push('/breakdowns'), 1500);
  };

  if (loading) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;
  if (!breakdown) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Role not found.</div>;

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.push('/breakdowns')} className="text-sm text-stc-link underline mb-3">← Back</button>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <p className="text-sm font-bold text-stc-success">✓ Submitted</p>
            <p className="text-xs text-stc-muted mt-1">{breakdown.show_name} — {breakdown.role_name}</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold font-serif mb-1">{breakdown.role_name}</h1>
            <p className="text-xs text-stc-muted mb-1">{breakdown.show_name}</p>
            <p className="text-[11px] text-stc-muted mb-3">
              {[breakdown.pay_rate, breakdown.union_status, breakdown.location].filter(Boolean).join(' · ')}
            </p>
            {breakdown.description && (
              <p className="text-sm bg-white border border-stc-border rounded-lg p-3 mb-4">{breakdown.description}</p>
            )}

            {/* Skill check — only the skills THIS role asked for */}
            {breakdown.required_skills?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Can you do this?</p>
                <div className="bg-white border border-stc-border rounded-lg p-3">
                  {breakdown.required_skills.map((skill, i) => (
                    <div key={skill} className={`flex items-center justify-between py-2 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                      <span className="text-sm">{skill}</span>
                      <button onClick={() => toggleSkill(skill)}
                        className={`w-12 h-7 rounded-full relative transition-colors ${skillAnswers[skill] ? 'bg-stc-success' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${skillAnswers[skill] ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video selection */}
            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Select tapes to submit</p>
            {videos.length === 0 ? (
              <div className="bg-white border border-stc-border rounded-lg p-4 text-center mb-4">
                <p className="text-sm text-stc-muted">No videos yet. Record one first.</p>
                <button onClick={() => router.push('/record')}
                  className="mt-2 text-xs text-stc-link underline">Go record →</button>
              </div>
            ) : (
              videos.map(v => {
                const title = v.video_type === 'song_1' ? v.roles?.song_1_title :
                             v.video_type === 'song_2' ? v.roles?.song_2_title :
                             v.roles?.scene_title;
                const selected = selectedVideos.includes(v.id);
                return (
                  <div key={v.id} onClick={() => toggleVideo(v.id)}
                    className={`flex items-center gap-3 bg-white border rounded-lg p-3 mb-2 cursor-pointer
                      ${selected ? 'border-stc-accent border-2' : 'border-stc-border'}`}>
                    <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center
                      ${selected ? 'bg-stc-accent border-stc-accent' : 'border-stc-border'}`}>
                      {selected && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{title}</p>
                      <p className="text-[10px] text-stc-muted">{v.roles?.show_name} — {v.roles?.role_name}</p>
                    </div>
                  </div>
                );
              })
            )}

            <button onClick={handleSubmit} disabled={saving || videos.length === 0}
              className="w-full py-3 mt-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50">
              {saving ? 'Submitting...' : existingSubmission ? 'Update Submission' : 'Submit to This Role'}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
