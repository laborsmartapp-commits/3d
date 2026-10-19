import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import BubbleMenu from './bubble/BubbleMenu';
import RealmTool from './bubble/RealmTool';
import TakeStatusPill from './bubble/TakeStatusPill';
import TimelineDock from '@/components/studio/director/TimelineDock';
import { TOOLS, STUDIO_TOOLS } from './bubble/tools';
import InteractionPrompt from '@/components/game/InteractionPrompt';
import DiagOverlay from '@/components/diag/DiagOverlay';

// Krush's Living Realm overlay: the world fills the screen; every tool lives behind one floating bubble menu.
export default function RealmHUD({ engine, s, studioOpen, setStudioOpen }) {
  const R = engine.realm, r = s.realm, st = s.studio;
  const [menu, setMenu] = useState(false), [tool, setTool] = useState(null);
  const [dock, setDock] = useState(false), [dockOpen, setDockOpen] = useState(true);

  useEffect(() => { if (R) R.perfOn = tool === 'settings'; }, [tool, R]);
  // Deep links (open a scene/take from a production) open the studio from outside: show the Scenes tool.
  useEffect(() => { if (R && studioOpen && !STUDIO_TOOLS.includes(tool)) { setMenu(true); setTool('scenes'); R.setMode('production'); } }, [studioOpen, R]);
  useEffect(() => {
    const el = engine.container; if (!el || !R) return;
    const over = (ev) => { if (ev.dataTransfer.types.includes('text/realm-item')) ev.preventDefault(); };
    const drop = (ev) => {
      const d = ev.dataTransfer.getData('text/realm-item'); if (!d) return; ev.preventDefault();
      const b = el.getBoundingClientRect();
      R.setMode('edit'); R.R.editor.insert(JSON.parse(d), { x: ((ev.clientX - b.left) / b.width) * 2 - 1, y: -((ev.clientY - b.top) / b.height) * 2 + 1 });
    };
    el.addEventListener('dragover', over); el.addEventListener('drop', drop);
    return () => { el.removeEventListener('dragover', over); el.removeEventListener('drop', drop); };
  }, [engine, R]);

  if (!R || !r) return null;
  // Set Edit = edit mode, studio tools = production mode; other tools keep the current mode; closing returns to explore.
  // The timeline is a dock, not a panel: it stays up (and keeps the studio open) while other tools are used.
  const pick = (t, dockOn = dock) => {
    if (t === 'timeline') {
      if (!dockOn && !st?.scene) { engine.notify('Open or create a scene to use the timeline'); return pick('scenes', dockOn); }
      setDock(!dockOn); return pick(tool, !dockOn);
    }
    const next = t === tool && dockOn === dock ? null : t, studio = STUDIO_TOOLS.includes(next) || dockOn;
    setTool(next); setStudioOpen(studio);
    if (next === 'setedit') R.setMode('edit'); else if (studio) R.setMode('production'); else if (!next || r.mode === 'production') R.setMode('explore');
  };
  const toggle = () => { if (menu) pick(null); setMenu(!menu); };
  const showDock = dock && st?.scene && st.director;
  return (
    <>
      {s.zone && <div className="absolute top-4 left-4 z-20 glass rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{s.zone}</div>}
      <TakeStatusPill engine={engine} st={st} />
      <AnimatePresence>{tool && <RealmTool key={tool} tool={tool} engine={engine} s={s} R={R} r={r} onClose={() => pick(tool)} />}</AnimatePresence>
      {showDock && <TimelineDock engine={engine} st={st} open={dockOpen} setOpen={setDockOpen} inset={tool ? 'mr-[84px] md:mr-[452px]' : 'mr-[84px]'} />}
      <BubbleMenu tools={TOOLS} open={menu} toggle={toggle} tool={tool} pick={(t) => pick(t)} dirty={r.dirty} rec={st?.status === 'capturing'} docked={{ timeline: dock }} />
      {r.mode !== 'edit' && <InteractionPrompt prompt={s.prompt} isTouch={s.isTouch} onPick={(i) => R.R.anchors.pick(i)} />}
      {s.diag && <DiagOverlay engine={engine} />}
    </>
  );
}