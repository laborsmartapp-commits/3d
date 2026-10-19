import React, { useEffect, useState } from 'react';
import ModeRail from './ModeRail';
import SaveStatus from './SaveStatus';
import SetLibrary from './SetLibrary';
import ObjectInspector from './ObjectInspector';
import HierarchyPanel from './HierarchyPanel';
import EnvironmentPanel from './EnvironmentPanel';
import SetVersions from './SetVersions';
import PerfPanel from './PerfPanel';
import EditHints from './EditHints';
import InteractionPrompt from '@/components/game/InteractionPrompt';

// Krush's Living Realm overlay: Explore / Set Edit / Production modes and the set-dressing tools.
export default function RealmHUD({ engine, s, studioOpen, setStudioOpen }) {
  const R = engine.realm, r = s.realm;
  const [panel, setPanel] = useState(null);

  useEffect(() => { if (!R) return; if (studioOpen && R.mode !== 'production') R.setMode('production'); if (!studioOpen && R.mode === 'production') R.setMode('explore'); }, [studioOpen, R]);
  useEffect(() => { if (R) R.perfOn = panel === 'perf'; }, [panel, R]);
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
  const setMode = (m) => { R.setMode(m); setStudioOpen(m === 'production'); if (m === 'production') setPanel(null); };
  const close = () => setPanel(null);
  return (
    <>
      <ModeRail mode={r.mode} setMode={setMode} panel={panel} setPanel={setPanel} />
      <SaveStatus R={R.R} r={r} />
      {panel === 'library' && <SetLibrary R={R} onClose={close} />}
      {panel === 'hierarchy' && <HierarchyPanel R={R} r={r} onClose={close} />}
      {panel === 'environment' && <EnvironmentPanel R={R.R} r={r} onClose={close} />}
      {panel === 'versions' && <SetVersions R={R.R} r={r} onClose={close} />}
      {panel === 'perf' && <PerfPanel r={r} onClose={close} />}
      {r.mode === 'edit' && <ObjectInspector R={R.R} r={r} />}
      {r.mode === 'edit' && <EditHints />}
      {r.mode !== 'edit' && <InteractionPrompt prompt={s.prompt} isTouch={s.isTouch} onPick={(i) => R.R.anchors.pick(i)} />}
    </>
  );
}