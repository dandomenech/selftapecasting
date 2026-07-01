'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function Camera({ trackUrl, onRecordingComplete, onCancel }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  const [phase, setPhase] = useState('preview');
  const [countdownNum, setCountdownNum] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  };

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const startCamera = useCallback(async (facing) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16 / 9 },
        },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Camera access is required. Please allow camera and microphone permissions.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facingMode, startCamera]);

  const switchCamera = () => setFacingMode(f => f === 'user' ? 'environment' : 'user');

  const startCountdown = () => {
    setPhase('countdown');
    setCountdownNum(3);
    let n = 3;
    const iv = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(iv);
        startRecording();
      } else {
        setCountdownNum(n);
      }
    }, 1000);
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    if (trackUrl) {
      if (!audioRef.current) audioRef.current = new Audio(trackUrl);
      audioRef.current.play().catch(e => console.warn('Track play error:', e));
    }

    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm',
    });
    mr.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      setPhase('review');
    };
    mr.start(1000);
    mediaRecorderRef.current = mr;

    setRecordingTime(0);
    setPhase('recording');
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const handleUpload = () => {
    if (recordedBlob) onRecordingComplete(recordedBlob);
  };

  const handleReRecord = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setPhase('preview');
    startCamera(facingMode);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const cameraStyle = isFullscreen
    ? { position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 9999, background: 'black' }
    : { position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '0.5rem', overflow: 'hidden', background: 'black' };

  return (
    <div ref={containerRef}>
      {/* ── Camera / Recording ── */}
      {(phase === 'preview' || phase === 'countdown' || phase === 'recording') && (
        <div style={cameraStyle}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            }}
          />

          {/* Top left — fullscreen */}
          <button onClick={toggleFullscreen} style={{
            position: 'absolute', top: 12, left: 12, zIndex: 20,
            background: 'rgba(0,0,0,0.5)', color: 'white',
            border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {isFullscreen ? 'Exit' : 'Full Screen'}
          </button>

          {/* Top right — flip or REC */}
          {phase === 'preview' && (
            <button onClick={switchCamera} style={{
              position: 'absolute', top: 12, right: 12, zIndex: 20,
              background: 'rgba(0,0,0,0.5)', color: 'white',
              border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              Flip
            </button>
          )}
          {phase === 'recording' && (
            <div style={{
              position: 'absolute', top: 12, right: 12, zIndex: 20,
              background: 'rgba(0,0,0,0.6)', color: '#ef4444',
              borderRadius: 6, padding: '4px 10px', fontSize: 13, fontWeight: 700,
            }}>
              REC {formatTime(recordingTime)}
            </div>
          )}

          {/* Countdown overlay */}
          {phase === 'countdown' && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20,
            }}>
              <span style={{ color: 'white', fontSize: 96, fontWeight: 700 }}>{countdownNum}</span>
            </div>
          )}

          {/* Bottom bar — always visible, overlays video */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            padding: '16px',
          }}>
            {phase === 'preview' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, flex: 1 }}>
                  {trackUrl ? 'Earbud in — track plays on record.' : 'Position yourself, then record.'}
                </span>
                <button onClick={startCountdown} style={{
                  background: '#8B0000', color: 'white', border: 'none',
                  borderRadius: 999, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  Record
                </button>
                <button onClick={onCancel} style={{
                  background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none',
                  borderRadius: 999, padding: '10px 12px', fontSize: 14, cursor: 'pointer',
                }}>
                  X
                </button>
              </div>
            )}
            {phase === 'recording' && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={stopRecording} style={{
                  background: 'white', color: '#1a1a2e', border: 'none',
                  borderRadius: 999, padding: '12px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                  Stop
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Review ── */}
      {phase === 'review' && recordedUrl && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '0.5rem', overflow: 'hidden', background: 'black' }}>
          <video src={recordedUrl} controls playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* ── Review controls ── */}
      {phase === 'review' && (
        <div className="mt-3 space-y-2">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-bold text-stc-success mb-1">Ready for upload</p>
            <p className="text-xs text-stc-muted">Processing takes 1-2 minutes after upload.</p>
          </div>
          <button onClick={handleUpload}
            className="w-full py-3 bg-stc-dark text-white font-semibold rounded-md text-sm">
            Upload to Portfolio
          </button>
          <button onClick={handleReRecord}
            className="w-full py-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
            Re-record
          </button>
          <button onClick={onCancel}
            className="w-full py-3 text-stc-accent text-sm">
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
