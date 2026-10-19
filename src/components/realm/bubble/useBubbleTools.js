import { useState } from 'react';
import { STUDIO_TOOLS } from './tools';

// Shared bubble-menu behaviour for every stage: one open tool panel, the timeline as a dock,
// and studio tools keeping the Scene Manager open. `onPick(next, studio)` lets a stage react (e.g. edit mode).
export default function useBubbleTools(engine, st, setStudioOpen, onPick) {
  const [menu, setMenu] = useState(false), [tool, setTool] = useState(null);
  const [dock, setDock] = useState(false), [dockOpen, setDockOpen] = useState(true);
  const pick = (t, dockOn = dock) => {
    if (t === 'timeline') {
      if (!dockOn && !st?.scene) { engine.notify('Open or create a scene to use the timeline'); return pick('scenes', dockOn); }
      setDock(!dockOn); return pick(tool, !dockOn);
    }
    const next = t === tool && dockOn === dock ? null : t, studio = STUDIO_TOOLS.includes(next) || dockOn;
    setTool(next); setStudioOpen(studio); onPick?.(next, studio);
  };
  const toggle = () => { if (menu) pick(null); setMenu(!menu); };
  const showScenes = () => { setMenu(true); setTool('scenes'); };
  return { menu, toggle, tool, pick, dock, dockOpen, setDockOpen, showScenes, showDock: dock && st?.scene && st.director };
}