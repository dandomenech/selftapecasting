'use client';

export default function BottomNav({ tabs, active, onSelect }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stc-border flex z-50"
         style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 relative
            ${active === tab.id ? 'text-stc-accent font-bold' : 'text-stc-muted'}`}
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-[10px]">{tab.label}</span>
          {tab.badge > 0 && (
            <span className="absolute top-1 right-[calc(50%-16px)] bg-stc-accent text-white
              rounded-full min-w-[16px] h-4 text-[9px] font-bold flex items-center justify-center px-1">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
