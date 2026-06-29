'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/TopNav';
import Camera from '@/components/Camera';
import BlueprintSheet from '@/components/BlueprintSheet';

export default function RecordRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = params.roleId;

  const [role, setRole] = useState(null);
  const [step, setStep] = useState('select'); // select | trackSource | recording
  const [selectedType, setSelectedType] = useState(null); // song_1 | song_2 | scene
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [trackSource, setTrackSource] = useState(null); // 'provided' | 'own' | 'acappella'
  const [ownTrackUrl, setOwnTrackUrl] = useState(null);
  const [ownTrackName, setOwnTrackName] = useState('');

  useEffect(() => {
    supabase.from('roles').select('*').eq('id', roleId).single().then(({ data }) => {
      setRole(data);
    });
  }, [roleId]);

  const handleRecordingComplete = async (blob) => {
    setUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const userId = session.user.id;
    const fileName = `${userId}/${roleId}_${selectedType}_${Date.now()}.webm`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, blob, {
        contentType: blob.type || 'video/webm',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      alert('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    // Create video record in database
    const { error: dbError } = await supabase.from('videos').insert({
      user_id: userId,
      role_id: roleId,
      video_type: selectedType,
      video_url: urlData.publicUrl,
      status: 'live', // MVP: skip processing, go straight to live
    });

    if (dbError) {
      console.error('DB error:', dbError);
      alert('Error saving video record.');
      setUploading(false);
      return;
    }

    setUploading(false);
    setUploadSuccess(true);

    // Redirect to portfolio after brief success message
    setTimeout(() => router.push('/portfolio'), 2000);
  };

  if (!role) return <div className="min-h-screen bg-stc-bg flex items-center justify-center text-stc-muted">Loading...</div>;

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />

      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        {/* Upload in progress */}
        {uploading && (
          <div className="bg-white border border-stc-border rounded-lg p-8 text-center">
            <div className="text-2xl mb-3">⏳</div>
            <p className="text-sm font-bold mb-2">Uploading...</p>
            <p className="text-xs text-stc-muted">This may take a moment on cellular.</p>
          </div>
        )}

        {/* Upload success */}
        {uploadSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="text-2xl mb-3">✓</div>
            <p className="text-sm font-bold text-stc-success mb-2">Uploaded!</p>
            <p className="text-xs text-stc-muted">Redirecting to your portfolio...</p>
          </div>
        )}

        {/* Song/Scene Selection */}
        {!uploading && !uploadSuccess && step === 'select' && (
          <>
            <div className="mb-4">
              <button onClick={() => router.push('/record')}
                className="text-sm text-stc-link underline">← Back</button>
            </div>

            <h1 className="text-2xl font-bold font-serif mb-1">{role.role_name}</h1>
            <p className="text-xs text-stc-muted mb-4">{role.show_name}</p>

            {/* Setup guides */}
            <div className="bg-stc-bg border border-stc-border rounded-lg p-3 mb-4">
              <p className="text-xs font-bold mb-2">Before recording:</p>
              <p className="text-xs text-stc-muted mb-3">Set up your two lights and position your phone per the blueprint.</p>
              <button onClick={() => setShowBlueprint(true)}
                className="px-3 py-2 bg-white border border-stc-border rounded text-xs font-semibold">
                Setup Blueprint ⬒
              </button>
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Songs</p>

            {/* Song 1 */}
            <div className="bg-white border border-stc-border rounded-lg p-4 mb-2"
              onClick={() => { setSelectedType('song_1'); setTrackSource(null); setOwnTrackUrl(null); setOwnTrackName(''); setStep('trackSource'); }}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold">♪ {role.song_1_title}</p>
                  <p className="text-[10px] text-stc-muted">Standard audition cut</p>
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </div>
            </div>

            {/* Song 2 */}
            <div className="bg-white border border-stc-border rounded-lg p-4 mb-4"
              onClick={() => { setSelectedType('song_2'); setTrackSource(null); setOwnTrackUrl(null); setOwnTrackName(''); setStep('trackSource'); }}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold">♪ {role.song_2_title}</p>
                  <p className="text-[10px] text-stc-muted">Standard audition cut</p>
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">Scene</p>

            {/* Scene */}
            <div className="bg-white border border-stc-border rounded-lg p-4 border-l-4 border-l-stc-accent"
              onClick={() => { setSelectedType('scene'); setStep('recording'); }}>
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold">◊ {role.scene_title}</p>
                  <p className="text-[10px] text-stc-muted">With AI scene reader (coming soon — record without for MVP)</p>
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </div>
            </div>
          </>
        )}

        {/* Track Source Selection (songs only) */}
        {!uploading && !uploadSuccess && step === 'trackSource' && (
          <>
            <div className="mb-3">
              <button onClick={() => setStep('select')}
                className="text-sm text-stc-link underline">← Back</button>
            </div>

            <h2 className="text-base font-bold mb-1">
              {selectedType === 'song_1' ? role.song_1_title : role.song_2_title}
            </h2>
            <p className="text-xs text-stc-muted mb-4">{role.show_name} — {role.role_name}</p>

            <p className="text-xs font-bold uppercase tracking-wider text-stc-muted mb-2">How do you want to sing it?</p>

            {/* Provided track — only if one exists */}
            {((selectedType === 'song_1' && role.song_1_track_url) ||
              (selectedType === 'song_2' && role.song_2_track_url)) && (
              <div className="bg-white border border-stc-border rounded-lg p-4 mb-2 border-l-4 border-l-stc-accent"
                onClick={() => { setTrackSource('provided'); setStep('recording'); }}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">♪ Use the standard track</p>
                    <p className="text-[10px] text-stc-muted">Plays in your earbud. Same for everyone.</p>
                  </div>
                  <span className="text-gray-300 text-xl">›</span>
                </div>
              </div>
            )}

            {/* Bring your own track */}
            <div className="bg-white border border-stc-border rounded-lg p-4 mb-2">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold">⬆ Bring your own track</p>
                  <p className="text-[10px] text-stc-muted">
                    {ownTrackName ? `Selected: ${ownTrackName}` : 'Upload an MP3 you already own the rights to.'}
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                id="own-track-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setOwnTrackName(file.name);
                    setOwnTrackUrl(URL.createObjectURL(file));
                  }
                }}
              />
              {!ownTrackName ? (
                <label htmlFor="own-track-input"
                  className="block w-full text-center py-2.5 mt-2 bg-stc-bg border border-stc-border rounded-md text-xs font-semibold cursor-pointer">
                  Choose Audio File
                </label>
              ) : (
                <button onClick={() => { setTrackSource('own'); setStep('recording'); }}
                  className="w-full py-2.5 mt-2 bg-stc-accent text-white rounded-md text-xs font-semibold">
                  Use This Track & Record →
                </button>
              )}
            </div>

            {/* A cappella */}
            <div className="bg-white border border-stc-border rounded-lg p-4 mb-2"
              onClick={() => { setTrackSource('acappella'); setStep('recording'); }}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold">🎤 Sing a cappella</p>
                  <p className="text-[10px] text-stc-muted">No backing track. Just your voice.</p>
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
              <p className="text-[11px] leading-relaxed text-stc-dark">
                <strong>Note:</strong> Standard backing tracks are coming soon. For now, bring a track you own or sing a cappella. Only upload audio you have the rights to use.
              </p>
            </div>
          </>
        )}

        {/* Camera Recording */}
        {!uploading && !uploadSuccess && step === 'recording' && (
          <>
            <div className="mb-3">
              <button onClick={() => setStep(selectedType === 'scene' ? 'select' : 'trackSource')}
                className="text-sm text-stc-link underline">← Back</button>
            </div>

            <h2 className="text-base font-bold mb-1">
              {role.show_name} — {role.role_name}
            </h2>
            <p className="text-xs text-stc-muted mb-1">
              {selectedType === 'song_1' ? role.song_1_title :
               selectedType === 'song_2' ? role.song_2_title :
               role.scene_title}
            </p>
            {selectedType !== 'scene' && (
              <p className="text-[10px] text-stc-muted mb-3">
                {trackSource === 'provided' ? 'Standard track will play in your earbud.' :
                 trackSource === 'own' ? `Your track: ${ownTrackName}` :
                 'A cappella — no backing track.'}
              </p>
            )}

            <Camera
              trackUrl={
                selectedType === 'scene' ? null :
                trackSource === 'provided'
                  ? (selectedType === 'song_1' ? role.song_1_track_url : role.song_2_track_url)
                  : trackSource === 'own'
                    ? ownTrackUrl
                    : null
              }
              onRecordingComplete={handleRecordingComplete}
              onCancel={() => setStep(selectedType === 'scene' ? 'select' : 'trackSource')}
            />
          </>
        )}

        {showBlueprint && <BlueprintSheet onClose={() => setShowBlueprint(false)} />}
      </main>
    </div>
  );
}
