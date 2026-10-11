import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import StudioPanel from './StudioPanel';
import StudioBar from './StudioBar';
import StudioTopBar from './StudioTopBar';
import DiagOverlay from '@/components/diag/DiagOverlay';

// Drop-in Scene Manager UI for any stage that doesn't have its own HUD integration.
export default function StageStudio({ engine, s, open, setOpen }) {
  const st = s.studio;
  const [panel, setPanel] = useState(true), [timeline, setTimeline] = useState(true);
  const showPanel = open && panel;
  return (
    <>
      <StudioTopBar engine={engine} st={st} open={open} setOpen={setOpen} panel={panel} setPanel={setPanel} timeline={timeline} setTimeline={setTimeline} />
      {st && (st.active || st.status !== 'idle') && <StudioBar engine={engine} st={showPanel ? st : { ...st, active: false }} timeline={timeline} />}
      <AnimatePresence>{showPanel && <StudioPanel key="studio" engine={engine} s={s} onClose={() => setPanel(false)} />}</AnimatePresence>
      {s.diag && <DiagOverlay engine={engine} />}
    </>
  );
}