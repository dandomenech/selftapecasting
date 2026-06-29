'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function Camera({ trackUrl, onRecordingComplete, onCancel }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState('preview'); // preview | countdown | recording | review
  const [countdownNum, setCountdownNum] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // user = front, environment = rear
  const timerRef = useRef(null);

  // Start camera stream
  const startCamera = useCallback(async (facing) => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facingMode, startCamera]);

  const switchCamera = () => {
    setFacingMode(f => f === 'user' ? 'environment' : 'user');
  };

  // Start countdown then recording
  const startCountdown = () => {
    setPhase('countdown');
    setCountdownNum(3);
    let n = 3;
    const iv = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(iv);
        startRecording();
        return;
      }
      setCountdownNum(n);
    }, 1000);
  };

  const startRecording = () => {
    chunksRef.current = [];
    setRecordingTime(0);
    setPhase('recording');

    // Start backing track
    if (trackUrl) {
      audioRef.current = new Audio(trackUrl);
      audioRef.current.play().catch(console.error);
    }

    // Determine supported MIME type
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setPhase('review');
    };

    recorder.start(1000); // Collect data every second

    // Timer
    timerRef.current = setInterval(() => {
      setRecordingTime(t => {
        if (t >= 300) { // 5 minute max
          stopRecording();
          return t;
        }
        return t + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleUpload = () => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
    }
  };

  const handleReRecord = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setPhase('preview');
    startCamera(facingMode);
  };

  return (
    <div className="relative">
      {/* ── Camera Preview / Recording ── */}
      {(phase === 'preview' || phase === 'countdown' || phase === 'recording') && (
        <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '9/16' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          {/* Framing guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-white/40 rounded-md w-[60%] h-[55%]
                          flex items-end justify-center pb-3">
              <span className="text-white/50 text-[10px] uppercase tracking-widest">
                chest up — center
              </span>
            </div>
          </div>

          {/* Countdown overlay */}
          {phase === 'countdown' && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-10">
              <span className="text-white text-8xl font-bold font-serif">{countdownNum}</span>
            </div>
          )}

          {/* Recording indicator */}
          {phase === 'recording' && (
            <div className="absolute top-3 right-3 bg-black/60 px-2.5 py-1 rounded text-red-500
                          text-sm font-bold z-10">
              ● REC {formatTime(recordingTime)}
            </div>
          )}
        </div>
      )}

      {/* ── Review (playback) ── */}
      {phase === 'review' && recordedUrl && (
        <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '9/16' }}>
          <video
            src={recordedUrl}
            controls
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      )}

      {/* ── Controls ── */}
      <div className="mt-3 space-y-2">
        {phase === 'preview' && (
          <>
            <p className="text-xs text-stc-muted mb-2">
              {trackUrl
                ? 'Put one earbud in. Backing track will play when recording starts.'
                : 'Position yourself within the frame, then tap record.'}
            </p>
            <button onClick={startCountdown}
              className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm">
              ⏺ &nbsp;Play Track & Record
            </button>
            <button onClick={switchCamera}
              className="w-full py-3 bg-white border border-stc-border text-stc-dark font-semibold rounded-md text-sm">
              Switch Camera
            </button>
            <button onClick={onCancel}
              className="w-full py-3 text-stc-muted text-sm">
              Cancel
            </button>
          </>
        )}

        {phase === 'recording' && (
          <button onClick={stopRecording}
            className="w-full py-3 bg-stc-accent text-white font-semibold rounded-md text-sm">
            ■ &nbsp;Stop Recording ({formatTime(recordingTime)})
          </button>
        )}

        {phase === 'review' && (
          <>
            {/* Quality check placeholder */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
              <p className="text-sm font-bold text-stc-success mb-1">✓ Ready for upload</p>
              <p className="text-xs text-stc-muted">
                Audio will be mixed and lighting corrected after upload. Processing takes 1–2 minutes.
              </p>
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
          </>
        )}
      </div>
    </div>
  );
}
