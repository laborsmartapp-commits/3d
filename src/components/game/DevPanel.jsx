import React, { useState } from 'react';
import SidePanel from './SidePanel';
import DevEnvironment from './DevEnvironment';
import DevCamera from './DevCamera';
import DevWorld from './DevWorld';

const TABS = ['Stats', 'Environment', 'Camera', 'World'];

export default function DevPanel({ engine, s, onClose }) {
  const [tab, setTab] = useState('Stats');
  const st = s.stats || {};
  const stats = [['FPS', st.fps], ['Triangles', st.tris?.toLocaleString()], ['Draw calls', st.calls], ['Active NPCs', st.npcs], ['Active fauna', st.fauna], ['Position', `${st.x}, ${st.y}, ${st.z}`], ['Mode', s.mode], ['Quality', s.quality]];
  return (
    <SidePanel title="World Playground" subtitle="Developer tools for experimenting with the island" onClose={onClose}>
      <div className="grid grid-cols-4 gap-1 mb-4 rounded-full bg-white/5 p-1">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full py-1.5 text-[11px] font-medium ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10'}`}>{t}</button>)}
      </div>
      {tab === 'Stats' && (
        <div className="space-y-1.5">
          {stats.map(([k, v]) => <div key={k} className="flex justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"><span className="text-muted-foreground">{k}</span><span className="tabular-nums font-medium">{v ?? '—'}</span></div>)}
          <p className="text-[11px] text-quiet pt-2">Press ` to toggle this panel. With it open, press F for the free-flying camera.</p>
        </div>
      )}
      {tab === 'Environment' && <DevEnvironment engine={engine} s={s} />}
      {tab === 'Camera' && <DevCamera engine={engine} />}
      {tab === 'World' && <DevWorld engine={engine} s={s} />}
    </SidePanel>
  );
}