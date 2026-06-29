'use client';

export default function BlueprintSheet({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full max-h-[85vh] overflow-auto rounded-t-2xl p-4"
           onClick={e => e.stopPropagation()}>
        <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold font-serif mb-1">Setup Blueprint</h2>
        <p className="text-xs text-stc-muted mb-3">Overhead view — looking down at your space</p>

        <div className="bg-stc-dark rounded-lg p-3 mb-3">
          <svg viewBox="0 0 400 360" className="w-full h-auto">
            <rect x="30" y="20" width="340" height="320" rx="4" fill="none" stroke="#444" strokeWidth="1.5" strokeDasharray="6,4" />
            <text x="200" y="14" textAnchor="middle" fill="#666" fontSize="10" fontFamily="Georgia">OVERHEAD VIEW</text>
            <rect x="60" y="40" width="280" height="8" rx="2" fill="#333" />
            <text x="200" y="66" textAnchor="middle" fill="#777" fontSize="10">BACKGROUND (wall)</text>
            <circle cx="200" cy="160" r="22" fill="#555" stroke="#cc9966" strokeWidth="2" />
            <circle cx="200" cy="152" r="7" fill="#888" />
            <text x="200" y="167" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">YOU</text>
            <text x="200" y="197" textAnchor="middle" fill="#cc9966" fontSize="10" fontWeight="bold">PERFORMER</text>
            <line x1="200" y1="48" x2="200" y2="137" stroke="#555" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x="215" y="95" fill="#888" fontSize="9">3–5 ft</text>
            <circle cx="85" cy="110" r="20" fill="#ffe082" opacity="0.9" />
            <circle cx="85" cy="110" r="28" fill="none" stroke="#ffe082" strokeWidth="0.5" opacity="0.4" />
            <text x="85" y="114" textAnchor="middle" fill="#333" fontSize="9" fontWeight="bold">KEY</text>
            <text x="85" y="154" textAnchor="middle" fill="#ffe082" fontSize="10" fontWeight="bold">KEY LIGHT</text>
            <text x="85" y="167" textAnchor="middle" fill="#aaa" fontSize="9">brighter · 45° left</text>
            <line x1="105" y1="120" x2="178" y2="152" stroke="#ffe082" strokeWidth="1.5" opacity="0.6" />
            <circle cx="315" cy="110" r="16" fill="#fff9c4" opacity="0.8" />
            <text x="315" y="114" textAnchor="middle" fill="#333" fontSize="9" fontWeight="bold">FILL</text>
            <text x="315" y="154" textAnchor="middle" fill="#fff9c4" fontSize="10" fontWeight="bold">FILL LIGHT</text>
            <text x="315" y="167" textAnchor="middle" fill="#aaa" fontSize="9">softer · 45° right</text>
            <line x1="299" y1="120" x2="222" y2="152" stroke="#fff9c4" strokeWidth="1" opacity="0.5" />
            <path d="M 140,160 A 60,60 0 0,1 108,120" fill="none" stroke="#ffe082" strokeWidth="0.7" strokeDasharray="2,2" opacity="0.5" />
            <text x="118" y="138" fill="#ffe082" fontSize="9" opacity="0.8">45°</text>
            <path d="M 260,160 A 60,60 0 0,0 292,120" fill="none" stroke="#fff9c4" strokeWidth="0.7" strokeDasharray="2,2" opacity="0.5" />
            <text x="272" y="138" fill="#fff9c4" fontSize="9" opacity="0.8">45°</text>
            <rect x="180" y="268" width="40" height="24" rx="4" fill="#666" stroke="#999" strokeWidth="1" />
            <circle cx="200" cy="280" r="5" fill="#333" stroke="#999" strokeWidth="0.5" />
            <rect x="195" y="292" width="10" height="22" rx="1" fill="#555" />
            <line x1="185" y1="314" x2="215" y2="314" stroke="#555" strokeWidth="2" />
            <text x="200" y="330" textAnchor="middle" fill="#999" fontSize="10" fontWeight="bold">PHONE</text>
            <text x="200" y="342" textAnchor="middle" fill="#777" fontSize="9">tripod · eye level · 4–6 ft</text>
            <line x1="200" y1="183" x2="200" y2="267" stroke="#555" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x="215" y="230" fill="#888" fontSize="9">4–6 ft</text>
            <circle cx="216" cy="152" r="3" fill="#4a90d9" />
            <text x="226" y="148" fill="#4a90d9" fontSize="8">earbud</text>
          </svg>
        </div>

        <div className="space-y-3 mb-4">
          {[
            ['Key light', '45° left, slightly above eye level. Brighter. Creates gentle shadow.'],
            ['Fill light', '45° right, slightly above eye level. Softer. Fills in shadow.'],
            ['Camera', 'Directly in front on tripod. Lens at eye level. 4–6 ft away.'],
            ['Background', 'Solid, plain wall. Stand 3–5 ft from wall.'],
            ['Framing', 'Chest up, centered. Small headroom above hair.'],
            ['Audio', 'One earbud in. Other ear open. Platform mixes automatically.'],
          ].map(([label, desc], i) => (
            <div key={i} className={i > 0 ? 'border-t border-gray-100 pt-2' : ''}>
              <p className="text-xs font-bold">{label}</p>
              <p className="text-xs text-stc-muted">{desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-stc-bg rounded-md p-3 mb-4">
          <p className="text-xs text-stc-muted leading-relaxed">
            <strong>Why this matters:</strong> Same lighting, same framing, same backing tracks.
            Casting compares talent — not production quality.
          </p>
        </div>

        <button onClick={onClose}
          className="w-full py-3 bg-stc-dark text-white font-semibold rounded-md text-sm">
          Close
        </button>
      </div>
    </div>
  );
}
