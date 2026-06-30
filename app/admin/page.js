'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Simple gate — change this to your own admin password.
// This is light protection (the real security is that only you know the URL + password).
const ADMIN_PASSWORD = 'changeme-admin';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [tab, setTab] = useState('signups');

  const [profiles, setProfiles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filterRole, setFilterRole] = useState('all');

  const loadData = async () => {
    setLoading(true);

    const { data: profs } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setProfiles(profs || []);

    const { data: vids } = await supabase
      .from('videos')
      .select('*, profiles(name, email), roles(show_name, role_name)')
      .order('views', { ascending: false });
    setVideos(vids || []);

    setLoading(false);
  };

  useEffect(() => {
    if (authed) loadData();
  }, [authed]);

  // ── Auth gate ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-stc-dark flex items-center justify-center px-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
          <h1 className="text-xl font-bold font-serif mb-1">Admin</h1>
          <p className="text-xs text-stc-muted mb-4">Restricted access.</p>
          <input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && pwInput === ADMIN_PASSWORD) setAuthed(true); }}
            className="w-full px-3 py-2.5 border border-stc-border rounded-md text-base bg-white mb-3"
            placeholder="Admin password" />
          <button
            onClick={() => { if (pwInput === ADMIN_PASSWORD) setAuthed(true); else alert('Wrong password'); }}
            className="w-full py-3 bg-stc-dark text-white font-semibold rounded-md text-sm">
            Enter
          </button>
        </div>
      </div>
    );
  }

  // ── Data prep ──
  const byRole = {
    performer: profiles.filter(p => p.role === 'performer'),
    casting: profiles.filter(p => p.role === 'casting'),
    agent: profiles.filter(p => p.role === 'agent'),
  };

  const filteredProfiles = filterRole === 'all'
    ? profiles
    : profiles.filter(p => p.role === filterRole);

  const allEmails = filteredProfiles.map(p => p.email).filter(Boolean).join(', ');

  const copyEmails = () => {
    navigator.clipboard.writeText(allEmails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Rankings: performers by total views
  const performerStats = byRole.performer.map(p => {
    const pVids = videos.filter(v => v.user_id === p.id);
    const totalViews = pVids.reduce((sum, v) => sum + (v.views || 0), 0);
    return { ...p, videoCount: pVids.length, totalViews };
  }).sort((a, b) => b.totalViews - a.totalViews);

  // Rankings: casting by activity (placeholder — would track breakdowns posted)
  const castingStats = byRole.casting.map(p => ({ ...p }));

  // Rankings: management/agents by client count (placeholder)
  const agentStats = byRole.agent.map(p => ({ ...p }));

  return (
    <div className="min-h-screen bg-stc-bg">
      <header className="bg-stc-dark text-white px-4 py-3 flex items-center justify-between">
        <div className="text-[15px] font-bold tracking-wider font-serif">
          STC <span className="text-stc-gold">ADMIN</span>
        </div>
        <button onClick={loadData} className="text-gray-400 text-xs">Refresh</button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total', num: profiles.length, color: '#1a1a2e' },
            { label: 'Actors', num: byRole.performer.length, color: '#8b0000' },
            { label: 'Casting', num: byRole.casting.length, color: '#c67100' },
            { label: 'Mgmt', num: byRole.agent.length, color: '#2e7d32' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-stc-border rounded-lg p-2 text-center">
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.num}</div>
              <div className="text-[10px] text-stc-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex bg-[#eee5db] rounded-lg p-0.5 mb-4">
          {[
            { id: 'signups', label: 'Signups' },
            { id: 'emails', label: 'Email List' },
            { id: 'rankings', label: 'Rankings' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md
                ${tab === t.id ? 'bg-white text-stc-dark shadow-sm' : 'text-stc-muted'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-stc-muted text-center py-8">Loading...</p>}

        {/* ── SIGNUPS TAB ── */}
        {!loading && tab === 'signups' && (
          <>
            <div className="flex gap-1.5 mb-3 overflow-x-auto">
              {['all', 'performer', 'casting', 'agent'].map(r => (
                <button key={r} onClick={() => setFilterRole(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border
                    ${filterRole === r ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                  {r === 'all' ? 'All' : r === 'performer' ? 'Actors' : r === 'casting' ? 'Casting' : 'Management'}
                </button>
              ))}
            </div>

            {filteredProfiles.length === 0 ? (
              <p className="text-sm text-stc-muted text-center py-8">No signups yet.</p>
            ) : (
              filteredProfiles.map(p => (
                <div key={p.id} className="bg-white border border-stc-border rounded-lg p-3 mb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{p.name || '(no name)'}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{
                            background: p.role === 'performer' ? '#fde8e8' : p.role === 'casting' ? '#fff3e0' : '#e8f5e9',
                            color: p.role === 'performer' ? '#8b0000' : p.role === 'casting' ? '#c67100' : '#2e7d32',
                          }}>
                          {p.role === 'performer' ? 'ACTOR' : p.role === 'casting' ? 'CASTING' : 'MGMT'}
                        </span>
                      </div>
                      <div className="text-xs text-stc-muted truncate">{p.email}</div>
                      <div className="text-[10px] text-stc-muted">
                        {[p.location, p.vocal_range, p.union_status].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="text-[10px] text-stc-muted text-right flex-shrink-0">
                      {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── EMAIL LIST TAB ── */}
        {!loading && tab === 'emails' && (
          <>
            <div className="flex gap-1.5 mb-3 overflow-x-auto">
              {['all', 'performer', 'casting', 'agent'].map(r => (
                <button key={r} onClick={() => setFilterRole(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border
                    ${filterRole === r ? 'bg-stc-dark text-white border-stc-dark' : 'bg-white text-stc-dark border-stc-border'}`}>
                  {r === 'all' ? 'All' : r === 'performer' ? 'Actors' : r === 'casting' ? 'Casting' : 'Management'}
                </button>
              ))}
            </div>

            <div className="bg-white border border-stc-border rounded-lg p-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase text-stc-muted">
                  {filteredProfiles.length} email{filteredProfiles.length !== 1 ? 's' : ''}
                </span>
                <button onClick={copyEmails}
                  className="text-xs font-semibold px-3 py-1.5 bg-stc-dark text-white rounded-md">
                  {copied ? '✓ Copied' : 'Copy All'}
                </button>
              </div>
              <div className="bg-stc-bg rounded-md p-2 max-h-64 overflow-auto">
                <p className="text-[11px] text-stc-dark break-all leading-relaxed">{allEmails || 'No emails'}</p>
              </div>
            </div>

            <p className="text-[10px] text-stc-muted leading-relaxed">
              Tap "Copy All" then paste into the BCC field of your email tool (Gmail, Outlook, etc.)
              to send a blast. When the list gets big, we'll wire up in-app sending.
            </p>
          </>
        )}

        {/* ── RANKINGS TAB ── */}
        {!loading && tab === 'rankings' && (
          <>
            {/* Actors by views */}
            <div className="bg-white border border-stc-border rounded-lg p-3 mb-3">
              <h2 className="text-sm font-bold mb-2" style={{ color: '#8b0000' }}>Top Actors — by views</h2>
              {performerStats.length === 0 ? (
                <p className="text-xs text-stc-muted">No actors yet.</p>
              ) : (
                performerStats.slice(0, 20).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5 border-t border-gray-100">
                    <span className="text-xs font-bold text-stc-muted w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{p.name || '(no name)'}</div>
                      <div className="text-[10px] text-stc-muted">{p.videoCount} video{p.videoCount !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{p.totalViews}</div>
                      <div className="text-[9px] text-stc-muted">views</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Casting */}
            <div className="bg-white border border-stc-border rounded-lg p-3 mb-3">
              <h2 className="text-sm font-bold mb-2" style={{ color: '#c67100' }}>Casting — most active</h2>
              {castingStats.length === 0 ? (
                <p className="text-xs text-stc-muted">No casting accounts yet.</p>
              ) : (
                castingStats.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5 border-t border-gray-100">
                    <span className="text-xs font-bold text-stc-muted w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{p.name || '(no name)'}</div>
                      <div className="text-[10px] text-stc-muted truncate">{p.email}</div>
                    </div>
                    <div className="text-[10px] text-stc-muted">{new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                ))
              )}
            </div>

            {/* Management */}
            <div className="bg-white border border-stc-border rounded-lg p-3">
              <h2 className="text-sm font-bold mb-2" style={{ color: '#2e7d32' }}>Management — most active</h2>
              {agentStats.length === 0 ? (
                <p className="text-xs text-stc-muted">No management accounts yet.</p>
              ) : (
                agentStats.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5 border-t border-gray-100">
                    <span className="text-xs font-bold text-stc-muted w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{p.name || '(no name)'}</div>
                      <div className="text-[10px] text-stc-muted truncate">{p.email}</div>
                    </div>
                    <div className="text-[10px] text-stc-muted">{new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
