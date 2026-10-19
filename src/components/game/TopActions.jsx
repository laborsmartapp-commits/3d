import React from 'react';
import { Hammer, Camera, Terminal, Eye, Compass, Settings } from 'lucide-react';

export default function TopActions({ engine, s, setPanel }) {
  const build = () => { engine.setMode('build'); setPanel(engine.mode === 'build' ? 'catalog' : null); };
  const btn = 'glass rounded-full h-10 flex items-center gap-2 text-sm font-medium hover:bg-card/80 transition';
  return (
    <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-2 z-20">
      {!s.readOnly && (
        <button onClick={build} className={`h-10 rounded-full px-4 flex items-center gap-2 text-sm font-semibold transition ${s.mode === 'build' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground hover:brightness-110'}`}>
          <Hammer className="w-4 h-4" /><span className="hidden sm:inline">{s.mode === 'build' ? 'Exit Build' : 'Build Mode'}</span>
        </button>
      )}
      <button onClick={() => engine.setMode('photo')} className={`${btn} px-3 sm:px-4`} title="Photo Mode (P)"><Camera className="w-4 h-4" /><span className="hidden lg:inline">Photo Mode</span></button>
      <button onClick={() => engine.setMode(s.mode === 'first' ? 'play' : 'first')} className={`${btn} px-3 hidden sm:flex`} title="Toggle view (V)"><Eye className="w-4 h-4" /><span className="hidden lg:inline">{s.mode === 'first' ? 'Third Person' : 'First Person'}</span></button>
      <button onClick={() => setPanel((p) => (p === 'dev' ? null : 'dev'))} className={`${btn} px-3`} title="Dev Tools (`)"><Terminal className="w-4 h-4" /><span className="hidden lg:inline">Playground</span></button>
      {s.isTouch && (
        <>
          <button onClick={() => setPanel('directory')} className={`${btn} px-3`}><Compass className="w-4 h-4" /></button>
          <button onClick={() => setPanel('settings')} className={`${btn} px-3`}><Settings className="w-4 h-4" /></button>
        </>
      )}
    </div>
  );
}