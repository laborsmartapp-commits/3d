import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import BubbleMenu from '@/components/realm/bubble/BubbleMenu';
import DirectorTool from '@/components/realm/bubble/DirectorTool';
import CamerasTool from '@/components/realm/bubble/CamerasTool';
import TimelineDock from '@/components/studio/director/TimelineDock';
import { TOOLS } from '@/components/realm/bubble/tools';
import LabBar from './LabBar';

const LAB_TOOLS = TOOLS.filter((t) => ['director', 'timeline', 'cameras'].includes(t.id));

// The same bubble menu, Director/Cameras panels and timeline dock as the Living Realm, over a light stage.
export default function LabHUD({ engine, s }) {
  const st = s.studio, [menu, setMenu] = useState(true), [tool, setTool] = useState(null);
  const [dock, setDock] = useState(false), [dockOpen, setDockOpen] = useState(true);
  if (!st) return null;
  const pick = (t) => {
    if (t !== 'timeline') return setTool(t === tool ? null : t);
    if (!dock && !st.scene) return engine.notify('Create a lab scene to use the timeline');
    setDock(!dock);
  };
  const close = () => setTool(null);
  return (
    <>
      <LabBar engine={engine} st={st} />
      <AnimatePresence>
        {tool === 'director' && <DirectorTool key="d" engine={engine} st={st} onClose={close} />}
        {tool === 'cameras' && <CamerasTool key="c" engine={engine} st={st} onClose={close} />}
      </AnimatePresence>
      {dock && st.scene && st.director && <TimelineDock engine={engine} st={st} open={dockOpen} setOpen={setDockOpen} inset={tool ? 'mr-[84px] md:mr-[452px]' : 'mr-[84px]'} />}
      <BubbleMenu tools={LAB_TOOLS} open={menu} toggle={() => { if (menu) setTool(null); setMenu(!menu); }} tool={tool} pick={pick} rec={st.status === 'capturing'} docked={{ timeline: dock }} />
    </>
  );
}