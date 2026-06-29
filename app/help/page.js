'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';

// Change this to your real admin email
const ADMIN_EMAIL = 'dandomenech@gmail.com';

export default function HelpPage() {
  const router = useRouter();
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const subjects = {
      bug: 'Bug Report',
      request: 'Feature Request',
      question: 'Question',
      other: 'Support',
    };
    const subject = encodeURIComponent(`[Self Tape Casting] ${subjects[type]}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-stc-bg">
      <TopNav />
      <main className="max-w-md mx-auto px-4 py-4 pb-12">
        <button onClick={() => router.back()} className="text-sm text-stc-link underline mb-3">← Back</button>

        <h1 className="text-2xl font-bold font-serif mb-1">Help & Feedback</h1>
        <p className="text-xs text-stc-muted mb-4">
          Found a bug? Have a request? We're building this with you — tell us what you need.
        </p>

        <div className="bg-white border border-stc-border rounded-lg p-4">
          <label className="block text-xs font-bold uppercase text-stc-muted mb-2">What's this about?</label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { id: 'bug', label: 'Report a bug' },
              { id: 'request', label: 'Request a feature' },
              { id: 'question', label: 'Ask a question' },
              { id: 'other', label: 'Something else' },
            ].map(opt => (
              <button key={opt.id} onClick={() => setType(opt.id)}
                className={`py-2.5 px-3 rounded-md text-xs font-semibold border
                  ${type === opt.id
                    ? 'bg-stc-dark text-white border-stc-dark'
                    : 'bg-white text-stc-dark border-stc-border'}`}>
                {opt.label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-bold uppercase text-stc-muted mb-1">Your message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white min-h-[120px]"
            placeholder="Tell us what's going on. The more detail, the better." />

          <button onClick={handleSend} disabled={!message.trim()}
            className="w-full py-3 mt-3 bg-stc-accent text-white font-semibold rounded-md text-sm disabled:opacity-50">
            Send to Team
          </button>

          <p className="text-[10px] text-stc-muted text-center mt-3 leading-relaxed">
            This opens your email app with the message ready to send.
            Or email us directly at {ADMIN_EMAIL}.
          </p>
        </div>
      </main>
    </div>
  );
}
