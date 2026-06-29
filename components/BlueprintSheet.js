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
          <svg viewBox="0 0 400 380" className="w-full h-auto">
            {/* Room outline */}
            <rect x="30" y="20" width="340" height="340" rx="4" fill="none" stroke="#444" strokeWidth="1.5" strokeDasharray="6,4" />
            <text x="200" y="14" textAnchor="middle" fill="#666" fontSize="10" fontFamily="Georgia">OVERHEAD VIEW — looking down</text>

            {/* Background wall — behind performer (top) */}
            <rect x="60" y="40" width="280" height="8" rx="2" fill="#333" />
            <text x="200" y="66" textAnchor="middle" fill="#777" fontSize="10">BACKGROUND (wall behind you)</text>

            {/* Performer — facing DOWN toward camera */}
            <circle cx="200" cy="150" r="22" fill="#555" stroke="#cc9966" strokeWidth="2" />
            {/* Face direction indicator — facing down toward camera */}
            <circle cx="200" cy="166" r="7" fill="#888" />
            <text x="200" y="155" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">YOU</text>
            <text x="200" y="120" textAnchor="middle" fill="#cc9966" fontSize="10" fontWeight="bold">PERFORMER</text>
            <text x="200" y="107" textAnchor="middle" fill="#888" fontSize="8">facing camera ↓</text>
            <line x1="200" y1="48" x2="200" y2="127" stroke="#555" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x="210" y="90" fill="#888" fontSize="9">3–5 ft</text>

            {/* KEY LIGHT — camera side, left, angled up at face */}
            <circle cx="95" cy="255" r="20" fill="#ffe082" opacity="0.9" />
            <circle cx="95" cy="255" r="28" fill="none" stroke="#ffe082" strokeWidth="0.5" opacity="0.4" />
            <circle cx="95" cy="255" r="36" fill="none" stroke="#ffe082" strokeWidth="0.5" opacity="0.2" />
            <text x="95" y="259" textAnchor="middle" fill="#333" fontSize="9" fontWeight="bold">KEY</text>
            <text x="95" y="297" textAnchor="middle" fill="#ffe082" fontSize="10" fontWeight="bold">KEY LIGHT</text>
            <text x="95" y="310" textAnchor="middle" fill="#aaa" fontSize="9">brighter · 45° left</text>
            <text x="95" y="322" textAnchor="middle" fill="#aaa" fontSize="8">aimed up at your face</text>
            {/* Light rays from key UP to face */}
            <line x1="108" y1="240" x2="185" y2="165" stroke="#ffe082" strokeWidth="1.5" opacity="0.6" />
            <line x1="100" y1="236" x2="188" y2="160" stroke="#ffe082" strokeWidth="0.8" opacity="0.35" />

            {/* FILL LIGHT — camera side, right, angled up at face */}
            <circle cx="305" cy="255" r="16" fill="#fff9c4" opacity="0.8" />
            <circle cx="305" cy="255" r="23" fill="none" stroke="#fff9c4" strokeWidth="0.5" opacity="0.3" />
            <text x="305" y="259" textAnchor="middle" fill="#333" fontSize="9" fontWeight="bold">FILL</text>
            <text x="305" y="297" textAnchor="middle" fill="#fff9c4" fontSize="10" fontWeight="bold">FILL LIGHT</text>
            <text x="305" y="310" textAnchor="middle" fill="#aaa" fontSize="9">softer · 45° right</text>
            <text x="305" y="322" textAnchor="middle" fill="#aaa" fontSize="8">aimed up at your face</text>
            {/* Light rays from fill UP to face */}
            <line x1="292" y1="240" x2="215" y2="165" stroke="#fff9c4" strokeWidth="1.2" opacity="0.5" />
            <line x1="300" y1="236" x2="212" y2="160" stroke="#fff9c4" strokeWidth="0.7" opacity="0.3" />

            {/* PHONE — center bottom, between the lights */}
            <rect x="182" y="250" width="36" height="22" rx="4" fill="#666" stroke="#999" strokeWidth="1" />
            <circle cx="200" cy="261" r="5" fill="#333" stroke="#999" strokeWidth="0.5" />
            <rect x="196" y="272" width="8" height="18" rx="1" fill="#555" />
            <line x1="188" y1="290" x2="212" y2="290" stroke="#555" strokeWidth="2" />
            <text x="200" y="305" textAnchor="middle" fill="#999" fontSize="10" fontWeight="bold">PHONE</text>
            <text x="200" y="317" textAnchor="middle" fill="#777" fontSize="8">eye level · 4–6 ft back</text>

            {/* Distance performer to phone */}
            <line x1="200" y1="172" x2="200" y2="249" stroke="#555" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x="210" y="215" fill="#888" fontSize="9">4–6 ft</text>

            {/* 45 degree angle arcs at performer */}
            <path d="M 165,165 A 50,50 0 0,1 158,200" fill="none" stroke="#ffe082" strokeWidth="0.7" strokeDasharray="2,2" opacity="0.5" />
            <text x="150" y="185" fill="#ffe082" fontSize="9" opacity="0.8">45°</text>
            <path d="M 235,165 A 50,50 0 0,0 242,200" fill="none" stroke="#fff9c4" strokeWidth="0.7" strokeDasharray="2,2" opacity="0.5" />
            <text x="240" y="185" fill="#fff9c4" fontSize="9" opacity="0.8">45°</text>

            {/* Earbud */}
            <circle cx="216" cy="142" r="3" fill="#4a90d9" />
            <text x="226" y="138" fill="#4a90d9" fontSize="8">earbud</text>
          </svg>
        </div>

        {/* Key insight callout */}
        <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 mb-3">
          <p className="text-xs leading-relaxed">
            <strong>Both lights go on either side of your camera</strong>, aimed back up at your face — never behind you. The wall stays behind you, the lights and phone are in front of you.
          </p>
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
