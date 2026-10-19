import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass, Film } from 'lucide-react';
import ToolPanel from './ToolPanel';
import StudioSettings from '@/components/studio/StudioSettings';
import PerfPanel from '../PerfPanel';
import EditHints from '../EditHints';

const K = ({ children }) => <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">{children}</kbd>;
const NAV = [['/', Home, 'Studio Home'], ['/destinations', Compass, 'All Destinations'], ['/productions', Film, 'Productions']];

export default function SettingsTool({ engine, s, r, onClose }) {
  const [tab, setTab] = useState('general');
  return (
    <ToolPanel title="Settings" tabs={[['general', 'General'], ['quality', 'Quality'], ['perf', 'Performance']]} tab={tab} setTab={setTab} onClose={onClose}>
      {tab === 'general' && (
        <div className="space-y-4">
          <div className="grid gap-1.5">{NAV.map(([to, I, l]) => <Link key={to} to={to} className="rounded-lg bg-white/5 hover:bg-white/10 px-3 py-2 text-sm flex items-center gap-2"><I className="w-4 h-4 text-primary" />{l}</Link>)}</div>
          <div>
            <p className="text-xs font-semibold mb-1.5">Explore controls</p>
            <div className="rounded-xl bg-white/5 px-3 py-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              <span><K>W A S D</K> walk</span><span><K>Shift</K> run</span><span><K>C</K> slow walk</span><span><K>Space</K> jump</span><span><K>E</K> interact</span><span><K>1 2 3</K> pick an action</span><span><K>V</K> switch view</span><span><K>Drag</K> look</span>
            </div>
          </div>
          <div><p className="text-xs font-semibold mb-1.5">Set Edit controls</p><EditHints /></div>
        </div>
      )}
      {tab === 'quality' && (s.studio ? <StudioSettings engine={engine} st={s.studio} diagOn={s.diag} /> : <p className="text-sm text-muted-foreground">Loading studio…</p>)}
      {tab === 'perf' && <PerfPanel r={r} />}
    </ToolPanel>
  );
}